// src/app/api/xero/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getXeroSettings } from "@/lib/xeroService";

/**
 * Builds the consent URL (supports dynamic query overrides):
 *   /api/xero/connect?client_id=...&redirect_uri=...&scopes=openid%20profile%20...
 *
 * - Falls back to DB/env if a param is missing
 * - Adds PKCE (S256) + state
 * - Stores state, PKCE verifier, and chosen client/redirect in short-lived HttpOnly cookies
 */

function mask(val?: string | null, keep = 4) {
  if (!val) return "null";
  const k = Math.min(keep, Math.floor(val.length / 2));
  return `${val.slice(0, k)}…${val.slice(-k)}`;
}
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
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : "Unexpected error";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  try {
    // Read config (DB/env) with query overrides
    const scopesFromQuery = url.searchParams.get("scopes");
    const cfg = await getXeroSettings();

    const defaultScopes =
      cfg.scopes?.join(" ") ??
      "openid profile email offline_access accounting.contacts accounting.transactions accounting.settings";
    const scopes = scopesFromQuery ?? defaultScopes;

    // client/redirect: query > DB/env
    const clientId = url.searchParams.get("client_id") ?? cfg.client_id ?? "";
    const redirectUri = url.searchParams.get("redirect_uri") ?? cfg.redirect_uri ?? "";

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        {
          error:
            "Missing client_id or redirect_uri (provide via query or configure in DB/env)",
          details: {
            clientId: mask(clientId || null),
            redirectUri: redirectUri ? "provided" : "null",
            scopes_preview: scopes.split(" ").slice(0, 5).join(" ") + " …",
          },
        },
        { status: 400 },
      );
    }

    // PKCE + state
    const { verifier, challenge } = genPkce();
    const state = randomState();

    // Build Xero authorize URL
    const authorize = new URL("https://login.xero.com/identity/connect/authorize");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("scope", scopes);
    authorize.searchParams.set("prompt", "select_account");
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set("code_challenge_method", "S256");

    // Prepare redirect + cookies for callback
    const res = NextResponse.redirect(authorize.toString());
    const cookie = {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      maxAge: 10 * 60, // 10 min
      path: "/",
    };

    res.cookies.set("xero_oauth_state", state, cookie);
    res.cookies.set("xero_pkce_verifier", verifier, cookie);
    res.cookies.set("xero_client_id", clientId, cookie);
    res.cookies.set("xero_redirect_uri", redirectUri, cookie);

    // Optional: surface minimal debug via headers (no console -> no lint errors)
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
