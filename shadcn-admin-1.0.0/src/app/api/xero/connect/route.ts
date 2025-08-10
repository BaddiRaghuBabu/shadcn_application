// src/app/api/xero/connect/route.ts
import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const consentUrl = await xero.buildConsentUrl();
  return NextResponse.redirect(consentUrl);
}
