// app/api/xero/status/route.ts
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export async function GET() {
  const clientConfigured = Boolean(
    process.env.XERO_CLIENT_ID &&
      process.env.XERO_CLIENT_SECRET &&
      process.env.XERO_REDIRECT_URI
  );

  const supabase = getSupabaseAdminClient();
  const { data: token } = await supabase
    .from("xero_tokens")
    // ⬇️ include expiry + timestamps so the UI can count down
    .select("tenant_id, access_token, refresh_token, expires_at, updated_at, created_at")
    .single();

  if (!token) {
    return NextResponse.json({ connected: false, clientConfigured });
  }

  xero.setTokenSet({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  });

  let tenantName: string | null = null;
  let environment: "sandbox" | "live" | undefined;

  try {
    const tenants = await xero.updateTenants();
    const tenant = tenants
      ?.sort((a, b) => {
        const aDate = new Date(a.updatedDateUtc ?? a.createdDateUtc ?? 0);
        const bDate = new Date(b.updatedDateUtc ?? b.createdDateUtc ?? 0);
        return bDate.getTime() - aDate.getTime();
      })[0];

    tenantName = tenant?.tenantName ?? null;
    const orgData = tenant?.orgData as { isDemoCompany?: boolean } | undefined;
    environment = orgData?.isDemoCompany ? "sandbox" : "live";
  } catch {
    // ignore; we can still show expiry/issued from DB
  }

  const expiresAt = token.expires_at ?? null;
  const issuedAt = token.updated_at ?? token.created_at ?? null;
  const expires_in =
    expiresAt ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)) : undefined;

  return NextResponse.json({
    connected: true,
    tenantName,
    environment,
    clientConfigured,
    // ⬇️ fields your UI normalizer looks for
    expires_at: expiresAt,
    issuedAt,               // also keep updated_at for extra compatibility if you like
    updated_at: issuedAt,
    expires_in,
  });
}
