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

  const response = await xero.accountingApi.getContacts(token.tenant_id);
  const contacts = response.body.contacts ?? [];

  if (contacts.length) {
    await supabase.from("xero_contacts").upsert(
      contacts.map((c) => ({
        tenant_id: token.tenant_id,
        contact_id: c.contactID,
        name: c.name,
        email: c.emailAddress,
        is_customer: c.isCustomer,
        is_supplier: c.isSupplier,
      })),
      { onConflict: "contact_id" }
    );
  }

  return NextResponse.json(contacts);
}