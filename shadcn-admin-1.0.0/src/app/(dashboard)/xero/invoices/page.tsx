"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface Invoice {
  invoice_number: string | null
  amount_due: number | null
  status: string | null
}

export default function XeroInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  const loadInvoices = () => {
    fetch("/api/xero/invoices/fetch")
      .then((res) => res.json())
      .then((data) => setInvoices(data || []))
      .catch(() => {})
  }

  useEffect(() => {
    loadInvoices()
  }, [])

  const syncInvoices = async () => {
    setLoading(true)
    await fetch("/api/xero/invoices").catch(() => {})
    loadInvoices()
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Xero Invoices</h1>
        <Button onClick={syncInvoices} disabled={loading}>
          {loading ? "Syncing..." : "Sync Invoices"}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Number</th>
              <th className="px-4 py-2 text-left">Amount Due</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2">{inv.invoice_number}</td>
                <td className="px-4 py-2">{inv.amount_due}</td>
                <td className="px-4 py-2">{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}