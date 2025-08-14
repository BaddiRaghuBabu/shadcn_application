import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"
import { xero } from "@/lib/xeroService"

function maskToken(t?: string | null, keep = 4) {
  if (!t) return "null"
  const k = Math.min(keep, Math.floor(t.length / 2))
  return `${t.slice(0, k)}…${t.slice(-k)}`
}

export async function GET() {
  console.log("[/api/xero/ping] START")

  const supabase = getSupabaseAdminClient()
  console.log("[/api/xero/ping] Fetching token from xero_tokens…")

  const { data: token, error: tokenErr } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (tokenErr) {
    console.error("[/api/xero/ping] Token query error:", tokenErr)
  }

  console.log("[/api/xero/ping] Token present?", !!token)
  if (token) {
    console.log("[/api/xero/ping] Token details:", {
      tenant_id: token.tenant_id,
      created_at: (token as any).created_at ?? null,
      access_token: maskToken(token.access_token),
      refresh_token: maskToken(token.refresh_token),
    })
  }

  if (!token) {
    console.warn("[/api/xero/ping] No token found → 401 Not connected")
    return NextResponse.json({ error: "Not connected" }, { status: 401 })
  }

  console.log("[/api/xero/ping] Setting token set on Xero SDK…")
  xero.setTokenSet({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  })

  try {
    console.log("[/api/xero/ping] Calling Xero accountingApi.getOrganisations for tenant:", token.tenant_id)
    const res = await xero.accountingApi.getOrganisations(token.tenant_id)
    const orgs = res?.body?.organisations ?? []
    console.log("[/api/xero/ping] Organisations returned:", orgs.length)

    const org = orgs[0]
    if (org) {
      console.log("[/api/xero/ping] First org:", {
        name: org.name,
        legalName: org.legalName,
        organisationID: org.organisationID,
      })
    } else {
      console.log("[/api/xero/ping] No organisations found in response")
    }

    const name = org?.name ?? "unknown organisation"
    console.log("[/api/xero/ping] SUCCESS: Access to", name, "successful")
    return NextResponse.json({ message: `Access to ${name} successful` })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const statusCode = err?.statusCode ?? err?.response?.statusCode ?? 500
    const problem = err?.response?.body ?? null
    console.error("[/api/xero/ping] ERROR:", { message, statusCode, problem })
    return NextResponse.json({ error: message, statusCode, problem }, { status: statusCode })
  }
}
