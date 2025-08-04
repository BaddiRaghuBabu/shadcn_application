import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { verifySignature } from "@/lib/razorpay";

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

export async function POST(req: Request) {
  const user_id = await getUserId(req);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = json;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const verified = verifySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  await supabaseAdmin
    .from("payments")
    .update({
      status: verified ? "success" : "failed",
      razorpay_payment_id,
    })
    .eq("user_id", user_id)
    .eq("razorpay_order_id", razorpay_order_id);

  return NextResponse.json({ verified });
}