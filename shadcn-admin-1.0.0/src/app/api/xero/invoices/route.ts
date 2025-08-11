import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data: token } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .single();

  if (!token) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  xero.setTokenSet({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  });

  const response = await xero.accountingApi.getInvoices(token.tenant_id);
  const invoices = response.body.invoices ?? [];

  if (invoices.length) {
    await supabase.from("xero_invoices").upsert(
      invoices.map((inv) => ({
        tenant_id: token.tenant_id,
        invoice_id: inv.invoiceID,
        invoice_number: inv.invoiceNumber,
        amount_due: inv.amountDue,
        status: inv.status,
      })),
      { onConflict: "invoice_id" }
    );
  }

  return NextResponse.json(invoices);
}