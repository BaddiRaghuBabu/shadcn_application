// src/app/api/xero/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getXeroClient, getXeroSettings } from "@/lib/xeroService";

/**
 * Robust refresh endpoint:
 * 1) Tries Xero SDK's refreshToken()
 * 2) Falls back to a direct POST to Xero's token endpoint
 * 3) Stores rotated refresh_token and new access_token in `xero_tokens`
 * 4) Returns a stable shape the UI understands: { connected, expires_at, expires_in }
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
  expires_at?: string | number;
  token_type?: string;
  scope?: string;
  [k: string]: unknown;
};

function isoIn(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getStr(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" ? v : undefined;
}
function getNum(o: Record<string, unknown>, key: string): number | undefined {
  const v = o[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : "Refresh failed";
}
function authishStatusFromMessage(msg: string): number {
  const t = msg.toLowerCase();
  if (t.includes("invalid_grant") || t.includes("unauthorized") || t.includes("expired") || t.includes("invalid_client")) {
    return 401;
  }
  return 500;
}

function isTokenSet(v: unknown): v is XeroTokenSet {
  return isObj(v);
}

async function refreshViaSdk(refresh_token: string) {
  const xero = await getXeroClient();
  xero.setTokenSet({ refresh_token });

  const tsUnknown = await xero.refreshToken();
  const curUnknown = xero.readTokenSet?.();

  const ts = isTokenSet(tsUnknown) ? tsUnknown : {};
  const cur = isTokenSet(curUnknown) ? curUnknown : {};

  const access_token = ts.access_token ?? cur.access_token;
  const rotated_refresh = ts.refresh_token ?? cur.refresh_token;
  const expires_in = typeof ts.expires_in === "number" ? ts.expires_in : 1800;

  if (!access_token || !rotated_refresh) {
    throw new Error("SDK refresh returned no tokens");
  }
  return { access_token, refresh_token: rotated_refresh, expires_in };
}

async function refreshDirect(refresh_token: string) {
  const cfg = await getXeroSettings();

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refresh_token);
  body.set("client_id", cfg.client_id);
  body.set("client_secret", cfg.client_secret);

  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // ignore parse failure; handled below
  }

  if (!res.ok) {
    let hint = `HTTP ${res.status}`;
    if (isObj(json)) {
      hint =
        getStr(json, "error_description") ??
        getStr(json, "Detail") ??
        JSON.stringify(json);
    }
    throw new Error(`Refresh ${hint}`);
  }

  const data = isObj(json) ? json : {};
  const access_token = getStr(data, "access_token");
  const rotated_refresh = getStr(data, "refresh_token");
  const expires_in = getNum(data, "expires_in") ?? 1800;

  if (!access_token || !rotated_refresh) {
    throw new Error("Refresh response missing tokens");
  }
  return { access_token, refresh_token: rotated_refresh, expires_in };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const debug = new URL(req.url).searchParams.get("debug") === "1";
  const dbg: string[] = [];

  const supabase = getSupabaseAdminClient();

  // 1) Load latest token row (if multiple exist)
  const { data: row, error: rowErr } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<TokenRow>();

  if (rowErr || !row) {
    const res = NextResponse.json(
      { error: rowErr?.message || "Not connected", ...(debug ? { debug: dbg } : {}) },
      { status: 400 },
    );
    res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
    return res;
  }
  if (!row.refresh_token) {
    const res = NextResponse.json(
      { error: "No refresh_token stored. Please reconnect Xero.", ...(debug ? { debug: dbg } : {}) },
      { status: 401 },
    );
    res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
    return res;
  }

  try {
    // 2) Try SDK first; if it throws, fall back to direct HTTP
    let refreshed: { access_token: string; refresh_token: string; expires_in: number };

    try {
      refreshed = await refreshViaSdk(row.refresh_token);
      if (debug) dbg.push("SDK refresh succeeded");
    } catch (sdkErr: unknown) {
      if (debug) dbg.push(`SDK refresh failed: ${errMsg(sdkErr)}; trying direct refresh`);
      refreshed = await refreshDirect(row.refresh_token);
      if (debug) dbg.push("Direct refresh succeeded");
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
      const res = NextResponse.json(
        { error: `DB update failed: ${upErr.message}`, ...(debug ? { debug: dbg } : {}) },
        { status: 500 },
      );
      res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
      return res;
    }

    // 4) Return stable shape
    const res = NextResponse.json(
      { connected: true, expires_at, expires_in: refreshed.expires_in, ...(debug ? { debug: dbg } : {}) },
      { status: 200 },
    );
    res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
    return res;
  } catch (err: unknown) {
    const msg = errMsg(err);
    const status = authishStatusFromMessage(msg);
    const res = NextResponse.json(
      {
        error:
          status === 401
            ? "Refresh failed: auth invalid/expired. Please reconnect Xero."
            : "Refresh failed.",
        detail: msg,
        ...(debug ? { debug: dbg } : {}),
      },
      { status },
    );
    res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
    return res;
  }
}
