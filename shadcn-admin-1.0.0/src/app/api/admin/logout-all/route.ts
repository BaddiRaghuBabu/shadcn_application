// src/app/api/admin/logout-all/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type InvalidateRefreshFn = {
  invalidateUserRefreshTokens?: (userId: string) => Promise<{ error: { message?: string } | null }>;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const user_id = typeof body.user_id === "string" ? body.user_id : null;
  if (!user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  // Invalidate all refresh tokens (global logout), if available
  const adminWithOptional: InvalidateRefreshFn = supabaseAdmin.auth.admin as unknown as InvalidateRefreshFn;

  if (typeof adminWithOptional.invalidateUserRefreshTokens === "function") {
    const { error: invalidateErr } = await adminWithOptional.invalidateUserRefreshTokens(user_id);
    if (invalidateErr) {
      return NextResponse.json(
        { error: invalidateErr.message ?? "Failed to invalidate tokens" },
        { status: 500 }
      );
    }
  }

  // Emit a logout signal so clients subscribed to logout_signals can react
  const { error: signalErr } = await supabaseAdmin.from("user_devices").insert({ user_id });

  if (signalErr) {
    return NextResponse.json({ error: signalErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}