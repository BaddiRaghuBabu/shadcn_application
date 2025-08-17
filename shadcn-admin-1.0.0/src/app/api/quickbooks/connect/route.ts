// src/app/api/quickbooks/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getQuickBooksSettings } from "@/lib/quickbooksService";

function b64url(bytes: Buffer) {
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function genPkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
function randomState() {
  return b64url(crypto.randomBytes(16));
}
function mask(val?: string | null, keep = 4) {
  if (!val) return "null";
  const k = Math.min(keep, Math.floor(val.length / 2));
  return `${val.slice(0, k)}…${val.slice(-k)}`;
}
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : "Unexpected error";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  try {
    const scopesFromQuery = url.searchParams.get("scopes");
    const cfg = await getQuickBooksSettings();
    const defaultScopes = cfg.scopes?.join(" ") || "com.intuit.quickbooks.accounting";
    const scopes = scopesFromQuery || defaultScopes;

    const clientId = url.searchParams.get("client_id") || cfg.client_id || "";
    const redirectUri = url.searchParams.get("redirect_uri") || cfg.redirect_uri || "";
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        {
          error: "Missing client_id or redirect_uri",
          details: { clientId: mask(clientId || null), redirectUri: redirectUri ? "provided" : "null", scopes },
        },
        { status: 400 }
      );
    }

    const { verifier, challenge } = genPkce();
    const state = randomState();

    const authorize = new URL("https://appcenter.intuit.com/connect/oauth2");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("scope", scopes);
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set("code_challenge_method", "S256");

    const res = NextResponse.redirect(authorize.toString());
    const cookie = {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      maxAge: 10 * 60,
      path: "/",
    };
    res.cookies.set("qbo_oauth_state", state, cookie);
    res.cookies.set("qbo_pkce_verifier", verifier, cookie);
    res.cookies.set("qbo_client_id", clientId, cookie);
    res.cookies.set("qbo_redirect_uri", redirectUri, cookie);
    if (url.searchParams.get("debug") === "1") {
      res.headers.set("x-debug-client", mask(clientId));
      res.headers.set("x-debug-redirect-host", new URL(redirectUri).host);
      res.headers.set("x-debug-scopes", scopes.split(" ").slice(0, 5).join(" ") + " …");
    }
    return res;
  } catch (e: unknown) {
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}