import { NextRequest, NextResponse } from "next/server"
import { getQuickBooksSettings } from "@/lib/quickbooksService"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseAdminClient()
  const { data: token, error } = await supabase
    .from("quickbooks_tokens")
    .select("realm_id, refresh_token")
    .maybeSingle()
  if (error || !token) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 })
  }

  try {
    const cfg = await getQuickBooksSettings()
    const basic = Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString(
      "base64"
    )
    await fetch("https://developer.api.intuit.com/v2/oauth2/tokens/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({ token: token.refresh_token }),
    })
  } catch {
    // ignore revoke failure
  }

  await supabase
    .from("quickbooks_tokens")
    .delete()
    .eq("realm_id", token.realm_id)
  return NextResponse.json({ success: true })
}