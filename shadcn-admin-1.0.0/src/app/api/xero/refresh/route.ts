import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export async function POST() {
  const supabase = getSupabaseAdminClient();
  const { data: token } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .single();

  if (!token) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  xero.setTokenSet({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  });

  try {
    const refreshed = await xero.refreshToken();
    await supabase
      .from("xero_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? token.refresh_token,
      })
      .eq("tenant_id", token.tenant_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
