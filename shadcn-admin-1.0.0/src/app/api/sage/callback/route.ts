import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getSageSettings } from "@/lib/sageService";

function clearTempCookies(res: NextResponse) {
  const opts: { path: string; maxAge: number } = { path: "/", maxAge: 0 };
  res.cookies.set("sage_oauth_state", "", opts);
  res.cookies.set("sage_pkce_verifier", "", opts);
  res.cookies.set("sage_client_id", "", opts);
  res.cookies.set("sage_redirect_uri", "", opts);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/connection?platform=sage&error=${encodeURIComponent(error)}`, origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`/connection?platform=sage&error=missing_code`, origin));
  }

  // Validate anti-CSRF state if set
  const cookieState = req.cookies.get("sage_oauth_state")?.value;
  if (cookieState && state && cookieState !== state) {
    return NextResponse.redirect(new URL(`/connection?platform=sage&error=state_mismatch`, origin));
  }

  // Load config (cookies first, Supabase fallback)
  const cfg = await getSageSettings();
  const clientId = req.cookies.get("sage_client_id")?.value || cfg.client_id;
  const redirectUri = req.cookies.get("sage_redirect_uri")?.value || cfg.redirect_uri;
  const clientSecret = cfg.client_secret;
  const codeVerifier = req.cookies.get("sage_pkce_verifier")?.value || "";

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL(`/connection?platform=sage&error=missing_client_config`, origin));
  }

  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  });
  if (clientSecret) form.set("client_secret", clientSecret);
  if (codeVerifier) form.set("code_verifier", codeVerifier);

  const tokenRes = await fetch("https://oauth.accounting.sage.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form,
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    const fail = NextResponse.redirect(
      new URL(`/connection?platform=sage&error=${encodeURIComponent(`token_exchange_failed: ${txt}`)}`, origin)
    );
    clearTempCookies(fail);
    return fail;
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const supabase = getSupabaseAdminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase.from("sage_tokens").upsert({
    id: 1,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  const ok = NextResponse.redirect(new URL(`/connection?connected=sage`, origin));
  clearTempCookies(ok);
  return ok;
}