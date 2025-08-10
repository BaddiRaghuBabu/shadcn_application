// src/app/(dashboard)/xero/contacts/DisplayTenants.tsx
"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Contact = {
  contact_id?: string;
  name?: string | null;
  email?: string | null;
  is_customer?: boolean | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_XERO_BACKEND_URL ?? "http://localhost:3300";

export default function DisplayTenants() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/fetch`, { signal });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: Contact[] = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      if ((e as any)?.name === "AbortError") return;
      setError("Failed to fetch contacts.");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <Card className="border rounded-2xl shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CardTitle className="text-xl font-semibold">Xero Contacts</CardTitle>
        <Button variant="outline" size="sm" onClick={() => load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
            <div className="mt-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts found.</p>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Customer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact, i) => (
                  <TableRow key={contact.contact_id ?? `row-${i}`}>
                    <TableCell className="font-medium">
                      {contact.name ?? "—"}
                    </TableCell>
                    <TableCell>{contact.email ?? "N/A"}</TableCell>
                    <TableCell>
                      {contact.is_customer ? "✅ Yes" : "❌ No"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
