"use client";

import { useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Account {
  account_id: string;
  name: string | null;
  fully_qualified_name: string | null;
  account_type: string | null;
  account_sub_type: string | null;
  current_balance: number | null;
}

interface Invoice {
  invoice_id: string;
  doc_number: string | null;
  customer_name: string | null;
  total_amt: number | null;
  balance: number | null;
  currency_code: string | null;
}

export default function QuickBooksPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/quickbooks/accounts");
      const json = await res.json();
      setAccounts(json.accounts || []);
    } catch {
      // ignore
    }
  };
    const loadInvoices = async () => {
    try {
      const res = await fetch("/api/quickbooks/invoices");
      const json = await res.json();
      setInvoices(json.invoices || []);
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <CardTitle>QuickBooks Dashboard</CardTitle>
          <div className="flex flex-wrap gap-4">
            <Button size="sm" onClick={loadAccounts}>
              Load accounts
            </Button>
            <Button size="sm" onClick={loadInvoices}>
              Load invoices
            </Button>
          </div>
          {accounts.length > 0 && (
             <div className="mt-6 space-y-2">
              <CardTitle className="text-base">Accounts</CardTitle>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subtype</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.account_id}>
                      <TableCell>{a.name ?? "Unnamed"}</TableCell>
                      <TableCell>{a.account_type ?? "Unknown"}</TableCell>
                      <TableCell>{a.account_sub_type ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        {a.current_balance ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {invoices.length > 0 && (
            <div className="mt-6 space-y-2">
              <CardTitle className="text-base">Invoices</CardTitle>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.invoice_id}>
                      <TableCell>{inv.doc_number ?? "-"}</TableCell>
                      <TableCell>{inv.customer_name ?? "-"}</TableCell>
                      <TableCell>{inv.total_amt ?? 0}</TableCell>
                      <TableCell>{inv.balance ?? 0}</TableCell>
                      <TableCell>{inv.currency_code ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}