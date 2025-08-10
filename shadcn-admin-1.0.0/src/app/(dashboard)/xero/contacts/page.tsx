"use client"

import { useEffect, useState } from "react"

interface Contact {
  name: string | null
  email: string | null
  is_customer: boolean | null
}

export default function XeroContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    fetch("/api/xero/fetch")
      .then((res) => res.json())
      .then((data) => setContacts(data || []))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Xero Contacts</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Customer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((c, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">{c.email}</td>
                <td className="px-4 py-2">{c.is_customer ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}