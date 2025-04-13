"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Product Type Definition
export interface Product {
  id: string
  name: string
  description?: string | null
  sku: string
  type: "product" | "service"
  unit_price: number
  tax_percent: number
  discount?: number | null
  unit: string
  stock_quantity?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
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
const getProducts = async (tenantId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching products:", error)
    throw new Error(error.message)
  }

  return data || []
}

const getProductById = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching product with ID ${id}:`, error)
    throw new Error(error.message)
  }

  return data
}

const createProduct = async (product: any, tenantId: string) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.id) {
    throw new Error("User not authenticated")
  }

  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        ...product,
        tenant_id: tenantId,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select("*")

  if (error) {
    console.error("Error creating product:", error)
    throw new Error(error.message)
  }

  return data?.[0]
}

const updateProduct = async (id: string, product: Partial<Omit<Product, "id" | "created_at" | "updated_at">>) => {
  const { data, error } = await supabase
    .from("products")
    .update({
      ...product,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()

  if (error) {
    console.error(`Error updating product with ID ${id}:`, error)
    throw new Error(error.message)
  }

  return data?.[0]
}

const deleteProduct = async (id: string, tenantId: string) => {
  const { error } = await supabase.from("products").delete().eq("id", id).eq("tenant_id", tenantId)

  if (error) {
    console.error(`Error deleting product with ID ${id}:`, error)
    throw new Error(error.message)
  }

  return true
}

const generateSKU = async (name: string, type: string): Promise<string> => {
  // Create base SKU from name and type
  const namePrefix = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .substring(0, 3)

  const typePrefix = type === "product" ? "PRD" : "SRV"

  // Add random numbers to ensure uniqueness
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")

  const baseSKU = `${namePrefix}-${typePrefix}-${randomPart}`

  // Check if SKU already exists
  const { data } = await supabase.from("products").select("sku").eq("sku", baseSKU)

  if (data && data.length > 0) {
    // If SKU exists, recursively try again with a different random part
    return generateSKU(name, type)
  }

  return baseSKU
}

// Product Form Schema
const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  type: z.enum(["product", "service"]),
  unit_price: z.coerce.number().min(0, "Price must be a positive number"),
  tax_percent: z.coerce.number().min(0, "Tax must be a positive number"),
  discount: z.coerce.number().min(0, "Discount must be a positive number").optional(),
  unit: z.string().min(1, "Unit is required"),
  stock_quantity: z.coerce.number().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
})

type ProductFormValues = z.infer<typeof productSchema>

// Product Form Component
function ProductForm({
  product,
  onCancel,
  onSuccess,
  tenantId,
}: {
  product: Product | null
  onCancel: () => void
  onSuccess: () => void
  tenantId: string | null
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          ...product,
          description: product.description || "",
          discount: product.discount || 0,
          stock_quantity: product.stock_quantity || null,
        }
      : {
          name: "",
          description: "",
          sku: "",
          type: "product",
          unit_price: 0,
          tax_percent: 0,
          discount: 0,
          unit: "pcs",
          stock_quantity: 0,
          is_active: true,
        },
  })

  useEffect(() => {
    const name = form.watch("name")
    const type = form.watch("type")

    if (name && type && !product) {
      const generateAndSetSKU = async () => {
        try {
          const sku = await generateSKU(name, type)
          form.setValue("sku", sku)
        } catch (error) {
          console.error("Error generating SKU:", error)
        }
      }

      generateAndSetSKU()
    }
  }, [form.watch("name"), form.watch("type"), product, form])

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setIsSubmitting(true)
      setStatusMessage(null)

      if (product) {
        await updateProduct(product.id, data)
        setStatusMessage({ type: "success", message: "Product updated successfully" })
      } else {
        if (!tenantId) {
          setStatusMessage({ type: "error", message: "Tenant ID is required to create a product." })
          return
        }
        await createProduct(data, tenantId)
        setStatusMessage({ type: "success", message: "Product created successfully" })
      }

      // Wait a moment to show the success message before closing the form
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (error) {
      console.error("Error saving product:", error)
      setStatusMessage({
        type: "error",
        message: product ? "Failed to update product" : "Failed to create product",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onCancel} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
            <CardDescription>{product ? "Update product information" : "Enter product details"}</CardDescription>
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Stock Keeping Unit"
                        {...field}
                        readOnly={!product}
                        className={!product ? "bg-gray-100" : ""}
                      />
                    </FormControl>
                    <FormDescription>{!product ? "Auto-generated based on name and type" : ""}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., pcs, kg, hours" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value === null ? "" : field.value}
                        onChange={(e) => {
                          const value = e.target.value === "" ? null : Number.parseInt(e.target.value)
                          field.onChange(value)
                        }}
                        disabled={form.watch("type") === "service"}
                      />
                    </FormControl>
                    <FormDescription>
                      {form.watch("type") === "service" ? "Not applicable for services" : ""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>Product will be visible in listings when active</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Product description" className="min-h-[120px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                    {product ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>{product ? "Update Product" : "Create Product"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// Main Products Page Component
export function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Get the tenant ID from local storage instead of session
  useEffect(() => {
    const getTenantId = async () => {
      try {
        console.log("Getting tenant ID from local storage...")

        // Get tenant ID from local storage
        const localStorageTenantId = getTenantIdFromLocalStorage()

        if (localStorageTenantId) {
          console.log("Using tenant ID from local storage:", localStorageTenantId)
          setTenantId(localStorageTenantId)
        } else {
          console.error("No tenant ID found in local storage")
          setStatusMessage({
            type: "error",
            message: "Tenant ID not found in local storage. Please log in again.",
          })
        }
      } catch (error) {
        console.error("Error getting tenant ID:", error)
        setStatusMessage({
          type: "error",
          message: "Failed to authenticate tenant. Please log in again.",
        })
      }
    }

    getTenantId()
  }, [])

  const fetchProducts = async () => {
    if (!tenantId) return

    try {
      setIsLoading(true)
      const data = await getProducts(tenantId)
      setProducts(data)
      setFilteredProducts(data)
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to fetch products",
      })
      console.error("Error fetching products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (tenantId) {
      fetchProducts()
    }
  }, [tenantId])

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts(products)
    }
  }, [searchTerm, products])

  const handleDeleteProduct = async (id: string) => {
    if (!tenantId) return

    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id, tenantId)
        setStatusMessage({
          type: "success",
          message: "Product deleted successfully",
        })
        fetchProducts()
      } catch (error) {
        setStatusMessage({
          type: "error",
          message: "Failed to delete product",
        })
        console.error("Error deleting product:", error)
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Product Management</h1>

      {!tenantId ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <div className="mb-4 text-red-500">Tenant authentication required</div>
              <p>Please log in to access your products.</p>
            </div>
          </CardContent>
        </Card>
      ) : isAddingProduct || editingProduct ? (
        <ProductForm
          product={editingProduct}
          tenantId={tenantId}
          onCancel={() => {
            setIsAddingProduct(false)
            setEditingProduct(null)
          }}
          onSuccess={() => {
            setIsAddingProduct(false)
            setEditingProduct(null)
            fetchProducts()
          }}
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>Manage your product inventory</CardDescription>
            </div>
            <Button onClick={() => setIsAddingProduct(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
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

            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell>{product.type}</TableCell>
                          <TableCell>{formatCurrency(product.unit_price)}</TableCell>
                          <TableCell>{product.tax_percent}%</TableCell>
                          <TableCell>{product.stock_quantity ?? "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? "default" : "secondary"}>
                              {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProduct(product)}
                              className="mr-2"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-destructive hover:text-destructive/90"
                            >
                              Delete
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
