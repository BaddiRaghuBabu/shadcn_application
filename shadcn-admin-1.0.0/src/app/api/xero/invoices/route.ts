import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"
import { xero, XeroInvoice,  } from "@/lib/xeroService"

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()
    const { data: tokenData, error } = await supabase
      .from("xero_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !tokenData) {
      return NextResponse.json({ error: "No token found" }, { status: 500 })
    }

    const { tenant_id, access_token } = tokenData
    const invoices = await xero.getInvoices(access_token, tenant_id)

    const rows = invoices.map((inv: XeroInvoice) => ({
      tenant_id,
      invoice_id: inv.InvoiceID,
      invoice_number: inv.InvoiceNumber,
      amount_due: inv.AmountDue,
      status: inv.Status,
    }))

    const { error: insertError } = await supabase
      .from("xero_invoices")
      .insert(rows)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ inserted: rows.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}