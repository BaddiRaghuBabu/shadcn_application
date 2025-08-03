import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

export async function POST(req: Request) {
  const { user_id, refresh_token, device_id } = await req.json()

  const { data: existing, error } = await supabaseAdmin
    .from("user_sessions")
    .select("refresh_token, device_id")
    .eq("user_id", user_id)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (existing && existing.device_id !== device_id) {
    await supabaseAdmin.auth.admin.signOut(existing.refresh_token)
  }

  await supabaseAdmin
    .from("user_sessions")
    .upsert({ user_id, refresh_token, device_id })

  return NextResponse.json({ success: true })
}