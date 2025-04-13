"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

interface InvoiceItem {
  id: string
  name: string
  quantity: number
  rate: number
  discount: number
  tax: number
}

interface Invoice {
  id: string
  customer: {
    customerName: string
    companyName: string
    address: string
  }
  invoiceNumber: string
  orderNumber: string
  invoiceDate: string
  dueDate: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  adjustment: number
  total: number
  termsAndConditions: string
  remarks: string
}

export default function InvoicePreviewPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    // In a real application, you would fetch the invoice data from your API
    // For this example, we'll simulate fetching data
    const fetchInvoice = async () => {
      // Simulating API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock invoice data
      const mockInvoice: Invoice = {
        id: params.id as string,
        customer: {
          customerName: "John Doe",
          companyName: "Acme Corp",
          address: "123 Main St, Anytown, AN 12345"
        },
        invoiceNumber: `INV-2025-${params.id}`,
        orderNumber: "ORD-2025-001",
        invoiceDate: "2025-01-18",
        dueDate: "2025-02-17",
        items: [
          { id: "1", name: "Product A", quantity: 2, rate: 100, discount: 10, tax: 5 },
          { id: "2", name: "Service B", quantity: 1, rate: 200, discount: 0, tax: 10 }
        ],
        subtotal: 400,
        discount: 10,
        adjustment: 0,
        total: 390,
        termsAndConditions: "1. Payment is due within 30 days\n2. Late payments are subject to a 1.5% monthly fee",
        remarks: "Thank you for your business!"
      }
      
      setInvoice(mockInvoice)
    }

    fetchInvoice()
  }, [params.id])

  const handlePrint = () => {
    window.print()
  }

  const handleGeneratePDF = () => {
    if (!invoice) return

    const doc = new jsPDF()

    // Add invoice details
    doc.setFontSize(20)
    doc.text('Invoice', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 40)
    doc.text(`Order Number: ${invoice.orderNumber}`, 20, 50)
    doc.text(`Invoice Date: ${invoice.invoiceDate}`, 20, 60)
    doc.text(`Due Date: ${invoice.dueDate}`, 20, 70)

    // Add customer details
    doc.text('Bill To:', 20, 90)
    doc.text(`${invoice.customer.customerName}`, 20, 100)
    doc.text(`${invoice.customer.companyName}`, 20, 110)
    doc.text(`${invoice.customer.address}`, 20, 120)

    // Add items table
    const tableColumn = ["Item", "Quantity", "Rate", "Discount", "Tax", "Amount"]
    const tableRows = invoice.items.map(item => [
      item.name,
      item.quantity,
      item.rate,
      item.discount,
      item.tax,
      ((item.quantity * item.rate) * (1 + item.tax / 100) - item.discount).toFixed(2)
    ])

    ;(doc as any).autoTable({
      startY: 140,
      head: [tableColumn],
      body: tableRows,
    })

    // Add totals
    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.text(`Subtotal: ${invoice.subtotal.toFixed(2)}`, 140, finalY)
    doc.text(`Discount: ${invoice.discount.toFixed(2)}`, 140, finalY + 10)
    doc.text(`Adjustment: ${invoice.adjustment.toFixed(2)}`, 140, finalY + 20)
    doc.text(`Total: ${invoice.total.toFixed(2)}`, 140, finalY + 30)

    // Add terms and conditions
    doc.text('Terms and Conditions:', 20, finalY + 50)
    doc.setFontSize(10)
    doc.text(invoice.termsAndConditions, 20, finalY + 60)

    // Add remarks
    doc.setFontSize(12)
    doc.text('Remarks:', 20, finalY + 90)
    doc.setFontSize(10)
    doc.text(invoice.remarks, 20, finalY + 100)

    // Save the PDF
    doc.save(`invoice_${invoice.invoiceNumber}.pdf`)
  }

  if (!invoice) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-semibold">Bill To:</h3>
              <p>{invoice.customer.customerName}</p>
              <p>{invoice.customer.companyName}</p>
              <p>{invoice.customer.address}</p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold">Invoice Number:</span> {invoice.invoiceNumber}</p>
              <p><span className="font-semibold">Order Number:</span> {invoice.orderNumber}</p>
              <p><span className="font-semibold">Invoice Date:</span> {invoice.invoiceDate}</p>
              <p><span className="font-semibold">Due Date:</span> {invoice.dueDate}</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                  <TableCell>₹{item.discount.toFixed(2)}</TableCell>
                  <TableCell>{item.tax}%</TableCell>
                  <TableCell>₹{((item.quantity * item.rate) * (1 + item.tax / 100) - item.discount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-6 text-right">
            <p><span className="font-semibold">Subtotal:</span> ₹{invoice.subtotal.toFixed(2)}</p>
            <p><span className="font-semibold">Discount:</span> ₹{invoice.discount.toFixed(2)}</p>
            <p><span className="font-semibold">Adjustment:</span> ₹{invoice.adjustment.toFixed(2)}</p>
            <p className="text-xl font-bold mt-2"><span className="font-semibold">Total:</span> ₹{invoice.total.toFixed(2)}</p>
          </div>
          <div className="mt-6">
            <h3 className="font-semibold">Terms and Conditions:</h3>
            <p className="whitespace-pre-line">{invoice.termsAndConditions}</p>
          </div>
          <div className="mt-6">
            <h3 className="font-semibold">Remarks:</h3>
            <p>{invoice.remarks}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button onClick={handlePrint}>Print</Button>
          <Button onClick={handleGeneratePDF}>Generate PDF</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

