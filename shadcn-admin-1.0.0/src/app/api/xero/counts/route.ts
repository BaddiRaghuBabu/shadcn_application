import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getXeroClient } from "@/lib/xeroService";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data: token, error: tokenError } = await supabase
      .from("xero_tokens")
      .select("tenant_id, access_token, refresh_token")
      .single();

    if (tokenError || !token) {
      return NextResponse.json(
        { error: tokenError?.message || "Not connected" },
        { status: 401 },
      );
    }

    const xero = await getXeroClient();
    xero.setTokenSet({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
    });

    const [invRes, contactRes] = await Promise.all([
      xero.accountingApi.getInvoices(token.tenant_id),
      xero.accountingApi.getContacts(token.tenant_id),
    ]);

    const invoices = invRes?.body?.invoices ?? [];
    const contacts = contactRes?.body?.contacts ?? [];

    return NextResponse.json({
      invoices: invoices.length,
      contacts: contacts.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}