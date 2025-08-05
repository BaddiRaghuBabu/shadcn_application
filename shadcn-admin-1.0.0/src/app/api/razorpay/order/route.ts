import { NextResponse } from "next/server";
import { createOrder } from "@/lib/razorpay";
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
    const { plan_id, amount, currency = "INR", name, address, phone } = body;
    if (!plan_id || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await createOrder(amount, currency);

    const { data, error } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id,
        plan_id,
        amount,
        currency,
        full_name: name,
        address,
        phone,
        status: "pending",
        razorpay_order_id: order.id,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      order,
      paymentId: data.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
