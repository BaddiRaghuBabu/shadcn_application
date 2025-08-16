// src/app/api/xero/disconnect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getXeroClient } from "@/lib/xeroService";

type DebugLine = string;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : "Unexpected error";
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const dbg: DebugLine[] = [];
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  const supabase = getSupabaseAdminClient();
  const xero = await getXeroClient();

  // 1) Fetch stored tokens
  const { data: token, error: tokenErr } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .single();

  if (tokenErr) {
    dbg.push(`read xero_tokens error: ${errMsg(tokenErr)}`);
  }

  if (!token) {
    const res = NextResponse.json({ error: "Not connected", ...(debug ? { debug: dbg } : {}) }, { status: 400 });
    res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
    return res;
  }

  dbg.push(
    `loaded tenant=${token.tenant_id}, access=${Boolean(token.access_token)}, refresh=${Boolean(token.refresh_token)}`,
  );

  // 2) Prime SDK with tokenSet
  try {
    xero.setTokenSet({
      access_token: token.access_token as string,
      refresh_token: token.refresh_token as string,
    });
    dbg.push("setTokenSet OK");
  } catch (e: unknown) {
    dbg.push(`setTokenSet failed: ${errMsg(e)}`);
  }

  // 3) Try disconnecting tenant
  try {
    dbg.push(`disconnecting tenant ${token.tenant_id}…`);
    await xero.disconnect(token.tenant_id as string);
    dbg.push(`disconnect OK for tenant ${token.tenant_id}`);
  } catch (e: unknown) {
    dbg.push(`disconnect failed (continuing): ${errMsg(e)}`);
  }

  // 4) Try revoking token
  try {
    dbg.push("revoking token…");
    await xero.revokeToken();
    dbg.push("revoke token OK");
  } catch (e: unknown) {
    dbg.push(`revoke token failed (continuing): ${errMsg(e)}`);
  }

  // 5) Remove from DB
  let deletedCount = 0;
  try {
    const { data: delRows, error: delErr } = await supabase
      .from("xero_tokens")
      .delete()
      .eq("tenant_id", token.tenant_id as string)
      .select("tenant_id"); // return deleted rows for introspection

    if (delErr) {
      dbg.push(`DB delete failed: ${errMsg(delErr)}`);
    } else {
      deletedCount = Array.isArray(delRows) ? delRows.length : 0;
      dbg.push(`DB delete OK: removed ${deletedCount} row(s) for tenant ${token.tenant_id}`);
    }
  } catch (e: unknown) {
    dbg.push(`unexpected DB delete error: ${errMsg(e)}`);
  }

  const res = NextResponse.json(
    { success: true, removed: deletedCount, ...(debug ? { debug: dbg } : {}) },
    { status: 200 },
  );
  res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
  return res;
}
