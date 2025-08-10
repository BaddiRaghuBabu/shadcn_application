// src/app/api/xero/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Local minimal token type (avoid importing from "openid-client")
type TokenSetLike = {
  access_token?: string;
  refresh_token?: string;
};

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.toString();

    const tokenSet = (await xero.apiCallback(url)) as TokenSetLike;

    await xero.updateTenants();

    const tenantId: string | undefined = xero.tenants?.[0]?.tenantId;
    const accessToken: string | undefined = tokenSet.access_token;
    const refreshToken: string | undefined = tokenSet.refresh_token;

    if (!tenantId || !accessToken) {
      return NextResponse.json(
        { error: "Missing tenant or token from Xero" },
        { status: 400 },
      );
    }

    const { error: insertError } = await supabase.from("xero_tokens").insert([
      {
        tenant_id: tenantId,
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
      },
    ]);
    if (insertError) {
      return NextResponse.json(
        { error: `Supabase insert failed: ${insertError.message}` },
        { status: 500 },
      );
    }

    const successUrl =
      process.env.NEXT_PUBLIC_XERO_SUCCESS_URL ?? "http://localhost:5173/success";
    return NextResponse.redirect(successUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auth failed";
    return NextResponse.json({ error: `Auth failed: ${message}` }, { status: 500 });
  }
}
