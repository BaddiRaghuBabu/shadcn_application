import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"
import { xero } from "@/lib/xeroService"

export async function GET(req: NextRequest) {
  try {
    const tokenSet = await xero.apiCallback(req.url)
    const connections = await xero.getConnections(tokenSet.access_token)
    const tenantId = connections[0]?.tenantId

    const supabase = getSupabaseAdminClient()
    await supabase.from("xero_tokens").insert({
      tenant_id: tenantId,
      access_token: tokenSet.access_token,
      refresh_token: tokenSet.refresh_token,
    })

    return NextResponse.redirect(new URL("/xero/success", req.url))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}