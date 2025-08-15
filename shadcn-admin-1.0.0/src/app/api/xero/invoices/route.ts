// /app/api/xero/invoices/route.ts
import { NextResponse } from "next/server";
import { getXeroClient } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

function iso(d?: string | null): string | null {
  if (!d) return null;
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  } catch {
    return null;
  }
}

type XeroInvoiceSubset = {
  invoiceID?: string | null;
  invoiceNumber?: string | null;
  contact?: { name?: string | null } | null;
  status?: string | null;
  currencyCode?: string | null;
  amountDue?: number | null;
  amountPaid?: number | null;
  total?: number | null;
  date?: string | null;
  dueDate?: string | null;
  updatedDateUTC?: string | null;
  reference?: string | null;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    const { data: token, error: tokenError } = await supabase
      .from("xero_tokens")
      .select("tenant_id, access_token, refresh_token")
      .single();

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }
    if (!token) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }
    const xero = await getXeroClient();

    xero.setTokenSet({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
    });

    const res = await xero.accountingApi.getInvoices(token.tenant_id);
    const invoices = (res?.body?.invoices ?? []) as XeroInvoiceSubset[];

    if (invoices.length === 0) {
      return NextResponse.json({ fetched: 0, saved: 0 });
    }

    const rows = invoices.map((inv: XeroInvoiceSubset) => ({
      tenant_id: token.tenant_id,
      invoice_id: inv.invoiceID ?? null,
      invoice_number: inv.invoiceNumber ?? null,
      contact_name: inv?.contact?.name ?? null,
      status: inv.status ?? null,
      currency_code: inv.currencyCode ?? null,
      amount_due: typeof inv.amountDue === "number" ? inv.amountDue : null,
      amount_paid: typeof inv.amountPaid === "number" ? inv.amountPaid : null,
      total: typeof inv.total === "number" ? inv.total : null,
      issued_at: iso(inv.date),
      due_at: iso(inv.dueDate),
      updated_utc: iso(inv.updatedDateUTC),
      reference: inv.reference ?? null,
    }));

    const { data: upserted, error: upsertError } = await supabase
      .from("xero_invoices")
      .upsert(rows, { onConflict: "invoice_id" })
      .select("invoice_id");

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const savedCount = Array.isArray(upserted) ? upserted.length : 0;

    return NextResponse.json({
      fetched: invoices.length,
      saved: savedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
