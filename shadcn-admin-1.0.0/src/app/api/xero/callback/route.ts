// src/app/api/xero/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

/**
 * OAuth2 callback:
 * - Exchanges code for tokens
 * - Finds first tenant (organisation)
 * - Upserts { tenant_id, access_token, refresh_token } into `xero_tokens`
 * - Redirects back to /xero?connected=1
 */
export async function GET(req: NextRequest) {
  try {
    // Exchange authorization code for tokens
    const tokenSet = await xero.apiCallback(req.url);
    xero.setTokenSet(tokenSet);

    // Determine tenant ID - pick the most recently authorized tenant
    const tenants = await xero.updateTenants();
  const tenantId = tenants
      ?.sort((a, b) => {
        const aDate = new Date(a.updatedDateUtc ?? a.createdDateUtc ?? 0);
        const bDate = new Date(b.updatedDateUtc ?? b.createdDateUtc ?? 0);
        return bDate.getTime() - aDate.getTime();
      })[0]?.tenantId;

    if (!tenantId) {
      return NextResponse.redirect(
        new URL("/connection-xero?error=no_tenant_found", req.url)
      );
    }

    // Persist tokens
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("xero_tokens")
      .upsert(
        {
          tenant_id: tenantId,
          access_token: tokenSet.access_token!,
          refresh_token: tokenSet.refresh_token!,
        },
        { onConflict: "tenant_id" }
      );

    if (error) {
      return NextResponse.redirect(
        new URL(`/connection-xero?error=save_failed`, req.url)
      );
    }

    // Success
    return NextResponse.redirect(new URL("/connection-xero?connected=1", req.url));
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/connection-xero?error=${encodeURIComponent(detail)}`, req.url)
    );
  }
}

