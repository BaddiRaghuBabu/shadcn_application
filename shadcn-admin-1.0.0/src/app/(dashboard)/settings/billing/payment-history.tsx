"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Payment {
  id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/payments", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      setPayments(json.payments || []);
    }
    load();
  }, []);

  if (!payments.length) {
    return <p className="mt-4 text-sm">No payments yet.</p>;
  }

  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr>
          <th className="text-left">Plan</th>
          <th className="text-left">Amount</th>
          <th className="text-left">Status</th>
          <th className="text-left">Date</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id}>
            <td>{p.plan_id}</td>
            <td>{(p.amount / 100).toFixed(2)} {p.currency}</td>
            <td>{p.status}</td>
            <td>{new Date(p.created_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}