// src/app/api/xero/contacts/route.ts   // Fetch & Save Contacts
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: tokenData, error } = await supabaseAdmin
      .from("xero_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !tokenData) {
      throw new Error("No token found in Supabase");
    }

    const { tenant_id, access_token, refresh_token } = tokenData;

    console.log("🟢 Accessing tenant:", tenant_id);

    xero.setTokenSet({ access_token, refresh_token } as any);

    const contactsResponse = await xero.accountingApi.getContacts(tenant_id);
    const contacts = contactsResponse.body?.contacts ?? [];

    console.log(`📦 ${contacts.length} contacts fetched from Xero`);

    const rows = contacts.map((contact: any) => ({
      tenant_id,
      contact_id: contact.contactID,
      name: contact.name ?? null,
      email: contact.emailAddress ?? null,
      is_customer: contact.isCustomer ?? null,
      is_supplier: contact.isSupplier ?? null,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("xero_contacts")
        .insert(rows);
      if (insertError) throw insertError;
    }

    console.log("✅ Contacts saved to Supabase");
    return NextResponse.json({
      message: "✅ Contacts saved to Supabase",
      count: rows.length,
    });
  } catch (err: any) {
    console.error("❌ Failed to fetch or insert contacts:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
