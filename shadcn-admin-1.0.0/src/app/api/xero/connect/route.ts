import { NextResponse } from "next/server";
import { xero } from "@/lib/xeroService";

// Redirects user to Xero authorization endpoint
// https://login.xero.com/identity/connect/authorize
export async function GET() {
  const consentUrl = await xero.buildConsentUrl();
  return NextResponse.redirect(consentUrl);
}