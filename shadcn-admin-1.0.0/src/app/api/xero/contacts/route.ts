/* eslint-disable no-console */
// app/api/xero/contacts/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { xero } from "@/lib/xeroService";

function iso(d?: string | null): string | null {
  if (!d) return null;
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  } catch {
    return null;
  }
}

type XeroContactSubset = {
  contactID?: string | null;
  name?: string | null;
  emailAddress?: string | null;
  isCustomer?: boolean | null;
  isSupplier?: boolean | null;
  updatedDateUTC?: string | null;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    console.log("[Xero] Starting GET /api/xero/contacts");

    const { data: token, error: tokenError } = await supabase
      .from("xero_tokens")
      .select("tenant_id, access_token, refresh_token")
      .single();

    if (tokenError) {
      console.error("[Xero] Error fetching token:", tokenError);
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }
    if (!token) {
      console.warn("[Xero] No token found");
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    console.log("[Xero] Tenant:", token.tenant_id);
    console.log("[Xero] Access token present?", Boolean(token.access_token));

    xero.setTokenSet({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
    });

    console.log("[Xero] Calling accountingApi.getContacts…");
    const res = await xero.accountingApi.getContacts(token.tenant_id);
    const contacts = (res?.body?.contacts ?? []) as XeroContactSubset[];

    console.log(`[Xero] Contacts received: ${contacts.length}`);
    if (contacts.length > 0) {
      console.log("[Xero] First contact sample:", {
        contactID: contacts[0]?.contactID,
        name: contacts[0]?.name,
        emailAddress: contacts[0]?.emailAddress,
      });
    }

    if (contacts.length === 0) {
      console.log("[Xero->Supabase] No contacts to save. Skipping upsert.");
      return NextResponse.json({ fetched: 0, saved: 0 });
    }

    console.log("[Xero->Supabase] Mapping contacts for upsert…");
    const rows = contacts.map((c) => ({
      tenant_id: token.tenant_id,
      contact_id: c.contactID ?? null,
      name: c.name ?? null,
      email: c.emailAddress ?? null,
      is_customer: c.isCustomer ?? null,
      is_supplier: c.isSupplier ?? null,
      updated_utc: iso(c.updatedDateUTC),
    }));

    console.log(
      `[Xero->Supabase] Upserting ${rows.length} contact(s) into 'xero_contacts'…`,
    );

    const { data: upserted, error: upsertError } = await supabase
      .from("xero_contacts")
      .upsert(rows, { onConflict: "tenant_id,contact_id" }) // <— key change
      .select("contact_id");

    if (upsertError) {
      console.error("[Xero->Supabase] Upsert failed:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const savedCount = Array.isArray(upserted) ? upserted.length : 0;
    console.log(
      `[Xero->Supabase] ✅ Successfully saved ${savedCount} contact(s) to Supabase.`,
    );
    if (savedCount > 0 && upserted?.[0]?.contact_id) {
      console.log(
        "[Xero->Supabase] Example saved contact_id:",
        upserted[0].contact_id,
      );
    }

    return NextResponse.json({
      fetched: contacts.length,
      saved: savedCount,
    });
  } catch (err: unknown) {
    console.error("[Xero] GET /api/xero/contacts failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
