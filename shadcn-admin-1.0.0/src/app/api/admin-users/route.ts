// /src/app/api/admin-users/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

// Supabase's User type may not include `banned_until` depending on SDK version.
// Extend it so TS stops erroring while remaining safe at runtime.
type AdminUser = User & {
  banned_until?: string | null;
};

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (data?.users ?? []).map((u) => {
      const au = u as AdminUser;

      const status =
        au.banned_until
          ? "Suspended"
          : u.email_confirmed_at
            ? "Active"
            : "Invited";

      return {
        id: u.id,
        email: u.email,
        status,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
      };
    });

    return NextResponse.json({ users });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
