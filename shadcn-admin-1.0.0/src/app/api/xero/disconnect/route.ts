// src/app/api/xero/disconnect/route.ts
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export async function POST() {
  const TAG = "[Xero] Disconnect";
  const startedAt = Date.now();
  console.log(`${TAG} → POST /api/xero/disconnect started`);

  const supabase = getSupabaseAdminClient();

  // 1) Fetch stored tokens
  const { data: token, error: tokenErr } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .single();

  if (tokenErr) {
    console.error(`${TAG} Failed to read xero_tokens:`, tokenErr);
  }

  if (!token) {
    console.warn(`${TAG} No token found. Not connected.`);
    console.log(`${TAG} ← finished in ${Date.now() - startedAt}ms`);
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  console.log(
    `${TAG} Loaded token for tenant: ${token.tenant_id}. ` +
      `access_token? ${Boolean(token.access_token)} refresh_token? ${Boolean(token.refresh_token)}`
  );

  // 2) Prime SDK with tokenSet
  try {
    xero.setTokenSet({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
    });
    console.log(`${TAG} setTokenSet OK`);
  } catch (e) {
    console.error(`${TAG} setTokenSet failed:`, e);
  }

  // 3) Try disconnecting tenant
  try {
    console.log(`${TAG} Disconnecting tenant ${token.tenant_id}…`);
    await xero.disconnect(token.tenant_id);
    console.log(`${TAG} Disconnect OK for tenant ${token.tenant_id}`);
  } catch (e) {
    console.error(`${TAG} Disconnect failed (will continue):`, e);
  }

  // 4) Try revoking token
  try {
    console.log(`${TAG} Revoking token…`);
    await xero.revokeToken();
    console.log(`${TAG} Revoke token OK`);
  } catch (e) {
    console.error(`${TAG} Revoke token failed (will continue):`, e);
  }

  // 5) Remove from DB
  try {
    const { data: delRows, error: delErr } = await supabase
      .from("xero_tokens")
      .delete()
      .eq("tenant_id", token.tenant_id)
      .select("tenant_id"); // return deleted rows for logging

    if (delErr) {
      console.error(`${TAG} DB delete failed:`, delErr);
    } else {
      console.log(
        `${TAG} DB delete OK. Removed ${Array.isArray(delRows) ? delRows.length : 0} row(s) for tenant ${token.tenant_id}`
      );
    }
  } catch (e) {
    console.error(`${TAG} Unexpected error while deleting DB row:`, e);
  }

  console.log(`${TAG} ← finished in ${Date.now() - startedAt}ms`);
  return NextResponse.json({ success: true });
}
