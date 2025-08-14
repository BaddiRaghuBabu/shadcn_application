// src/app/api/xero/connect/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Builds the consent URL (supports dynamic scopes from query string).
 * Example: /api/xero/connect?scopes=openid%20profile%20email%20offline_access
 * `env` may be sent from the UI but is not required here.
 */
export async function GET(req: NextRequest) {
  const startedAt = new Date().toISOString();
  console.log(`[Xero Connect] ▶︎ GET /api/xero/connect at ${startedAt}`);
  console.log(`[Xero Connect] Incoming URL: ${req.url}`);

  try {
    const url = new URL(req.url);

    const scopesFromQuery = url.searchParams.get("scopes");
    const scopesFromEnv =
      process.env.XERO_SCOPES ??
      "openid profile email offline_access accounting.contacts accounting.transactions accounting.settings";

    const scopesParam = scopesFromQuery ?? scopesFromEnv;
    console.log("[Xero Connect] scopes source:", scopesFromQuery ? "query" : "env/default");
    console.log("[Xero Connect] scopes value:", scopesParam);

    // For safety, don't print secrets; just indicate presence
    const clientId = process.env.XERO_CLIENT_ID!;
    const redirectUri = process.env.XERO_REDIRECT_URI!;
    console.log("[Xero Connect] client_id present?", Boolean(clientId));
    console.log("[Xero Connect] redirect_uri:", redirectUri || "(missing!)");

    const authorize = new URL("https://login.xero.com/identity/connect/authorize");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("scope", scopesParam);
    authorize.searchParams.set("prompt", "select_account");

    console.log("[Xero Connect] Built authorize URL (encoded):", authorize.toString());
    console.log("[Xero Connect] Redirecting user to Xero authorization…");

    return NextResponse.redirect(authorize);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    console.error("[Xero Connect] ❌ Error building redirect:", msg);
    if (err instanceof Error && err.stack) {
      console.error("[Xero Connect] Stack:", err.stack);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    console.log("[Xero Connect] ◀︎ Completed handler");
  }
}
