// src/app/api/xero/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";
import { supabase } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.toString();
    console.log("🔁 Callback URL:", url);

    const tokenSet: any = await xero.apiCallback(url);
    console.log("✅ Token Set Received:", tokenSet);

    await xero.updateTenants();
    console.log("🏢 Tenants Updated:", xero.tenants);

    const tenantId: string | undefined = xero.tenants?.[0]?.tenantId;
    const accessToken: string | undefined = tokenSet?.access_token;
    const refreshToken: string | undefined = tokenSet?.refresh_token;

    console.log("🔐 Access Token:", accessToken);
    console.log("🔄 Refresh Token:", refreshToken);
    console.log("🏷️ Tenant ID:", tenantId);

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
    console.log("📦 Supabase Insert Result:", insertError ? insertError : "OK");

    const successUrl =
      process.env.NEXT_PUBLIC_XERO_SUCCESS_URL ?? "http://localhost:5173/success";
    return NextResponse.redirect(successUrl);
  } catch (err: any) {
    console.error("❌ Xero Auth Error:", err);
    return NextResponse.json(
      { error: `Auth failed: ${err?.message ?? String(err)}` },
      { status: 500 },
    );
  }
}
