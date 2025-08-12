// /app/api/xero/invoices/route.ts
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

function iso(d?: string | null): string | null {
  if (!d) return null;
  try {
    // Xero usually returns ISO-like strings already; normalize just in case
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    console.log("[Xero] Starting GET /api/xero/invoices");

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

    console.log("[Xero] Calling accountingApi.getInvoices…");
    const res = await xero.accountingApi.getInvoices(token.tenant_id);

    const invoices = res?.body?.invoices ?? [];
    console.log(`[Xero] Invoices received: ${invoices.length}`);
    if (invoices.length > 0) {
      console.log("[Xero] First invoice sample:", {
        invoiceID: invoices[0]?.invoiceID,
        invoiceNumber: invoices[0]?.invoiceNumber,
        amountDue: invoices[0]?.amountDue,
        status: invoices[0]?.status,
      });
    }

    if (invoices.length === 0) {
      console.log("[Xero->Supabase] No invoices to save. Skipping upsert.");
      return NextResponse.json({ fetched: 0, saved: 0 });
    }

    console.log("[Xero->Supabase] Mapping invoices for upsert…");
    const rows = invoices.map((inv: any) => ({
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

    console.log(
      `[Xero->Supabase] Upserting ${rows.length} invoice(s) into 'xero_invoices'…`,
    );

    const { data: upserted, error: upsertError } = await supabase
      .from("xero_invoices")
      .upsert(rows, { onConflict: "invoice_id" })
      .select("invoice_id");

    if (upsertError) {
      console.error("[Xero->Supabase] Upsert failed:", upsertError);
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 },
      );
    }

    const savedCount = upserted?.length ?? 0;
    console.log(
      `[Xero->Supabase] ✅ Successfully saved ${savedCount} invoice(s) to Supabase.`,
    );
    if (savedCount > 0) {
      console.log("[Xero->Supabase] Example saved invoice_id:", upserted[0].invoice_id);
    }

    return NextResponse.json({
      fetched: invoices.length,
      saved: savedCount,
    });
  } catch (err) {
    console.error("[Xero] GET /api/xero/invoices failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
