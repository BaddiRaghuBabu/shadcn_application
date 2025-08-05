"use client";

import Script from "next/script";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay: new (
      options: Record<string, unknown>
    ) => { open: () => void };
  }
}

interface Props {
  plan: string;
  amount: number;
}

export default function RazorpayButton({ plan, amount }: Props) {

  async function handlePay() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const orderRes = await fetch("/api/razorpay/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ plan, amount }),
    });
    const order = await orderRes.json();

    const options = {
      key: order.key,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      handler: async (
        response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }
      ) => {
        await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(response),
        });
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Button type="button" onClick={handlePay} className="mt-4">
        Pay with Razorpay
      </Button>
    </>
  );
}