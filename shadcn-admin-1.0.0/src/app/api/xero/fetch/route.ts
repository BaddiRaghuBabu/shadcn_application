import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"

export async function GET() {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("xero_contacts")
    .select("name, email, is_customer")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}