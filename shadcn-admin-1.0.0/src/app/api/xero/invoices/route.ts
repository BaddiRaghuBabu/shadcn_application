// src/app/api/xero/invoices/route.ts  // lint-safe: no console, no `any`
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TokenRow = {
  tenant_id: string;
  access_token: string;
  refresh_token?: string | null;
};

export async function GET() {
  try {
    const { data: tokenData, error } = await supabase
      .from("xero_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<TokenRow>();

    if (error || !tokenData) {
      return NextResponse.json({ error: "No token found in Supabase" }, { status: 400 });
    }

    const { tenant_id, access_token, refresh_token } = tokenData;

    // Provide token to Xero client without using `any`
    const tokenInput: { access_token: string; refresh_token?: string } = {
      access_token,
      refresh_token: refresh_token ?? undefined,
    };
    (xero as unknown as { setTokenSet: (t: unknown) => void }).setTokenSet(tokenInput);

    const result = await xero.accountingApi.getInvoices(tenant_id);
    return NextResponse.json(result.body ?? {});
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
