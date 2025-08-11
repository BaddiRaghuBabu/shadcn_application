import { NextRequest, NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

// Handles OAuth callback and exchanges code for tokens at
// https://identity.xero.com/connect/token
export async function GET(req: NextRequest) {
  const tokenSet = await xero.apiCallback(req.url);
  xero.setTokenSet(tokenSet);

  const tenants = await xero.updateTenants();
  const tenantId = tenants[0]?.tenantId;

  if (tenantId) {
    const supabase = getSupabaseAdminClient();
    await supabase.from("xero_tokens").upsert(
      {
        tenant_id: tenantId,
        access_token: tokenSet.access_token!,
        refresh_token: tokenSet.refresh_token!,
      },
      { onConflict: "tenant_id" }
    );
  }

  return NextResponse.redirect("/settings/xero");
}