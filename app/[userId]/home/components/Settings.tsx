"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js" 
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { User, Building, FileText, Settings, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Settings Type Definition
export interface UserSettings {
  id?: string
  profile: {
    name: string
    email: string
  }
  business: {
    businessName: string
    email: string
    phone: string
    gst?: string
    address: string
  }
  invoiceSettings: {
    prefix?: string
    nextNumber: number
  }
  tenant_id: string
  user_id: string
  created_at?: string
  updated_at?: string
}

// Function to get tenant ID from local storage
const getTenantIdFromLocalStorage = (): string | null => {
  try {
    // Get the auth token from local storage
    const authKey = Object.keys(localStorage).find((key) => key.endsWith("-auth-token"))
    if (!authKey) return null

    const authData = JSON.parse(localStorage.getItem(authKey) || "{}")

    // Extract user ID from the auth data
    if (authData && authData.user && authData.user.id) {
      console.log("Found tenant ID in local storage:", authData.user.id)
      return authData.user.id
    }

    return null
  } catch (error) {
    console.error("Error getting tenant ID from local storage:", error)
    return null
  }
}

// Supabase Client Functions
const getUserSettings = async (tenantId: string): Promise<UserSettings | null> => {
  console.log("Getting settings for tenant ID:", tenantId)

  // Remove any "eq." prefix if it exists
  const cleanTenantId = tenantId.startsWith("eq.") ? tenantId.substring(3) : tenantId
  console.log("Using cleaned tenant ID for query:", cleanTenantId)

  const { data, error } = await supabase.from("user_settings").select("*").eq("tenant_id", cleanTenantId).single()

  if (error) {
    if (error.code === "PGRST116") {
      console.log("No settings found for this tenant, will create new settings")
      return null
    }
    console.error("Error fetching user settings:", error)
    throw new Error(error.message)
  }

  console.log("Settings data from Supabase:", data)
  return data
}

const createUserSettings = async (settings: Omit<UserSettings, "id" | "created_at" | "updated_at">) => {
  const { data, error } = await supabase
    .from("user_settings")
    .insert([
      {
        ...settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select("*")

  if (error) {
    console.error("Error creating user settings:", error)
    throw new Error(error.message)
  }

  console.log("Settings created successfully:", data?.[0])
  return data?.[0]
}

const updateUserSettings = async (id: string, settings: Partial<Omit<UserSettings, "id" | "created_at">>) => {
  const { data, error } = await supabase
    .from("user_settings")
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()

  if (error) {
    console.error(`Error updating user settings with ID ${id}:`, error)
    throw new Error(error.message)
  }

  return data?.[0]
}

// Form Schema
const userSettingsSchema = z.object({
  profile: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
  }),
  business: z.object({
    businessName: z.string().min(1, "Business name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().min(1, "Phone number is required"),
    gst: z.string().optional(),
    address: z.string().min(1, "Address is required"),
  }),
  invoiceSettings: z.object({
    prefix: z.string().optional(),
    nextNumber: z.coerce.number().int().positive("Must be a positive number"),
  }),
})

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>

// Export the component as UserSettings to match the import in your page
export default function UserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)

  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      profile: {
        name: "",
        email: "",
      },
      business: {
        businessName: "",
        email: "",
        phone: "",
        gst: "",
        address: "",
      },
      invoiceSettings: {
        prefix: "",
        nextNumber: 1,
      },
    },
  })

  // Get the tenant ID from local storage
  useEffect(() => {
    const getTenantId = async () => {
      try {
        console.log("Getting tenant ID from local storage...")

        // First try to get tenant ID from local storage
        const localStorageTenantId = getTenantIdFromLocalStorage()

        if (localStorageTenantId) {
          console.log("Using tenant ID from local storage:", localStorageTenantId)
          setTenantId(localStorageTenantId)
          return
        }

        // Fallback to session if local storage doesn't have it
        console.log("No tenant ID in local storage, trying session...")
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Error getting session:", sessionError)
          setError("Failed to get session. Please log in again.")
          return
        }

        console.log("Session data:", session)

        if (session?.user?.user_metadata?.tenant_id) {
          const tid = session.user.user_metadata.tenant_id
          console.log("Found tenant_id in user_metadata:", tid)
          setTenantId(tid)
        } else if (session?.user?.id) {
          console.log("Using user ID as tenant_id:", session.user.id)
          setTenantId(session.user.id)
        } else {
          console.error("No user ID found in session")
          setError("User ID not found. Please log in again.")
        }
      } catch (error) {
        console.error("Error in getTenantId:", error)
        setError("Failed to authenticate tenant. Please log in again.")
      }
    }

    getTenantId()
  }, [])

  const fetchSettings = useCallback(async () => {
    if (!tenantId) {
      console.log("No tenant ID available, skipping fetch")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      console.log("Fetching settings for tenant ID:", tenantId)

      const data = await getUserSettings(tenantId)

      if (data) {
        setSettings(data)
        form.reset({
          profile: data.profile,
          business: data.business,
          invoiceSettings: data.invoiceSettings,
        })
      } else {
        console.log("No settings found, using default values")
        setSettings(null)
      }
    } catch (error) {
      console.error("Error in fetchSettings:", error)
      setError("Failed to fetch settings. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, form])

  // Fetch settings when tenant ID is available
  useEffect(() => {
    if (tenantId) {
      fetchSettings()
    }
  }, [tenantId, fetchSettings])

  const onSubmit = async (data: UserSettingsFormValues) => {
    if (!tenantId) {
      setError("Tenant ID is required to save settings.")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user?.id) {
        throw new Error("User not authenticated")
      }

      if (settings?.id) {
        // Update existing settings
        await updateUserSettings(settings.id, {
          ...data,
          tenant_id: tenantId,
          user_id: user.id,
        })
        
      } else {
        // Create new settings
        await createUserSettings({
          ...data,
          tenant_id: tenantId,
          user_id: user.id,
        })
      }

      setSuccessMessage("Settings saved successfully!")
      fetchSettings() // Refresh settings
    } catch (error) {
      console.error("Error saving settings:", error)
      setError("Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">User Settings</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {!tenantId ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <div className="mb-4 text-red-500">Tenant authentication required</div>
              <p>Please log in to access your settings.</p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="business" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Business
                </TabsTrigger>
                <TabsTrigger value="invoice" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoice
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Settings
                    </CardTitle>
                    <CardDescription>Manage your personal information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="profile.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="profile.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="business">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Business Settings
                    </CardTitle>
                    <CardDescription>Manage your business information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="business.businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your business name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="business.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Business email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="business.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Business phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="business.gst"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GST Number</FormLabel>
                          <FormControl>
                            <Input placeholder="GST number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="business.address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Business address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoice">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Invoice Settings
                    </CardTitle>
                    <CardDescription>Customize your invoice details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="invoiceSettings.prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Prefix</FormLabel>
                          <FormControl>
                            <Input placeholder="INV-" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoiceSettings.nextNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Invoice Number</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>
                <strong>Tenant ID:</strong> {tenantId || "Not found"}
              </p>
              <p>
                <strong>Settings ID:</strong> {settings?.id || "Not found"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log("Current tenant ID:", tenantId)
                  console.log("Current settings:", settings)
                  // Try to get the current session again
                  supabase.auth.getSession().then(({ data, error }) => {
                    console.log("Current session:", data.session)
                    console.log("Session error:", error)
                  })
                }}
              >
                Log Debug Info
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
