"use client"

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function getUserId(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function GET(req: Request) {
  const user_id = await getUserId(req);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("user_devices")
    .select(
      "device_id, user_agent, platform, ip_address, last_active, created_at"
    )
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
    const { device_id, path, user_agent } = await req
    .json()
    .catch(() => ({ device_id: null }));
  if (!device_id) {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }
    const platform = req.headers.get("sec-ch-ua-platform") || null;
  const ip_address =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    null;
    
  const { error } = await supabaseAdmin.from("user_devices").upsert(
      {
      user_id,
      device_id,
      user_agent: user_agent ?? null,
      platform,
      ip_address,
      path: path ?? null,
      last_active: new Date().toISOString(),
    },
    { onConflict: "device_id" }
  );
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
  const query = supabaseAdmin.from("user_devices").delete().eq("user_id", user_id);
  if (!all && device_id) query.eq("device_id", device_id);
  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}