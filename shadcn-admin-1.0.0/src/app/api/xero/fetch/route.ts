// src/app/api/xero/fetch/route.ts  // getContacts (minimal fields, lint-safe)
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactMinimal = {
  name: string | null;
  email: string | null;
  is_customer: boolean | null;
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("xero_contacts")
      .select("name, email, is_customer")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as ContactMinimal[];
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
