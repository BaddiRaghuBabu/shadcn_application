import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getXeroSettings } from "@/lib/xeroService";

/**
 * Builds the consent URL (supports dynamic query overrides):
 *   /api/xero/connect?client_id=...&redirect_uri=...&scopes=openid%20profile%20...
 *
 * - Falls back to env if a param is missing
 * - Adds PKCE (S256) + state
 * - Stores state, PKCE verifier, and chosen client/redirect in short-lived HttpOnly cookies
 */

function mask(val?: string | null, keep = 4) {
  if (!val) return "null";
  const k = Math.min(keep, Math.floor(val.length / 2));
  return `${val.slice(0, k)}…${val.slice(-k)}`;
}
function b64url(bytes: Buffer) {
  return bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function genPkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
function randomState() {
  return b64url(crypto.randomBytes(16));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  console.log("[/api/xero/connect] START");

  try {
    const scopesFromQuery = url.searchParams.get("scopes");
    const cfg = await getXeroSettings();
    const defaultScopes =
          cfg.scopes?.join(" ") ||

      "openid profile email offline_access accounting.contacts accounting.transactions accounting.settings";
    const scopes = scopesFromQuery ?? defaultScopes;

    // client/redirect: query > env
     // client/redirect: query > db
    const clientId = url.searchParams.get("client_id") ?? cfg.client_id;
    const redirectUri = url.searchParams.get("redirect_uri") ?? cfg.redirect_uri;

    console.log("[/api/xero/connect] Using:", {
      clientId: mask(clientId),
      redirectUri: redirectUri || "null",
      scopes_preview: scopes.split(" ").slice(0, 5).join(" ") + " …",
    });

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Missing client_id or redirect_uri (query or env)" },
        { status: 400 }
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

    const res = NextResponse.redirect(authorize.toString());
    const cookie = {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      maxAge: 10 * 60, // 10 min
      path: "/",
    };

    // Save for callback
    res.cookies.set("xero_oauth_state", state, cookie);
    res.cookies.set("xero_pkce_verifier", verifier, cookie);
    res.cookies.set("xero_client_id", clientId, cookie);
    res.cookies.set("xero_redirect_uri", redirectUri, cookie);

    console.log("[/api/xero/connect] Redirecting →", authorize.toString());
    console.log("[/api/xero/connect] END");
    return res;
  } catch (err: any) {
    console.error("[/api/xero/connect] ERROR:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}
