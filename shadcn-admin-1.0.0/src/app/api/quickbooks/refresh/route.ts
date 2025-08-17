import { NextRequest, NextResponse } from "next/server"
import { getQuickBooksSettings } from "@/lib/quickbooksService"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"

function errMsg(e: unknown): string {
  return e instanceof Error
    ? e.message
    : typeof e === "string"
      ? e
      : "Refresh failed"}

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseAdminClient()
  const { data: row, error: rowErr } = await supabase
    .from("quickbooks_tokens")
    .select("realm_id, refresh_token, company_name")
    .maybeSingle()

  if (rowErr || !row) {
    return NextResponse.json(
      { error: rowErr?.message || "Not connected" },
      { status: 400 }
    )  }

  try {
        const cfg = await getQuickBooksSettings()
    const form = new URLSearchParams()
    form.set("grant_type", "refresh_token")
    form.set("refresh_token", row.refresh_token)
    const basic = Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString(
      "base64"
    )
    const res = await fetch(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
          Accept: "application/json",
        },
        body: form.toString(),
      }
    )
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`HTTP ${res.status}: ${txt}`)
    }
    const data = (await res.json()) as {
        access_token: string
      refresh_token: string
      expires_in: number
    }
    const expires_at = new Date(
      Date.now() + data.expires_in * 1000
    ).toISOString()
    const updatedAt = new Date().toISOString()

    await supabase
      .from("quickbooks_tokens")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at,
        updated_at: updatedAt,
      })
      .eq("realm_id", row.realm_id);
    const tenantName = row.realm_id
      ? `${row.realm_id}${row.company_name ? `: ${row.company_name}` : ""}`
      : (row.company_name ?? null)
    return NextResponse.json({
      connected: true,
      tenantName,
      realm_id: row.realm_id,
      expires_at,
      issuedAt: updatedAt,
      updated_at: updatedAt,
      expires_in: data.expires_in,
    })
    } catch (e: unknown) {
      return NextResponse.json({ error: errMsg(e) }, { status: 500 })
  }
}