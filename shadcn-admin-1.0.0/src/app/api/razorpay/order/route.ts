import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getPlan, PlanType } from "@/app/(dashboard)/settings/plans/data/data";
import { createOrder } from "@/lib/razorpay";

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
  const planLabel = json.plan as PlanType;
  const plan = getPlan.get(planLabel);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const amount = Math.round(plan.price * 100); // amount in paise
  const order = await createOrder(amount, "INR");

  await supabaseAdmin.from("payments").insert({
    user_id,
    plan_id: plan.label,
    amount,
    currency: "INR",
    razorpay_order_id: order.id,
    status: "pending",
  });

  return NextResponse.json({
    orderId: order.id,
    amount,
    currency: "INR",
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}