import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getXeroSettings } from "@/lib/xeroService";

/**
 * Manual token exchange callback (with PKCE support):
 * - Validates state (if present)
 * - Reads client_id/redirect from cookies (set by /connect) or env
 * - Exchanges code for tokens (+code_verifier if present)
 * - Calls /connections to pick a tenant
 * - TODO: persist tokens/tenant
 * - Redirects to /connection-xero
 */

function clearTempCookies(res: NextResponse) {
 const opts: { path: string; maxAge: number } = { path: "/", maxAge: 0 };
  res.cookies.set("xero_oauth_state", "", opts);
  res.cookies.set("xero_pkce_verifier", "", opts);
  res.cookies.set("xero_client_id", "", opts);
  res.cookies.set("xero_redirect_uri", "", opts);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin =req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/connection-xero?error=${encodeURIComponent(error)}`, origin)
    );  }
  if (!code) {
    return NextResponse.redirect(
      new URL(`/connection-xero?error=missing_code`, origin)
    );  }

  // Validate anti-CSRF state if set
  const cookieState = req.cookies.get("xero_oauth_state")?.value;
  if (cookieState && state && cookieState !== state) {
    return NextResponse.redirect(
      new URL(`/connection-xero?error=state_mismatch`, origin)
    );  }

  // Load config (cookies first, Supabase fallback)
  const cfg = await getXeroSettings();
  const clientId = req.cookies.get("xero_client_id")?.value || cfg.client_id;
  const redirectUri = req.cookies.get("xero_redirect_uri")?.value || cfg.redirect_uri;
  const clientSecret = cfg.client_secret; // confidential web app only
  const codeVerifier = req.cookies.get("xero_pkce_verifier")?.value || ""; // PKCE

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL(`/connection-xero?error=missing_client_config`, origin)
    );  }

  // Exchange the code → tokens
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  });
  if (clientSecret) form.set("client_secret", clientSecret);
  if (codeVerifier) form.set("code_verifier", codeVerifier);

  const tokenRes = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form,
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    const fail = NextResponse.redirect(
      new URL(
        `/connection-xero?error=${encodeURIComponent(`token_exchange_failed: ${txt}`)}`,
        origin
      )
    );
    clearTempCookies(fail);
    return fail;
  }

  const tokens = await tokenRes.json() as {
    access_token: string; refresh_token?: string; expires_in: number;
  };

  // Discover tenant(s)
  const connRes = await fetch("https://api.xero.com/connections", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!connRes.ok) {
    const txt = await connRes.text();
    const fail = NextResponse.redirect(
      new URL(
        `/connection-xero?error=${encodeURIComponent(`connections_failed: ${txt}`)}`,
        origin
      )
    ); 
    clearTempCookies(fail);
    return fail;
  }
  const conns = await connRes.json() as Array<{
    tenantId: string; tenantName?: string; createdDateUtc?: string; updatedDateUtc?: string;
  }>;
  const chosen = conns.sort((a, b) =>
    new Date(b.updatedDateUtc ?? b.createdDateUtc ?? 0).getTime()
    - new Date(a.updatedDateUtc ?? a.createdDateUtc ?? 0).getTime()
  )[0];

  if (!chosen?.tenantId) {
    const noTenant = NextResponse.redirect(
      new URL(`/connection-xero?error=no_tenant_found`, origin)
    );
    clearTempCookies(noTenant);
    return noTenant;
  }
  // Persist tokens + tenant ID in Supabase
  const supabase = getSupabaseAdminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase
    .from("xero_tokens")
    .upsert({
      tenant_id: chosen.tenantId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });
    
  const ok = NextResponse.redirect(
    new URL(`/connection-xero?connected=1`, origin)
  );
  clearTempCookies(ok);
  return ok;
}
