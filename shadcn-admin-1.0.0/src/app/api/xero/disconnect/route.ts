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
    await xero.disconnect(token.tenant_id);
  } catch {
    // ignore
  }

  try {
    await xero.revokeToken();
  } catch {
    // ignore
  }

  await supabase.from("xero_tokens").delete().eq("tenant_id", token.tenant_id);

  return NextResponse.json({ success: true });
}
