// src/app/api/xero/invoices/route.ts
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: tokenData, error } = await supabase
      .from("xero_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !tokenData) {
      return NextResponse.json({ error: "No token found in Supabase" }, { status: 400 });
    }

    const { tenant_id, access_token, refresh_token } = tokenData;

    xero.setTokenSet({ access_token, refresh_token } as any);

    const result = await xero.accountingApi.getInvoices(tenant_id);
    return NextResponse.json(result.body ?? {});
  } catch (err: any) {
    console.error("❌ Error fetching invoices:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
