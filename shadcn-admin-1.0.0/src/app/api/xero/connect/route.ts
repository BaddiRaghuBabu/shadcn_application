// src/app/api/xero/connect/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Builds the consent URL (supports dynamic scopes from query string).
 * Example: /api/xero/connect?scopes=openid%20profile%20email%20offline_access
 * `env` may be sent from the UI but is not required here.
 */

function mask(val?: string | null, keep = 4) {
  if (!val) return "null";
  const k = Math.min(keep, Math.floor(val.length / 2));
  return `${val.slice(0, k)}…${val.slice(-k)}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  console.log("[/api/xero/connect] START");
  console.log("[/api/xero/connect] Path:", url.pathname);
  console.log("[/api/xero/connect] Query keys:", Array.from(url.searchParams.keys()));

  try {
    const envParam = url.searchParams.get("env") ?? null;
    const scopesFromQuery = url.searchParams.get("scopes");
    console.log("[/api/xero/connect] env param:", envParam ?? "—");
    console.log("[/api/xero/connect] scopes (query):", scopesFromQuery ?? "—");

    const defaultScopes =
      process.env.XERO_SCOPES ??
      "openid profile email offline_access accounting.contacts accounting.transactions accounting.settings";
    const scopesParam = scopesFromQuery ?? defaultScopes;
    console.log("[/api/xero/connect] scopes (effective):", scopesParam);

    const clientId = process.env.XERO_CLIENT_ID;
    const redirectUri = process.env.XERO_REDIRECT_URI;

    console.log("[/api/xero/connect] Env check:", {
      XERO_CLIENT_ID: mask(clientId),
      XERO_REDIRECT_URI: redirectUri ?? "null",
      XERO_SCOPES_present: !!process.env.XERO_SCOPES,
    });

    if (!clientId || !redirectUri) {
      console.error("[/api/xero/connect] Missing required env(s).", {
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri,
      });
      return NextResponse.json(
        { error: "Missing XERO_CLIENT_ID or XERO_REDIRECT_URI" },
        { status: 500 }
      );
    }

    const authorize = new URL("https://login.xero.com/identity/connect/authorize");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("scope", scopesParam);
    authorize.searchParams.set("prompt", "select_account");

    console.log("[/api/xero/connect] Built authorize URL with params:", {
      response_type: authorize.searchParams.get("response_type"),
      client_id: mask(authorize.searchParams.get("client_id")),
      redirect_uri: authorize.searchParams.get("redirect_uri"),
      scope_preview: (authorize.searchParams.get("scope") || "").split(" ").slice(0, 5).join(" ") + " …",
      prompt: authorize.searchParams.get("prompt"),
    });

    console.log("[/api/xero/connect] Redirecting →", authorize.toString());
    console.log("[/api/xero/connect] END");
    return NextResponse.redirect(authorize);
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    console.error("[/api/xero/connect] ERROR:", {
      message: msg,
      name: err?.name ?? null,
      stack: err?.stack ?? null,
    });
    console.log("[/api/xero/connect] END (error)");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
