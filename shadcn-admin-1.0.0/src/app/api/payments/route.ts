import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

const supabaseAdmin = getSupabaseAdminClient();

async function getUserId(req: Request): Promise<string | null> {
  const token =
    req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "";
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function GET(req: Request) {
  const user_id = await getUserId(req);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("id, plan_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, created_at")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payments: data });
}