
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

// BAN user 

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const json = await req.json().catch(() => ({}));
    const ids: unknown = (json as { ids?: unknown }).ids;
    const bannedUntilRaw: unknown = (json as { bannedUntil?: unknown }).bannedUntil

    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 },
      );
    }

        let banDuration: string | undefined;
    if (typeof bannedUntilRaw === "string") {
      const untilMs = Date.parse(bannedUntilRaw);
      if (!Number.isNaN(untilMs)) {
        const diffSec = Math.ceil((untilMs - Date.now()) / 1000);
        if (diffSec > 0) {
          banDuration = `${diffSec}s`;
        }
      }
    }

    const updates = await Promise.all(
      ids.map((id) =>
        supabaseAdmin.auth.admin.updateUserById(
          id,
          { ban_duration: banDuration ?? "8760h" } as Record<string, unknown>,
        ),
      ),
    );

    const errors = updates
      .map((r, i) => (r.error ? { id: ids[i] as string, message: r.error.message } : null))
      .filter((r): r is { id: string; message: string } => r !== null);

    if (errors.length) {
      return NextResponse.json({ error: errors }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
