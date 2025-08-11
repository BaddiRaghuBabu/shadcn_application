// src/app/api/xero/connect/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Builds the consent URL (supports dynamic scopes from query string).
 * Example: /api/xero/connect?scopes=openid%20profile%20email%20offline_access
 * `env` may be sent from the UI but is not required here.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const scopesParam =
      url.searchParams.get("scopes") ??
      (process.env.XERO_SCOPES ??
        "openid profile email offline_access accounting.contacts accounting.transactions accounting.settings");

    const authorize = new URL("https://login.xero.com/identity/connect/authorize");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", process.env.XERO_CLIENT_ID!);
    authorize.searchParams.set("redirect_uri", process.env.XERO_REDIRECT_URI!);
    authorize.searchParams.set("scope", scopesParam);

    return NextResponse.redirect(authorize);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
