// /app/api/quickbooks/invoices/route.ts
/* eslint-disable no-await-in-loop, @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getQuickBooksApiBase } from "@/lib/quickbooksApi";


export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data: token } = await supabase
    .from("quickbooks_tokens")
    .select("realm_id, access_token")
    .single();
  if (!token) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  const realmId = token.realm_id;
  const accessToken = token.access_token;
  const apiBase = getQuickBooksApiBase();
  const baseUrl = `${apiBase}/v3/company/${realmId}/query`;  
  const pageSize = 100;
  let start = 1;
  let fetched = 0;
  const all: unknown[] = [];

  while (true) {
    const query = encodeURIComponent(`select * from Invoice startposition ${start} maxresults ${pageSize}`);
    const res = await fetch(`${baseUrl}?query=${query}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: txt }, { status: 500 });
    }
    const json = await res.json();
    const invoices = json?.QueryResponse?.Invoice || [];
    if (!Array.isArray(invoices) || invoices.length === 0) break;
    fetched += invoices.length;
    start += invoices.length;
    all.push(...invoices);
    if (invoices.length < pageSize) break;
  }

  for (const inv of all as any[]) {
    await supabase.from("quickbooks_invoices").upsert({
      invoice_id: inv.Id,
      realm_id: realmId,
      doc_number: inv.DocNumber,
      customer_name: inv.CustomerRef?.name ?? null,
      status: inv.Balance > 0 ? "OPEN" : "PAID",
      currency_code: inv.CurrencyRef?.value ?? null,
      balance: inv.Balance ?? null,
      total_amt: inv.TotalAmt ?? null,
      txn_date: inv.TxnDate ?? null,
      due_date: inv.DueDate ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ synced: fetched });
}