import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getQuickBooksSettings } from "@/lib/quickbooksService";

function clearTempCookies(res: NextResponse) {
  const opts = { path: "/", maxAge: 0 };
  res.cookies.set("qbo_oauth_state", "", opts);
  res.cookies.set("qbo_pkce_verifier", "", opts);
  res.cookies.set("qbo_client_id", "", opts);
  res.cookies.set("qbo_redirect_uri", "", opts);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/connection-xero?qb_error=${encodeURIComponent(error)}`, origin));
  }
  if (!code || !realmId) {
    return NextResponse.redirect(new URL(`/connection-xero?qb_error=missing_code`, origin));
  }

  const cookieState = req.cookies.get("qbo_oauth_state")?.value;
  if (cookieState && state && cookieState !== state) {
    return NextResponse.redirect(new URL(`/connection-xero?qb_error=state_mismatch`, origin));
  }

  const cfg = await getQuickBooksSettings();
  const clientId = req.cookies.get("qbo_client_id")?.value || cfg.client_id;
  const redirectUri = req.cookies.get("qbo_redirect_uri")?.value || cfg.redirect_uri;
  const clientSecret = cfg.client_secret;
  const codeVerifier = req.cookies.get("qbo_pkce_verifier")?.value || "";

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL(`/connection?qb_error=missing_client_config`, origin));
  }

  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
    },
    body: form.toString(),
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    const fail = NextResponse.redirect(new URL(`/connection?qb_error=${encodeURIComponent(`token_failed:${txt}`)}`, origin));
    clearTempCookies(fail);
    return fail;
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Fetch company info for display
  let companyName: string | null = null;
  try {
    const infoRes = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      companyName = info?.CompanyInfo?.CompanyName ?? null;
    }
  } catch {
    // ignore
  }

  const supabase = getSupabaseAdminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase.from("quickbooks_tokens").upsert({
    realm_id: realmId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    company_name: companyName,
    updated_at: new Date().toISOString(),
  }, { onConflict: "realm_id" });

  const ok = NextResponse.redirect(new URL(`/connection?quickbooks=1`, origin));
  clearTempCookies(ok);
  return ok;
}