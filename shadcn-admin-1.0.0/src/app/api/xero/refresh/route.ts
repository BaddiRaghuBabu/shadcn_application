// app/api/xero/refresh/route.ts
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

function isoIn(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

type TokenRow = {
  tenant_id: string;
  access_token: string | null;
  refresh_token: string | null;
};

type XeroTokenSet = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  // allow unknown extras without using `any`
  [k: string]: unknown;
};

type XeroErrorLike = {
  status?: number;
  response?: { statusCode?: number; body?: { error_description?: string; Detail?: string } };
  body?: { error_description?: string; Detail?: string };
  message?: string;
};

type XeroWithTokenReader = {
  readTokenSet?: () => XeroTokenSet | undefined;
};

type XeroClient = {
  setTokenSet: (t: { access_token?: string; refresh_token?: string }) => void;
  refreshToken: () => Promise<unknown>;
};

function isTokenSet(v: unknown): v is XeroTokenSet {
  return typeof v === "object" && v !== null;
}

export async function POST() {
  const supabase = getSupabaseAdminClient();

  const { data: row, error: rowErr } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .single<TokenRow>();

  if (rowErr || !row) {
    return NextResponse.json(
      { error: rowErr?.message || "Not connected" },
      { status: 400 },
    );
  }
  if (!row.refresh_token) {
    return NextResponse.json(
      { error: "No refresh_token stored. Please reconnect Xero." },
      { status: 401 },
    );
  }

  try {
    const client = xero as unknown as XeroClient & XeroWithTokenReader;

    client.setTokenSet({
      // access_token can be undefined if expired; refresh flow will use refresh_token
      access_token: row.access_token ?? undefined,
      refresh_token: row.refresh_token,
    });

    const tsUnknown = await client.refreshToken();
    const ts = isTokenSet(tsUnknown) ? tsUnknown : {};

    const currentUnknown = client.readTokenSet?.();
    const current = isTokenSet(currentUnknown) ? currentUnknown : {};

    const access_token = ts.access_token ?? current.access_token;
    const refresh_token = ts.refresh_token ?? current.refresh_token;
    const expires_in = ts.expires_in ?? 1800;
    const expires_at = isoIn(typeof expires_in === "number" ? expires_in : 1800);

    if (!access_token || !refresh_token) {
      throw new Error(
        "Refresh returned no tokens. Ensure 'offline_access' scope and valid client credentials.",
      );
    }

    const { error: upErr } = await supabase
      .from("xero_tokens")
      .update({
        access_token,
        refresh_token,
        expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", row.tenant_id);

    if (upErr) {
      throw new Error(`DB update failed: ${upErr.message}`);
    }

    return NextResponse.json({ success: true, expires_at });
  } catch (err: unknown) {
    const e = err as XeroErrorLike;
    const status =
      e?.response?.statusCode ||
      e?.status ||
      (typeof e?.message === "string" && e.message.includes("invalid_client") ? 401 : 500);

    const body = e?.response?.body || e?.body;
    const hint =
      body?.error_description ||
      body?.Detail ||
      e?.message ||
      "Refresh failed";

    if (String(hint).includes("invalid_grant")) {
      return NextResponse.json(
        {
          error: "Refresh token invalid/expired (invalid_grant). Please reconnect Xero.",
          detail: hint,
        },
        { status: 401 },
      );
    }

    if (String(hint).includes("invalid_client")) {
      return NextResponse.json(
        {
          error: "Client credentials invalid. Check XERO_CLIENT_ID/SECRET.",
          detail: hint,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ error: hint }, { status });
  }
}
