"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, ArrowLeft, Edit, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Customer Type Definition - Removed customer_code from the interface
export interface Customer {
  id: string
  customer_name: string
  company_name?: string | null
  customer_email?: string | null
  work_phone: string
  mobile?: string | null
  website?: string | null
  billing_address: {
    attention?: string | null
    street1?: string | null
    street2?: string | null
    city?: string | null
    state?: string | null
    pin_code?: string | null
    country: string
    phone?: string | null
    fax?: string | null
  }
  customer_type: "Business" | "Individual"
  gst_treatment: string
  place_of_supply?: string | null
  tax_preference: string
  currency: string
  payment_terms?: string | null
  enable_portal: boolean
  portal_language: string
  gst_in?: string | null
  pan_number?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  tenant_id: string
  user_id: string
}

// Supabase Client Functions
const getCustomers = async (tenantId: string): Promise<Customer[]> => {
  console.log("Getting customers for tenant ID:", tenantId)

  // Remove any "eq." prefix if it exists
  const cleanTenantId = tenantId.startsWith("eq.") ? tenantId.substring(3) : tenantId
  console.log("Using cleaned tenant ID for query:", cleanTenantId)

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", cleanTenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching customers:", error)
    throw new Error(error.message)
  }

  console.log("Customers data from Supabase:", data)
  return data || []
}

const getCustomerById = async (id: string): Promise<Customer | null> => {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching customer with ID ${id}:`, error)
    throw new Error(error.message)
  }

  return data
}

const createCustomer = async (customer: any, tenantId: string) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.id) {
    throw new Error("User not authenticated")
  }

  console.log("Creating customer with tenant ID:", tenantId)
  console.log("Current user ID:", user.id)

  // Removed customer_code from the insert operation
  const { data, error } = await supabase
    .from("customers")
    .insert([
      {
        ...customer,
        tenant_id: tenantId, // Using the tenant_id passed to the function
        user_id: user.id,
        is_active: true, // Ensure this is set
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select("*")

  if (error) {
    console.error("Error creating customer:", error)
    throw new Error(error.message)
  }

  console.log("Customer created successfully:", data?.[0])
  return data?.[0]
}

const updateCustomer = async (id: string, customer: Partial<Omit<Customer, "id" | "created_at">>) => {
  const { data, error } = await supabase
    .from("customers")
    .update({
      ...customer,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()

  if (error) {
    console.error(`Error updating customer with ID ${id}:`, error)
    throw new Error(error.message)
  }

  return data?.[0]
}

const deleteCustomer = async (id: string, tenantId: string) => {
  const { error } = await supabase.from("customers").delete().eq("id", id).eq("tenant_id", tenantId)

  if (error) {
    console.error(`Error deleting customer with ID ${id}:`, error)
    throw new Error(error.message)
  }

  return true
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

// Customer Form Schema - No customer_code field
const customerSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  company_name: z.string().optional().nullable(),
  customer_email: z.string().email("Invalid email format").optional().nullable(),
  work_phone: z.string().min(1, "Work phone is required"),
  mobile: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  billing_address: z.object({
    attention: z.string().optional().nullable(),
    street1: z.string().optional().nullable(),
    street2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    pin_code: z.string().optional().nullable(),
    country: z.string().default("India"),
    phone: z.string().optional().nullable(),
    fax: z.string().optional().nullable(),
  }),
  customer_type: z.enum(["Business", "Individual"]),
  gst_treatment: z.string(),
  place_of_supply: z.string().optional().nullable(),
  tax_preference: z.string(),
  currency: z.string(),
  payment_terms: z.string().optional().nullable(),
  enable_portal: z.boolean().default(false),
  portal_language: z.string(),
  gst_in: z.string().optional().nullable(),
  pan_number: z.string().optional().nullable(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

// Customer Form Component
function CustomerForm({
  customer,
  onCancel,
  onSuccess,
  tenantId,
}: {
  customer: Customer | null
  onCancel: () => void
  onSuccess: () => void
  tenantId: string | null
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          ...customer,
          customer_email: customer.customer_email || null,
          company_name: customer.company_name || null,
          mobile: customer.mobile || null,
          website: customer.website || null,
          billing_address: {
            ...customer.billing_address,
            attention: customer.billing_address.attention || null,
            street1: customer.billing_address.street1 || null,
            street2: customer.billing_address.street2 || null,
            city: customer.billing_address.city || null,
            state: customer.billing_address.state || null,
            pin_code: customer.billing_address.pin_code || null,
            phone: customer.billing_address.phone || null,
            fax: customer.billing_address.fax || null,
          },
          place_of_supply: customer.place_of_supply || null,
          payment_terms: customer.payment_terms || null,
          gst_in: customer.gst_in || null,
          pan_number: customer.pan_number || null,
        }
      : {
          customer_name: "",
          company_name: null,
          customer_email: null,
          work_phone: "",
          mobile: null,
          website: null,
          billing_address: {
            attention: null,
            street1: null,
            street2: null,
            city: null,
            state: null,
            pin_code: null,
            country: "India",
            phone: null,
            fax: null,
          },
          customer_type: "Business",
          gst_treatment: "Registered Business - Regular",
          place_of_supply: null,
          tax_preference: "Taxable",
          currency: "INR",
          payment_terms: null,
          enable_portal: false,
          portal_language: "English",
          gst_in: null,
          pan_number: null,
        },
  })

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      setIsSubmitting(true)
      setStatusMessage(null)

      if (customer) {
        await updateCustomer(customer.id, data)
        setStatusMessage({ type: "success", message: "Customer updated successfully" })
      } else {
        if (!tenantId) {
          setStatusMessage({ type: "error", message: "Tenant ID is required to create a customer." })
          return
        }

        // No customer code generation - removed completely

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        // Create customer with tenant_id from the user
        await createCustomer(
          {
            ...data,
            // customer_code removed from here
          },
          tenantId,
        )

        setStatusMessage({ type: "success", message: "Customer created successfully" })
      }

      // Wait a moment to show the success message before closing the form
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (error) {
      console.error("Error saving customer:", error)
      setStatusMessage({
        type: "error",
        message: customer ? "Failed to update customer" : "Failed to create customer",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mb-6 border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onCancel} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="text-gray-900 dark:text-white">
              {customer ? "Edit Customer" : "Add New Customer"}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {customer ? "Update customer information" : "Enter customer details"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-md ${
              statusMessage.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {statusMessage.message}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Company name"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Email address"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="work_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Phone*</FormLabel>
                    <FormControl>
                      <Input placeholder="Work phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mobile number"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Website URL"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gst_treatment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Treatment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select GST treatment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Registered Business - Regular">Registered Business - Regular</SelectItem>
                        <SelectItem value="Registered Business - Composition">
                          Registered Business - Composition
                        </SelectItem>
                        <SelectItem value="Unregistered Business">Unregistered Business</SelectItem>
                        <SelectItem value="Consumer">Consumer</SelectItem>
                        <SelectItem value="Overseas">Overseas</SelectItem>
                        <SelectItem value="Special Economic Zone">Special Economic Zone</SelectItem>
                        <SelectItem value="Deemed Export">Deemed Export</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="place_of_supply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place of Supply</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Place of supply"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gst_in"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="GST Identification Number"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pan_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="PAN Number"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["attention", "street1", "street2", "city", "state", "pin_code", "country", "phone", "fax"].map(
                  (field) => (
                    <FormField
                      key={field}
                      control={form.control}
                      name={`billing_address.${field}` as any}
                      render={({ field: addressField }) => (
                        <FormItem>
                          <FormLabel>{field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ")}</FormLabel>
                          <FormControl>
                            {field === "country" ? (
                              <Select onValueChange={addressField.onChange} defaultValue={addressField.value as string}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="India">India</SelectItem>
                                  <SelectItem value="United States">United States</SelectItem>
                                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                  <SelectItem value="Canada">Canada</SelectItem>
                                  <SelectItem value="Australia">Australia</SelectItem>
                                  <SelectItem value="Singapore">Singapore</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                placeholder={`${field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ")}`}
                                {...addressField}
                                value={addressField.value || ""}
                                onChange={(e) => addressField.onChange(e.target.value || null)}
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ),
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {customer ? "Updating..." : "Saving..."}
                  </>
                ) : customer ? (
                  "Update Customer"
                ) : (
                  "Add Customer"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// Main Customers Page Component
export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)

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

  const fetchCustomers = useCallback(async () => {
    if (!tenantId) {
      console.log("No tenant ID available, skipping fetch")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      console.log("Fetching customers for tenant ID:", tenantId)

      // Use the getCustomers function directly with the tenant ID
      const data = await getCustomers(tenantId)

      if (data && data.length > 0) {
        setCustomers(data)
        setFilteredCustomers(data)
      } else {
        console.log("No customers found with tenant ID:", tenantId)
        setCustomers([])
        setFilteredCustomers([])
      }
    } catch (error) {
      console.error("Error in fetchCustomers:", error)
      setError("Failed to fetch customers. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  // Force a refresh when the component mounts
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (tenantId) {
      timer = setTimeout(() => {
        console.log("Initial fetch triggered")
        fetchCustomers()
      }, 1000) // Delay by 1 second to ensure auth is complete
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [tenantId, fetchCustomers])

  useEffect(() => {
    if (tenantId) {
      fetchCustomers()
    }
  }, [tenantId, fetchCustomers])

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(
        (customer) =>
          customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.company_name && customer.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (customer.customer_email && customer.customer_email.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers(customers)
    }
  }, [searchTerm, customers])

  const handleDeleteCustomer = async (id: string) => {
    if (!tenantId) return

    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteCustomer(id, tenantId)
        setError(null)
        fetchCustomers()
      } catch (error) {
        console.error("Error deleting customer:", error)
        setError("Failed to delete customer. Please try again.")
      }
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Management</h1>
        {!isAddingCustomer && !editingCustomer && (
          <Button
            onClick={() => setIsAddingCustomer(true)}
            className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!tenantId ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <div className="mb-4 text-red-500">Tenant authentication required</div>
              <p>Please log in to access your customers.</p>
            </div>
          </CardContent>
        </Card>
      ) : isAddingCustomer || editingCustomer ? (
        <CustomerForm
          customer={editingCustomer}
          tenantId={tenantId}
          onCancel={() => {
            setIsAddingCustomer(false)
            setEditingCustomer(null)
          }}
          onSuccess={() => {
            setIsAddingCustomer(false)
            setEditingCustomer(null)
            fetchCustomers()
          }}
        />
      ) : (
        <Card className="mb-6 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white">Customer List</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage and view your customer database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  className="pl-10 pr-4 py-2 w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={fetchCustomers} variant="outline" className="ml-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
              <Button
                onClick={() => {
                  console.log("Current tenant ID:", tenantId)
                  console.log("Current customers state:", customers)
                  // Try to get the current session again
                  supabase.auth.getSession().then(({ data, error }) => {
                    console.log("Current session:", data.session)
                    console.log("Session error:", error)
                  })
                }}
                variant="outline"
                className="ml-2"
              >
                Debug
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableHead className="text-gray-900 dark:text-white">Name</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Company Name</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Email</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Work Phone</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">GSTIN</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Place of Supply</TableHead>
                      <TableHead className="text-right text-gray-900 dark:text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No customers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            {customer.customer_name}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {customer.company_name || "N/A"}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {customer.customer_email || "N/A"}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">{customer.work_phone}</TableCell>
                          <TableCell className="text-gray-900 dark:text-white">{customer.gst_in || "N/A"}</TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {customer.place_of_supply || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCustomer(customer)
                              }}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-2"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Customers
