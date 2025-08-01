// app/api/devices/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// helper to extract user ID from bearer token
async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

// Schema for POST body
const postSchema = z.object({
  device_id: z.string().min(1),
  path: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const user_id = await getUserId(req);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_devices")
    .select("device_id, user_agent, platform, ip_address, last_active, created_at")
    .eq("user_id", user_id)
    .order("last_active", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ devices: data });
}

export async function POST(req: Request) {
  const user_id = await getUserId(req);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parseResult = postSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid payload", details: parseResult.error.errors }, { status: 400 });
  }
  const { device_id, path, user_agent } = parseResult.data;

  const platform = req.headers.get("sec-ch-ua-platform") || null;
  const ip_address =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    null;

  const upsertObj = {
    user_id,
    device_id,
    user_agent,
    platform,
    ip_address,
    path,
    last_active: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("user_devices")
    .upsert(upsertObj, { onConflict: "device_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const user_id = await getUserId(req);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const all = body.all === true;
  const device_id = typeof body.device_id === "string" ? body.device_id : null;

  if (!all && !device_id) {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  let query = supabaseAdmin.from("user_devices").delete().eq("user_id", user_id);
  if (!all && device_id) {
    query = query.eq("device_id", device_id);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
