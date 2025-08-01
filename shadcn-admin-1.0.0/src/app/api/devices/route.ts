// app/api/devices/route.ts
"use client";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type JsonBody = {
  device_id?: string;
};

export async function POST(req: Request) {
  // Extract and validate Bearer token
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
  }

  // Get user from Supabase
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(token);

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Parse body
  const body: JsonBody = await req.json().catch(() => ({}));
  const device_id = body.device_id;
  if (!device_id || typeof device_id !== "string") {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? null;

  // Payload
  const payload = {
    user_id: user.id,
    device_id,
    user_agent: userAgent,
    ip,
    last_seen: new Date().toISOString(),
  };

  // Upsert device (composite conflict key as comma-separated string)
  const { data, error: upsertErr } = await supabase
    .from("user_devices")
    .upsert(payload, {
      onConflict: "user_id,device_id",
    })
    .select("*");

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    // succeeded but no row returned
    return NextResponse.json({ success: true });
  }

  // If array, take the first; otherwise return as-is
  const device = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ success: true, device });
}
