// app/api/xero/refresh/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { xero } from "@/lib/xeroService";

/**
 * Robust refresh endpoint:
 * 1) Tries Xero SDK's refreshToken()
 * 2) Falls back to a direct POST to Xero's token endpoint (handles SDK/version quirks)
 * 3) Stores rotated refresh_token and new access_token in `xero_tokens`
 * 4) Returns a stable shape the UI understands: { expires_at } (+expires_in for countdown)
 */

type TokenRow = {
  tenant_id: string;
  access_token: string | null;
  refresh_token: string | null;
};

type XeroTokenSet = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: string;
  token_type?: string;
  scope?: string;
  [k: string]: unknown;
};

function isoIn(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isTokenSet(v: unknown): v is XeroTokenSet {
  return !!v && typeof v === "object";
}

async function refreshViaSdk(refresh_token: string) {
  // Some xero-node versions keep the token set internally
  // and expose refreshToken() + readTokenSet()
  // We seed it with the refresh_token we have.
  
  xero.setTokenSet({ refresh_token });

  try {
    const tsUnknown = await xero.refreshToken();
    const curUnknown = xero.readTokenSet?.();

    const ts = (isTokenSet(tsUnknown) ? tsUnknown : {}) as XeroTokenSet;
    const cur = (isTokenSet(curUnknown) ? curUnknown : {}) as XeroTokenSet;

    const access_token = ts.access_token ?? cur.access_token;
    const rotated_refresh = ts.refresh_token ?? cur.refresh_token;
    const expires_in = typeof ts.expires_in === "number" ? ts.expires_in : 1800;

    if (!access_token || !rotated_refresh) {
      throw new Error("SDK refresh returned no tokens");
    }
    return { access_token, refresh_token: rotated_refresh, expires_in };
  } catch (e) {
    // Surface for fallback
    throw e;
  }
}

async function refreshDirect(refresh_token: string) {
  const cid = process.env.XERO_CLIENT_ID;
  const secret = process.env.XERO_CLIENT_SECRET;
  if (!cid || !secret) {
    throw new Error("XERO_CLIENT_ID / XERO_CLIENT_SECRET missing");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refresh_token);
  body.set("client_id", cid);
  body.set("client_secret", secret);

  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json()) as XeroTokenSet;

  if (!res.ok) {
    const hint =
      (json && (json as any).error_description) ||
      (json && (json as any).Detail) ||
      JSON.stringify(json);
    throw new Error(`Refresh HTTP ${res.status}: ${hint}`);
  }

  const access_token = json.access_token;
  const rotated_refresh = json.refresh_token;
  const expires_in = typeof json.expires_in === "number" ? json.expires_in : 1800;

  if (!access_token || !rotated_refresh) {
    throw new Error("Refresh response missing tokens");
  }
  return { access_token, refresh_token: rotated_refresh, expires_in };
}

export async function POST() {
  const supabase = getSupabaseAdminClient();

  // 1) Load latest token row (in case multiple exist)
  const { data: row, error: rowErr } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single<TokenRow>();

  if (rowErr || !row) {
    console.error("[Xero Refresh] DB read failed:", rowErr);
    return NextResponse.json(
      { error: rowErr?.message || "Not connected" },
      { status: 400 }
    );
  }
  if (!row.refresh_token) {
    return NextResponse.json(
      { error: "No refresh_token stored. Please reconnect Xero." },
      { status: 401 }
    );
  }

  try {
    console.log("[Xero Refresh] Starting refresh for tenant:", row.tenant_id);

    // 2) Try SDK first; if it throws, fall back to direct HTTP
    let refreshed: { access_token: string; refresh_token: string; expires_in: number };

    try {
      refreshed = await refreshViaSdk(row.refresh_token);
      console.log("[Xero Refresh] SDK refresh succeeded");
    } catch (sdkErr) {
      console.warn("[Xero Refresh] SDK refresh failed, falling back:", (sdkErr as Error)?.message);
      refreshed = await refreshDirect(row.refresh_token);
      console.log("[Xero Refresh] Direct refresh succeeded");
    }

    const expires_at = isoIn(refreshed.expires_in);

    // 3) Persist new tokens
    const { error: upErr } = await supabase
      .from("xero_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token, // Xero rotates refresh tokens!
        expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", row.tenant_id);

    if (upErr) {
      console.error("[Xero Refresh] DB update failed:", upErr);
      return NextResponse.json(
        { error: `DB update failed: ${upErr.message}` },
        { status: 500 }
      );
    }

    console.log("[Xero Refresh] Saved new tokens. Expires at", expires_at);

    // 4) Return a shape the UI normalizer understands
    return NextResponse.json({
      connected: true,
      expires_at,
      expires_in: refreshed.expires_in,
    });
  } catch (err: any) {
    const msg = err?.message || "Refresh failed";
    console.error("[Xero Refresh] Error:", msg, err?.response?.body || err);
    // Map common auth errors to 401 for clearer UI
    const text = String(msg);
    const status =
      text.includes("invalid_grant") || text.includes("expired") || text.includes("unauthorized")
        ? 401
        : text.includes("invalid_client")
        ? 401
        : 500;

    return NextResponse.json(
      {
        error:
          status === 401
            ? "Refresh failed: auth invalid/expired. Please reconnect Xero."
            : "Refresh failed. See server logs.",
        detail: msg,
      },
      { status }
    );
  }
}
