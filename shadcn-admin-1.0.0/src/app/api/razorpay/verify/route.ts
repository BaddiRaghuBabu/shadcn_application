import { NextResponse } from "next/server";
import { verifySignature } from "@/lib/razorpay";
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

export async function POST(req: Request) {
  const user_id = await getUserId(req);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      failed,
    } = body;

    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    if (failed) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed" })
        .eq("id", paymentId);
      return NextResponse.json({ success: false });
    }

    const valid = verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    await supabaseAdmin
      .from("payments")
      .update({
        status: valid ? "success" : "failed",
        razorpay_payment_id: valid ? razorpay_payment_id : null,
      })
      .eq("id", paymentId);

    return NextResponse.json({ success: valid });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }