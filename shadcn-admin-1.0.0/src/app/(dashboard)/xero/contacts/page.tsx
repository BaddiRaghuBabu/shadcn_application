// src/app/(dashboard)/xero/contacts/page.tsx
"use client";

import { useState } from "react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Link as LinkIcon, Database } from "lucide-react";
import DisplayTenants from "./DisplayTenants";

type Contact = {
  id?: number;
  tenant_id: string;
  contact_id: string;
  name: string | null;
  email: string | null;
  is_customer: boolean | null;
  is_supplier: boolean | null;
  created_at: string; // ISO string from API
};

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const handleConnectXero = () => {
    window.location.href = `${API_BASE}/connect`;
  };

  const fetchAndSaveContacts = async () => {
    try {
      setLoading(true);

      const saveRes = await fetch(`${API_BASE}/contacts`, { method: "GET" });
      const saveData = await saveRes.json().catch(() => ({} as any));
      if (!saveRes.ok) throw new Error(saveData?.message || "Failed to save contacts");
      toast.success(saveData?.message || "Contacts saved successfully ✅");

      const listRes = await fetch(`${API_BASE}/view-contacts`, { method: "GET" });
      if (!listRes.ok) throw new Error("Failed to fetch contacts");
      const listData: Contact[] = await listRes.json();
      setContacts(Array.isArray(listData) ? listData : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save contacts ❌";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <Toaster richColors position="top-right" />
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">Xero Contact Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={handleConnectXero} className="min-w-[180px]" variant="secondary">
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect to Xero
              </Button>

              <Button onClick={fetchAndSaveContacts} className="min-w-[240px]" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Fetched & Contacts Summary
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Name</TableHead>
                    <TableHead className="min-w-[220px]">Email</TableHead>
                    <TableHead className="min-w-[140px]">Customer?</TableHead>
                    <TableHead className="min-w-[140px]">Supplier?</TableHead>
                    <TableHead className="min-w-[260px]">Created At</TableHead>
                    <TableHead className="min-w-[220px]">Tenant ID</TableHead>
                    <TableHead className="min-w-[220px]">Contact ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                        No contacts fetched yet. Click <span className="font-medium">“Fetched & Contacts Summary”</span> to load.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contacts.map((c, i) => (
                      <TableRow key={c.id ?? c.contact_id ?? `row-${i}`}>
                        <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                        <TableCell>{c.email ?? "N/A"}</TableCell>
                        <TableCell>{c.is_customer ? "Yes" : "No"}</TableCell>
                        <TableCell>{c.is_supplier ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.tenant_id}</TableCell>
                        <TableCell className="font-mono text-xs">{c.contact_id}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <DisplayTenants />
      </div>
    </div>
  );
}
