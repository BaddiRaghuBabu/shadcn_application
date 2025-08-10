import { xero } from "@/lib/xeroService"
import { NextResponse } from "next/server"

export async function GET() {
  const consentUrl = await xero.buildConsentUrl()
  return NextResponse.redirect(consentUrl)
}