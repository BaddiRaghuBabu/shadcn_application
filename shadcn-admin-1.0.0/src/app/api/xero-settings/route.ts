import { z } from "zod"
import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"

const supabaseAdmin = getSupabaseAdminClient()

async function getUserId(req: Request): Promise<string | null> {
  const token =
    req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || ""
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

const schema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  redirect_uri: z.string().url(),
  scopes: z.array(z.string().min(1)),
  is_active: z.boolean().optional().default(true),
})

export async function GET(req: Request) {
  const user_id = await getUserId(req)
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("user_xero_settings")
    .select("client_id, client_secret, redirect_uri, scopes, is_active")
    .eq("user_id", user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}

export async function POST(req: Request) {
  const user_id = await getUserId(req)
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.errors },
      { status: 400 }
    )
  }

  const { client_id, client_secret, redirect_uri, scopes, is_active } = parsed.data

  if (is_active) {
    await supabaseAdmin
      .from("user_xero_settings")
      .update({ is_active: false })
      .eq("user_id", user_id)
  }

  const { data, error } = await supabaseAdmin
    .from("user_xero_settings")
    .upsert(
      {
        user_id,
        client_id,
        client_secret,
        redirect_uri,
        scopes,
        is_active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,environment" }
    )
    .select("environment, client_id, redirect_uri, scopes, is_active")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ setting: data })
}

