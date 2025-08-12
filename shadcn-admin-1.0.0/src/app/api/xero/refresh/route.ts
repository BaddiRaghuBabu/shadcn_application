// app/api/xero/refresh/route.ts
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

function isoIn(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function POST() {
  const supabase = getSupabaseAdminClient();

  const { data: row, error: rowErr } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .single();

  if (rowErr || !row) {
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
    xero.setTokenSet({
      access_token: row.access_token,
      refresh_token: row.refresh_token,
    } as any);

    const ts: any = await xero.refreshToken();
    const current: any = (xero as any).readTokenSet?.() ?? ts;

    const access_token = ts?.access_token ?? current?.access_token;
    const refresh_token = ts?.refresh_token ?? current?.refresh_token;
    const expires_in = ts?.expires_in ?? current?.expires_in ?? 1800;
    const expires_at = isoIn(expires_in);

    if (!access_token || !refresh_token) {
      throw new Error(
        "Refresh returned no tokens. Ensure 'offline_access' scope and valid client credentials."
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

    if (upErr) throw new Error(`DB update failed: ${upErr.message}`);

    return NextResponse.json({ success: true, expires_at });
  } catch (err: any) {
    const status = err?.response?.statusCode || err?.status || 500;
    const body = err?.response?.body || err?.body;
    const hint =
      body?.error_description || body?.Detail || err?.message || "Refresh failed";

    if (String(hint).includes("invalid_grant")) {
      return NextResponse.json(
        {
          error: "Refresh token invalid/expired (invalid_grant). Please reconnect Xero.",
          detail: hint,
        },
        { status: 401 }
      );
    }
    if (String(hint).includes("invalid_client")) {
      return NextResponse.json(
        {
          error: "Client credentials invalid. Check XERO_CLIENT_ID/SECRET.",
          detail: hint,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: hint }, { status });
  }
}
