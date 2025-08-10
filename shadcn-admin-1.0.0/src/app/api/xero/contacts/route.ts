import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"
import { xero, XeroContact } from "@/lib/xeroService"

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
    const contacts = await xero.getContacts(access_token, tenant_id)

    const rows = contacts.map((contact: XeroContact) => ({
      tenant_id,
      contact_id: contact.ContactID,
      name: contact.Name,
      email: contact.EmailAddress || null,
      is_customer: contact.IsCustomer,
      is_supplier: contact.IsSupplier,
    }))

    const { error: insertError } = await supabase
      .from("xero_contacts")
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