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

const profileSchema = z.object({
  username: z.string().min(2).max(30),
  name: z.string().min(2).max(30),
  dob: z.string().optional(),
  language: z.string().optional(),
})

export async function GET(req: Request) {
  const user_id = await getUserId(req)
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("username, name, dob, language")
    .eq("user_id", user_id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

export async function PUT(req: Request) {
  const user_id = await getUserId(req)
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => ({}))
  const parsed = profileSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.errors },
      { status: 400 }
    )
  }

  const { username, name, dob, language } = parsed.data
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        user_id,
        username,
        name,
        dob,
        language,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("username, name, dob, language")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
