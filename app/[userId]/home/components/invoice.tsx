"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2, Loader2, Download, Plus, ChevronLeft, Save, Printer, Edit, Eye } from "lucide-react"
import jsPDF from "jspdf"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Customer {
  id: string
  customerName: string
  companyName: string
  customerEmail: string
  gstin: string
  address: string
  phoneNumber: string
}

interface Product {
  id: string
  name: string
  description: string
  rate: number
  tax: number
  hsnCode?: string
}

interface InvoiceItem {
  id: string
  productId: string
  name: string
  quantity: number
  rate: number
  discount: number
  cgst: number
  sgst: number
  amount: number
  hsnCode: string
}

interface Invoice {
  id: string
  customer: Customer
  invoiceNumber: string
  orderNumber: string
  invoiceDate: string
  dueDate: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  cgst: number
  sgst: number
  adjustment: number
  total: number
  paidAmount: number
  balanceAmount: number
  termsAndConditions: string
  remarks: string
  tenant_id?: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

interface CompanyDetails {
  companyName: string
  address: string
  phoneNumber: string
  email: string
  website: string
  taxId: string
}

interface InvoiceListItem {
  id: string
  invoiceNumber: string
  customerName: string
  total: number
  dueDate: string
  status: string
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
const getInvoices = async (tenantId: string): Promise<InvoiceListItem[]> => {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, total, due_date, balance_amount, created_at, customer:customer_id(id, customer_name, company_name)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching invoices:", error)
    throw new Error(error.message)
  }

  return (
    data.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
customerName: invoice.customer?.customerName ?? "Unknown",


      total: invoice.total,
      dueDate: invoice.due_date,
      status: invoice.balance_amount > 0 ? "CREDIT" : "PAID",
    })) || []
  )
}

const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  const { data, error } = await supabase.from("invoices").select("*, customer:customer_id(*)").eq("id", id).single()

  if (error) {
    console.error(`Error fetching invoice with ID ${id}:`, error)
    throw new Error(error.message)
  }

  // Map snake_case database fields to camelCase for the application
  return data
    ? {
        id: data.id,
        customer: data.customer
          ? {
              id: data.customer.id,
              customerName: data.customer.customer_name,
              companyName: data.customer.company_name || "",
              customerEmail: data.customer.customer_email || "",
              gstin: data.customer.gst_in || "",
              address: data.customer.billing_address?.street1 || "",
              phoneNumber: data.customer.work_phone || "",
            }
          : {
              id: "",
              customerName: "",
              companyName: "",
              customerEmail: "",
              gstin: "",
              address: "",
              phoneNumber: "",
            },
        invoiceNumber: data.invoice_number,
        orderNumber: data.order_number,
        invoiceDate: data.invoice_date,
        dueDate: data.due_date,
        items: data.items,
        subtotal: data.subtotal,
        discount: data.discount,
        cgst: data.cgst,
        sgst: data.sgst,
        adjustment: data.adjustment,
        total: data.total,
        paidAmount: data.paid_amount,
        balanceAmount: data.balance_amount,
        termsAndConditions: data.terms_and_conditions,
        remarks: data.remarks,
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    : null
}

const createInvoice = async (invoice: Omit<Invoice, "id" | "created_at" | "updated_at">, tenantId: string) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.id) {
    throw new Error("User not authenticated")
  }

  // Map camelCase application fields to snake_case for the database
  const { data, error } = await supabase
    .from("invoices")
    .insert([
      {
        customer_id: invoice.customer.id,
        invoice_number: invoice.invoiceNumber,
        order_number: invoice.orderNumber,
        invoice_date: invoice.invoiceDate,
        due_date: invoice.dueDate,
        items: invoice.items,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        adjustment: invoice.adjustment,
        total: invoice.total,
        paid_amount: invoice.paidAmount,
        balance_amount: invoice.balanceAmount,
        terms_and_conditions: invoice.termsAndConditions,
        remarks: invoice.remarks,
        tenant_id: tenantId,
        user_id: user.id,
      },
    ])
    .select("*")

  if (error) {
    console.error("Error creating invoice:", error)
    throw new Error(error.message)
  }

  // After insert, fetch the complete invoice with customer data
  if (data?.[0]?.id) {
    return getInvoiceById(data[0].id)
  }

  return null
}

const updateInvoice = async (id: string, invoice: Partial<Omit<Invoice, "id" | "created_at">>) => {
  // Map camelCase application fields to snake_case for the database
  const updateData: any = {}

  if (invoice.customer) updateData.customer_id = invoice.customer.id
  if (invoice.invoiceNumber) updateData.invoice_number = invoice.invoiceNumber
  if (invoice.orderNumber) updateData.order_number = invoice.orderNumber
  if (invoice.invoiceDate) updateData.invoice_date = invoice.invoiceDate
  if (invoice.dueDate) updateData.due_date = invoice.dueDate
  if (invoice.items) updateData.items = invoice.items
  if (invoice.subtotal !== undefined) updateData.subtotal = invoice.subtotal
  if (invoice.discount !== undefined) updateData.discount = invoice.discount
  if (invoice.cgst !== undefined) updateData.cgst = invoice.cgst
  if (invoice.sgst !== undefined) updateData.sgst = invoice.sgst
  if (invoice.adjustment !== undefined) updateData.adjustment = invoice.adjustment
  if (invoice.total !== undefined) updateData.total = invoice.total
  if (invoice.paidAmount !== undefined) updateData.paid_amount = invoice.paidAmount
  if (invoice.balanceAmount !== undefined) updateData.balance_amount = invoice.balanceAmount
  if (invoice.termsAndConditions) updateData.terms_and_conditions = invoice.termsAndConditions
  if (invoice.remarks) updateData.remarks = invoice.remarks

  const { error } = await supabase.from("invoices").update(updateData).eq("id", id)

  if (error) {
    console.error(`Error updating invoice with ID ${id}:`, error)
    throw new Error(error.message)
  }

  // After update, fetch the complete invoice with customer data
  return getInvoiceById(id)
}

const deleteInvoice = async (id: string, tenantId: string) => {
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("tenant_id", tenantId)

  if (error) {
    console.error(`Error deleting invoice with ID ${id}:`, error)
    throw new Error(error.message)
  }

  return true
}

// Get company details from user settings
const getCompanyDetails = async (tenantId: string): Promise<CompanyDetails | null> => {
  const { data, error } = await supabase.from("user_settings").select("*").eq("tenant_id", tenantId).single()

  if (error) {
    if (error.code === "PGRST116") {
      console.log("No settings found for this tenant")
      return null
    }
    console.error("Error fetching user settings:", error)
    throw new Error(error.message)
  }

  if (!data || !data.business) {
    return null
  }

  return {
    companyName: data.business.businessName || "",
    address: data.business.address || "",
    phoneNumber: data.business.phone || "",
    email: data.business.email || "",
    website: "",
    taxId: data.business.gst || "",
  }
}

// Get customers for search
const searchCustomers = async (query: string, tenantId: string): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .or(`customer_name.ilike.%${query}%,company_name.ilike.%${query}%`)
    .limit(10)

  if (error) {
    console.error("Error searching customers:", error)
    throw new Error(error.message)
  }

  return (
    data.map((customer) => ({
      id: customer.id,
      customerName: customer.customer_name,
      companyName: customer.company_name || "",
      customerEmail: customer.customer_email || "",
      gstin: customer.gst_in || "",
      address: customer.billing_address?.street1 || "",
      phoneNumber: customer.work_phone || "",
    })) || []
  )
}

// Get products for search
const searchProducts = async (query: string, tenantId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(10)

  if (error) {
    console.error("Error searching products:", error)
    throw new Error(error.message)
  }

  return (
    data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description || "",
      rate: product.unit_price,
      tax: product.tax_percent,
      hsnCode: product.sku || "",
    })) || []
  )
}

function CustomerSearch({ onSelect, tenantId }: { onSelect: (customer: Customer) => void; tenantId: string | null }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCustomers = async () => {
      if (searchTerm.length < 2 || !tenantId) {
        setCustomers([])
        setError(null)
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const data = await searchCustomers(searchTerm, tenantId)
        setCustomers(data)
      } catch (error) {
        console.error("Error fetching customers:", error)
        setError("Unable to fetch customers. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(() => {
      fetchCustomers()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm, tenantId])

  return (
    <div>
      <Input
        placeholder="Search customers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center" role="alert">
          {error}
        </div>
      ) : (
        <ul className="space-y-2 max-h-[300px] overflow-y-auto">
          {customers.length === 0 && searchTerm.length >= 2 ? (
            <div className="text-center py-4 text-muted-foreground">No customers found</div>
          ) : (
            customers.map((customer) => (
              <li key={customer.id}>
                <Button variant="outline" className="w-full justify-start" onClick={() => onSelect(customer)}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{customer.customerName}</span>
                    {customer.companyName && (
                      <span className="text-xs text-muted-foreground">{customer.companyName}</span>
                    )}
                  </div>
                </Button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function ProductSearch({ onSelect, tenantId }: { onSelect: (product: Product) => void; tenantId: string | null }) {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      if (searchTerm.length < 2 || !tenantId) {
        setProducts([])
        setError(null)
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const data = await searchProducts(searchTerm, tenantId)
        setProducts(data)
      } catch (error) {
        console.error("Error fetching products:", error)
        setError("Unable to fetch products. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(() => {
      fetchProducts()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm, tenantId])

  return (
    <div>
      <Input
        placeholder="Search products..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center" role="alert">
          {error}
        </div>
      ) : (
        <ul className="space-y-2 max-h-[300px] overflow-y-auto">
          {products.length === 0 && searchTerm.length >= 2 ? (
            <div className="text-center py-4 text-muted-foreground">No products found</div>
          ) : (
            products.map((product) => (
              <li key={product.id}>
                <Button variant="outline" className="w-full justify-start" onClick={() => onSelect(product)}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{product.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>₹{product.rate.toFixed(2)}</span>
                      {product.tax > 0 && <span>• Tax: {product.tax}%</span>}
                    </div>
                  </div>
                </Button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function InvoicePreview({
  invoice,
  companyDetails,
  onBackToEdit,
}: {
  invoice: Invoice
  companyDetails: CompanyDetails
  onBackToEdit: () => void
}) {
  const handleDownload = () => {
    try {
      const doc = new jsPDF()

      // Set font
      doc.setFont("helvetica")

      // Add a border
      doc.setDrawColor(200, 200, 200)
      doc.rect(10, 10, 190, 277)

      // Add company details
      doc.setFontSize(18)
      doc.setTextColor(0, 0, 0)
      doc.text(companyDetails?.companyName ?? "Company Name", 15, 25)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(companyDetails?.address ?? "Company Address", 15, 32)
      doc.text(`Phone: ${companyDetails?.phoneNumber ?? "N/A"}`, 15, 37)
      doc.text(`Email: ${companyDetails?.email ?? "N/A"}`, 15, 42)

      // Add invoice details
      doc.setFontSize(24)
      doc.setTextColor(0, 0, 0)
      doc.text("INVOICE", 150, 25)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 150, 32)
      doc.text(`Date: ${invoice.invoiceDate}`, 150, 37)
      doc.text(`Due Date: ${invoice.dueDate}`, 150, 42)

      // Add a separator line
      doc.setDrawColor(200, 200, 200)
      doc.line(15, 50, 195, 50)

      // Add customer details
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text("Bill To:", 15, 60)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(invoice.customer?.customerName ?? "Customer Name", 15, 67)
      doc.text(invoice.customer?.companyName ?? "Company Name", 15, 72)
      doc.text(invoice.customer?.address ?? "Customer Address", 15, 77)

      // Add table headers
      const headers = ["Item", "HSN Code", "Qty", "Rate", "CGST", "SGST", "Amount"]
      let y = 90
      doc.setFillColor(240, 240, 240)
      doc.rect(15, y - 5, 180, 10, "F")
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      headers.forEach((header, i) => {
        doc.text(header, 20 + i * 25, y)
      })

      // Add table content
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      y += 10
      invoice.items.forEach((item, index) => {
        if (y > 250) {
          doc.addPage()
          y = 20
        }
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(15, y - 5, 180, 10, "F")
        }
        doc.text(item.name?.substring(0, 15) ?? "N/A", 20, y)
        doc.text(item.hsnCode ?? "N/A", 45, y)
        doc.text(item.quantity?.toString() ?? "0", 70, y)
        doc.text(`Rs:${item.rate?.toFixed(2) ?? "0.00"}`, 95, y)
        doc.text(`${item.cgst}%`, 120, y)
        doc.text(`${item.sgst}%`, 145, y)
        doc.text(`Rs:${item.amount?.toFixed(2) ?? "0.00"}`, 170, y)
        y += 10
      })

      // Add totals
      y += 10
      doc.line(15, y, 195, y)
      y += 10
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "bold")
      doc.text(`Subtotal:`, 130, y)
      doc.text(`Rs:${invoice.subtotal?.toFixed(2) ?? "0.00"}`, 180, y, { align: "right" })
      y += 7
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(`CGST:`, 130, y)
      doc.text(`Rs:${invoice.cgst?.toFixed(2) ?? "0.00"}`, 180, y, { align: "right" })
      y += 7
      doc.text(`SGST:`, 130, y)
      doc.text(`Rs:${invoice.sgst?.toFixed(2) ?? "0.00"}`, 180, y, { align: "right" })
      y += 7
      doc.text(`Discount:`, 130, y)
      doc.text(`Rs:${invoice.discount?.toFixed(2) ?? "0.00"}`, 180, y, { align: "right" })
      y += 7
      doc.text(`Adjustment:`, 130, y)
      doc.text(`Rs:${invoice.adjustment?.toFixed(2) ?? "0.00"}`, 180, y, { align: "right" })
      y += 7
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text(`Total:`, 130, y)
      doc.text(`Rs:${invoice.total?.toFixed(2) ?? "0.00"}`, 180, y, { align: "right" })
      y += 10
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Paid Amount:`, 130, y)
      doc.text(`Rs:${invoice.paidAmount?.toFixed(2) ?? "0.00"}`, 180, y, { align: "right" })
      y += 7
      doc.text(`Balance Amount:`, 130, y)
      doc.text(`Rs:${invoice.balanceAmount?.toFixed(2) ?? "0.00"}`, 180, y, { align: "right" })
      y += 7
      doc.text(`Status:`, 130, y)
      doc.setTextColor(invoice.balanceAmount > 0 ? 255 : 0, invoice.balanceAmount > 0 ? 0 : 128, 0)
      doc.text(invoice.balanceAmount > 0 ? "CREDIT" : "PAID", 180, y, { align: "right" })

      // Add terms and conditions
      y += 20
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.text("Terms & Conditions", 15, y)
      y += 7
      doc.setTextColor(100, 100, 100)
      const termsAndConditions = doc.splitTextToSize(invoice.termsAndConditions || "N/A", 170)
      doc.text(termsAndConditions, 15, y)

      // Add a footer
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text("Thank you for your business!", 105, 287, { align: "center" })

      // Save the PDF (download)
      doc.save(`Invoice_${invoice.invoiceNumber}.pdf`)
      console.log("PDF generated successfully")
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("An error occurred while generating the PDF. Please try again.")
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-inner">
      <div className="flex justify-between mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{companyDetails.companyName}</h2>
          <p className="text-sm text-gray-600">{companyDetails.address}</p>
          <p className="text-sm text-gray-600">{companyDetails.phoneNumber}</p>
          <p className="text-sm text-gray-600">{companyDetails.email}</p>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-semibold text-gray-800">Invoice</h3>
          <p className="text-sm text-gray-600">#{invoice.invoiceNumber}</p>
          <p className="text-sm text-gray-600">Date: {invoice.invoiceDate}</p>
          <p className="text-sm text-gray-600">Due: {invoice.dueDate}</p>
        </div>
      </div>
      <div className="mb-6 p-3 bg-gray-50 rounded-md">
        <h3 className="text-md font-semibold text-gray-800 mb-1">Bill To:</h3>
        <p className="text-sm text-gray-600">{invoice.customer.customerName}</p>
        {invoice.customer.companyName && <p className="text-sm text-gray-600">{invoice.customer.companyName}</p>}
        {invoice.customer.address && <p className="text-sm text-gray-600">{invoice.customer.address}</p>}
      </div>
      <div className="border rounded-md mb-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-800">Item</TableHead>
              <TableHead className="font-semibold text-gray-800">HSN</TableHead>
              <TableHead className="font-semibold text-gray-800">Qty</TableHead>
              <TableHead className="font-semibold text-gray-800">Rate</TableHead>
              <TableHead className="font-semibold text-gray-800">CGST</TableHead>
              <TableHead className="font-semibold text-gray-800">SGST</TableHead>
              <TableHead className="font-semibold text-gray-800">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm text-gray-600">{item.name}</TableCell>
                <TableCell className="text-sm text-gray-600">{item.hsnCode}</TableCell>
                <TableCell className="text-sm text-gray-600">{item.quantity}</TableCell>
                <TableCell className="text-sm text-gray-600">₹{item.rate.toFixed(2)}</TableCell>
                <TableCell className="text-sm text-gray-600">{item.cgst}%</TableCell>
                <TableCell className="text-sm text-gray-600">{item.sgst}%</TableCell>
                <TableCell className="text-sm text-gray-600">₹{item.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-6 flex justify-end">
        <div className="w-full md:w-1/2 lg:w-1/3 space-y-2 bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal:</span>
            <span className="font-medium">₹{invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>CGST:</span>
            <span className="font-medium">₹{invoice.cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>SGST:</span>
            <span className="font-medium">₹{invoice.sgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Discount:</span>
            <span className="font-medium">₹{invoice.discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Adjustment:</span>
            <span className="font-medium">₹{invoice.adjustment.toFixed(2)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-semibold text-gray-800">
            <span>Total:</span>
            <span>₹{invoice.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Paid Amount:</span>
            <span className="font-medium">₹{invoice.paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Balance Amount:</span>
            <span className="font-medium">₹{invoice.balanceAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Status:</span>
            <span className={invoice.balanceAmount > 0 ? "text-red-500" : "text-green-500"}>
              {invoice.balanceAmount > 0 ? "CREDIT" : "PAID"}
            </span>
          </div>
        </div>
      </div>
      {invoice.termsAndConditions && (
        <div className="mt-6 bg-gray-50 p-3 rounded-md">
          <h3 className="text-md font-semibold text-gray-800 mb-1">Terms and Conditions:</h3>
          <p className="text-sm text-gray-600">{invoice.termsAndConditions}</p>
        </div>
      )}
      {invoice.remarks && (
        <div className="mt-4 bg-gray-50 p-3 rounded-md">
          <h3 className="text-md font-semibold text-gray-800 mb-1">Remarks:</h3>
          <p className="text-sm text-gray-600">{invoice.remarks}</p>
        </div>
      )}
      <div className="mt-6 flex justify-between">
        <Button onClick={onBackToEdit} variant="outline" className="flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to Edit
        </Button>
        <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  )
}

function InvoiceList({
  onCreateInvoice,
  onViewInvoice,
  onEditInvoice,
  tenantId,
  onRefresh,
}: {
  onCreateInvoice: () => void
  onViewInvoice: (id: string) => void
  onEditInvoice: (id: string) => void
  tenantId: string | null
  onRefresh?: () => void
}) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!tenantId) return

      try {
        setIsLoading(true)
        const data = await getInvoices(tenantId)
        setInvoices(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching invoices:", err)
        setError("Error fetching invoices. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [tenantId])

  const handleDeleteInvoice = async (id: string) => {
    if (!tenantId) return

    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteInvoice(id, tenantId)
        setInvoices(invoices.filter((invoice) => invoice.id !== id))
        setError(null)
        if (onRefresh) onRefresh()
      } catch (error) {
        console.error("Error deleting invoice:", error)
        setError("Failed to delete invoice. Please try again.")
      }
    }
  }

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <Button onClick={onCreateInvoice} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="flex justify-between items-center gap-2 py-2">
        <Input
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium">Invoice Number</TableHead>
              <TableHead className="font-medium">Customer</TableHead>
              <TableHead className="font-medium">Total</TableHead>
              <TableHead className="font-medium">Due Date</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No invoices found matching your search" : "No invoices found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>₹{invoice.total.toFixed(2)}</TableCell>
                  <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === "PAID" ? "success" : "destructive"} className="bg-opacity-10">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-600 hover:text-gray-900"
                              onClick={() => onViewInvoice(invoice.id)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Invoice</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => onEditInvoice(invoice.id)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Invoice</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Invoice</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function Invoice() {
  const [invoice, setInvoice] = useState<Invoice>({
    id: "",
    customer: {
      id: "",
      customerName: "",
      companyName: "",
      customerEmail: "",
      gstin: "",
      address: "",
      phoneNumber: "",
    },
    invoiceNumber: "",
    orderNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    items: [],
    subtotal: 0,
    discount: 0,
    cgst: 0,
    sgst: 0,
    adjustment: 0,
    total: 0,
    paidAmount: 0,
    balanceAmount: 0,
    termsAndConditions: "Default terms and conditions",
    remarks: "",
  })

  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  // Get the tenant ID from local storage
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
          setError("Tenant ID not found in local storage. Please log in again.")
        }
      } catch (error) {
        console.error("Error getting tenant ID:", error)
        setError("Failed to authenticate tenant. Please log in again.")
      }
    }

    getTenantId()
  }, [])

  // Fetch company details when tenant ID is available
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!tenantId) return

      try {
        setIsLoading(true)
        const data = await getCompanyDetails(tenantId)
        if (data) {
          setCompanyDetails(data)
        } else {
          setCompanyDetails({
            companyName: "Your Company",
            address: "Your Address",
            phoneNumber: "Your Phone",
            email: "your.email@example.com",
            website: "www.example.com",
            taxId: "Your Tax ID",
          })
        }
        setError(null)
      } catch (err) {
        console.error("Error fetching company details:", err)
        setError("Error fetching company details. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanyDetails()
  }, [tenantId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setInvoice((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...invoice.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setInvoice((prev) => ({
      ...prev,
      items: updatedItems,
    }))
    calculateTotals(updatedItems)
  }

  const calculateTotals = (items: InvoiceItem[]) => {
    let subtotal = 0
    let totalDiscount = 0
    let totalCGST = 0
    let totalSGST = 0
    const updatedItems = items.map((item) => {
      const itemTotal = item.quantity * item.rate
      const itemCGST = itemTotal * (item.cgst / 100)
      const itemSGST = itemTotal * (item.sgst / 100)
      const amount = itemTotal + itemCGST + itemSGST - item.discount
      subtotal += itemTotal
      totalDiscount += item.discount
      totalCGST += itemCGST
      totalSGST += itemSGST
      return { ...item, amount }
    })
    const total = subtotal + totalCGST + totalSGST - totalDiscount + invoice.adjustment
    const balanceAmount = total - invoice.paidAmount

    setInvoice((prev) => ({
      ...prev,
      subtotal,
      discount: totalDiscount,
      cgst: totalCGST,
      sgst: totalSGST,
      total,
      balanceAmount,
      items: updatedItems,
    }))
  }

  const addItem = (product: Product) => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      name: product.name,
      quantity: 1,
      rate: product.rate || 0,
      discount: 0,
      cgst: product.tax / 2 || 0,
      sgst: product.tax / 2 || 0,
      amount: 0,
      hsnCode: product.hsnCode || "",
    }
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }))
    calculateTotals([...invoice.items, newItem])
    setIsProductDialogOpen(false)
  }

  const removeItem = (index: number) => {
    const updatedItems = invoice.items.filter((_, i) => i !== index)
    setInvoice((prev) => ({
      ...prev,
      items: updatedItems,
    }))
    calculateTotals(updatedItems)
  }

  const handleCustomerSelect = (customer: Customer) => {
    setInvoice((prev) => ({
      ...prev,
      customer: customer,
    }))
    setIsCustomerDialogOpen(false)
  }

  const handleSaveInvoice = async () => {
    if (!tenantId) {
      setError("Tenant ID is required to save invoice.")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)

      if (currentInvoiceId) {
        // Update existing invoice
        await updateInvoice(currentInvoiceId, invoice)
        setSuccessMessage("Invoice updated successfully!")
      } else {
        // Create new invoice
        const result = await createInvoice(invoice, tenantId)
        if (result && result.id) {
          setInvoice((prev) => ({
            ...prev,
            id: result.id,
          }))
          setCurrentInvoiceId(result.id)
          setSuccessMessage("Invoice created successfully!")
        } else {
          throw new Error("Failed to create invoice")
        }
      }

      setRefreshCount((prev) => prev + 1)
    } catch (error) {
      console.error("Error saving invoice:", error)
      setError("An error occurred while saving the invoice. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewInvoice = async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)

      const invoiceData = await getInvoiceById(id)
      if (invoiceData) {
        setInvoice(invoiceData)
        setCurrentInvoiceId(id)
        setIsViewMode(true)
        setShowInvoiceForm(true)
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      setError("Failed to fetch invoice details.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditInvoice = async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)

      const invoiceData = await getInvoiceById(id)
      if (invoiceData) {
        setInvoice(invoiceData)
        setCurrentInvoiceId(id)
        setIsViewMode(false)
        setShowInvoiceForm(true)
        setIsEditing(true)
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      setError("Failed to fetch invoice details.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToList = () => {
    setShowInvoiceForm(false)
    setCurrentInvoiceId(null)
    setIsViewMode(false)
    setIsEditing(true)
    setError(null)
    setSuccessMessage(null)
  }

  const handleSaveAndPrint = async () => {
    try {
      await handleSaveInvoice()
      window.print()
    } catch (error) {
      console.error("Error in save and print:", error)
    }
  }

  const generateInvoiceNumber = () => {
    const prefix = "INV-"
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `${prefix}${timestamp}-${random}`
  }

  if (isLoading && !showInvoiceForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {!tenantId ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <div className="mb-4 text-red-500">Tenant authentication required</div>
              <p>Please log in to access your invoices.</p>
            </div>
          </CardContent>
        </Card>
      ) : !showInvoiceForm ? (
        <InvoiceList
          onCreateInvoice={() => {
            setInvoice({
              ...invoice,
              invoiceNumber: generateInvoiceNumber(),
              invoiceDate: new Date().toISOString().split("T")[0],
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            })
            setShowInvoiceForm(true)
            setCurrentInvoiceId(null)
            setIsViewMode(false)
            setIsEditing(true)
          }}
          onViewInvoice={handleViewInvoice}
          onEditInvoice={handleEditInvoice}
          tenantId={tenantId}
          onRefresh={() => setRefreshCount((prev) => prev + 1)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2 bg-white shadow-md rounded-lg overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-800">
                    {currentInvoiceId ? (isViewMode ? "View Invoice" : "Edit Invoice") : "Create New Invoice"}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {currentInvoiceId
                      ? `Invoice #${invoice.invoiceNumber}`
                      : "Fill in the details to create a new invoice"}
                  </CardDescription>
                </div>
                <Button onClick={handleBackToList} variant="outline" size="sm" className="flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <form className="space-y-4">
                <div>
                  <Label htmlFor="customerName" className="text-sm font-medium text-gray-700 mb-1 block">
                    Customer
                  </Label>
                  <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-2"
                        disabled={isViewMode}
                      >
                        {invoice.customer.customerName ? (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{invoice.customer.customerName}</span>
                            {invoice.customer.companyName && (
                              <span className="text-xs text-muted-foreground">{invoice.customer.companyName}</span>
                            )}
                          </div>
                        ) : (
                          "Select Customer"
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Select Customer</DialogTitle>
                        <DialogDescription>Search for a customer to add to the invoice.</DialogDescription>
                      </DialogHeader>
                      <CustomerSearch onSelect={handleCustomerSelect} tenantId={tenantId} />
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoiceNumber" className="text-sm font-medium text-gray-700 mb-1 block">
                      Invoice Number
                    </Label>
                    <Input
                      id="invoiceNumber"
                      name="invoiceNumber"
                      value={invoice.invoiceNumber}
                      onChange={handleInputChange}
                      readOnly={isViewMode}
                    />
                  </div>
                  <div>
                    <Label htmlFor="orderNumber" className="text-sm font-medium text-gray-700 mb-1 block">
                      Order Number
                    </Label>
                    <Input
                      id="orderNumber"
                      name="orderNumber"
                      value={invoice.orderNumber}
                      onChange={handleInputChange}
                      readOnly={isViewMode}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceDate" className="text-sm font-medium text-gray-700 mb-1 block">
                      Invoice Date
                    </Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      name="invoiceDate"
                      value={invoice.invoiceDate}
                      onChange={handleInputChange}
                      readOnly={isViewMode}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700 mb-1 block">
                      Due Date
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      name="dueDate"
                      value={invoice.dueDate}
                      onChange={handleInputChange}
                      readOnly={isViewMode}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-medium text-gray-700">Items</Label>
                    {!isViewMode && (
                      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <Plus className="h-4 w-4" />
                            Add Item
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Select Product</DialogTitle>
                            <DialogDescription>Search for a product to add to the invoice.</DialogDescription>
                          </DialogHeader>
                          <ProductSearch onSelect={addItem} tenantId={tenantId} />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Amount</TableHead>
                          {!isViewMode && <TableHead></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isViewMode ? 4 : 5} className="text-center py-4 text-muted-foreground">
                              {isViewMode ? "No items in this invoice" : "Add items to the invoice"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoice.items.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {isViewMode ? (
                                  <div>
                                    <div>{item.name}</div>
                                    <div className="text-xs text-muted-foreground">HSN: {item.hsnCode || "-"}</div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <Input
                                      value={item.name}
                                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                      className="w-full"
                                      placeholder="Item name"
                                    />
                                    <Input
                                      value={item.hsnCode}
                                      onChange={(e) => handleItemChange(index, "hsnCode", e.target.value)}
                                      className="w-full"
                                      placeholder="HSN Code"
                                    />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {isViewMode ? (
                                  item.quantity
                                ) : (
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)
                                    }
                                    className="w-16"
                                    min="1"
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {isViewMode ? (
                                  `₹${item.rate.toFixed(2)}`
                                ) : (
                                  <Input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) =>
                                      handleItemChange(index, "rate", Number.parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24"
                                    min="0"
                                    step="0.01"
                                  />
                                )}
                              </TableCell>
                              <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                              {!isViewMode && (
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                    onClick={() => removeItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="space-y-2 bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CGST:</span>
                    <span className="font-medium">₹{invoice.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SGST:</span>
                    <span className="font-medium">₹{invoice.sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium">₹{invoice.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Adjustment:</span>
                    {isViewMode ? (
                      <span className="font-medium">₹{invoice.adjustment.toFixed(2)}</span>
                    ) : (
                      <Input
                        type="number"
                        name="adjustment"
                        value={invoice.adjustment}
                        onChange={(e) => {
                          const adjustment = Number.parseFloat(e.target.value) || 0
                          setInvoice((prev) => ({
                            ...prev,
                            adjustment,
                            total: prev.subtotal + prev.cgst + prev.sgst - prev.discount + adjustment,
                            balanceAmount:
                              prev.subtotal + prev.cgst + prev.sgst - prev.discount + adjustment - prev.paidAmount,
                          }))
                        }}
                        className="w-24"
                        step="0.01"
                      />
                    )}
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total:</span>
                    <span>₹{invoice.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Paid Amount:</span>
                    {isViewMode ? (
                      <span className="font-medium">₹{invoice.paidAmount.toFixed(2)}</span>
                    ) : (
                      <Input
                        type="number"
                        name="paidAmount"
                        value={invoice.paidAmount}
                        onChange={(e) => {
                          const paidAmount = Number.parseFloat(e.target.value) || 0
                          setInvoice((prev) => ({
                            ...prev,
                            paidAmount,
                            balanceAmount: prev.total - paidAmount,
                          }))
                        }}
                        className="w-24"
                        step="0.01"
                        min="0"
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance Amount:</span>
                    <span className="font-medium">₹{invoice.balanceAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={invoice.balanceAmount > 0 ? "text-red-500 font-medium" : "text-green-500 font-medium"}
                    >
                      {invoice.balanceAmount > 0 ? "CREDIT" : "PAID"}
                    </span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="termsAndConditions" className="text-sm font-medium text-gray-700 mb-1 block">
                    Terms and Conditions
                  </Label>
                  <Textarea
                    id="termsAndConditions"
                    name="termsAndConditions"
                    value={invoice.termsAndConditions}
                    onChange={handleInputChange}
                    rows={3}
                    className="font-mono text-sm"
                    readOnly={isViewMode}
                  />
                </div>
                <div>
                  <Label htmlFor="remarks" className="text-sm font-medium text-gray-700 mb-1 block">
                    Remarks
                  </Label>
                  <Textarea
                    id="remarks"
                    name="remarks"
                    value={invoice.remarks}
                    onChange={handleInputChange}
                    rows={2}
                    className="font-mono text-sm"
                    readOnly={isViewMode}
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t border-gray-200 p-4">
              {!isViewMode && (
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleSaveInvoice}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Invoice
                      </>
                    )}
                  </Button>
                
                </div>
              )}
            </CardFooter>
          </Card>
          {companyDetails && (
            <Card className="lg:col-span-3 bg-white shadow-md rounded-lg overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200 pb-3">
                <CardTitle className="text-xl font-semibold text-gray-800">Invoice Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-12rem)]">
                <InvoicePreview
                  invoice={invoice}
                  companyDetails={companyDetails}
                  onBackToEdit={() => setIsEditing(true)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
