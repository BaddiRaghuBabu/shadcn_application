"use client";

import { useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Account {
  account_id: string;
  name: string | null;
  account_type: string | null;
}

export default function QuickBooksPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/quickbooks/accounts");
      const json = await res.json();
      setAccounts(json.accounts || []);
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <CardTitle>QuickBooks Dashboard</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="mb-2 font-medium">Accountant</div>
              <Button size="sm" onClick={loadAccounts}>
                Load accounts
              </Button>
            </div>
          </div>
          {accounts.length > 0 && (
            <div className="mt-6">
              <CardTitle className="mb-2 text-base">Accounts</CardTitle>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {accounts.map((a) => (
                  <li key={a.account_id}>
                    {a.name ?? "Unnamed"} — {a.account_type ?? "Unknown"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}