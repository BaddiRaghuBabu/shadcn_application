// src/app/api/xero/contacts/route.ts  // Fetch & Save Contacts (lint-safe)
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseTokenRow = {
  tenant_id: string;
  access_token: string;
  refresh_token?: string | null;
};

type TokenSetLike = {
  access_token: string;
  refresh_token?: string | null;
};

type XeroContact = {
  contactID: string;
  name?: string | null;
  emailAddress?: string | null;
  isCustomer?: boolean | null;
  isSupplier?: boolean | null;
};

export async function GET() {
  try {
    const { data: tokenData, error } = await supabase
      .from("xero_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SupabaseTokenRow>();

    if (error || !tokenData) {
      return NextResponse.json({ error: "No token found in Supabase" }, { status: 400 });
    }

    const { tenant_id, access_token, refresh_token } = tokenData;

    const tokenInput: TokenSetLike = { access_token, refresh_token: refresh_token ?? undefined };
    xero.setTokenSet(tokenInput as unknown as TokenSetLike);

    const contactsResponse = await xero.accountingApi.getContacts(tenant_id);
    const contacts = (contactsResponse.body?.contacts ?? []) as XeroContact[];

    const rows = contacts.map((contact: XeroContact) => ({
      tenant_id,
      contact_id: contact.contactID,
      name: contact.name ?? null,
      email: contact.emailAddress ?? null,
      is_customer: contact.isCustomer ?? null,
      is_supplier: contact.isSupplier ?? null,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("xero_contacts").insert(rows);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: "Contacts saved to Supabase",
      count: rows.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
