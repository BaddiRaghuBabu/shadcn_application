import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"
import { xero } from "@/lib/xeroService"

export async function GET() {
  const supabase = getSupabaseAdminClient()
  const { data: token } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token")
    .single()

  if (!token) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 })
  }

  xero.setTokenSet({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  })

  try {
    const res = await xero.accountingApi.getOrganisations(token.tenant_id)
    const org = res?.body?.organisations?.[0]
    const name = org?.name ?? "unknown organisation"
    return NextResponse.json({ message: `Access to ${name} successful` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}