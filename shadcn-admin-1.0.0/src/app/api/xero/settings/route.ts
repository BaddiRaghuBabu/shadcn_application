import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getXeroSettings } from "@/lib/xeroService";

// GET returns non-sensitive settings for the UI
export async function GET() {
  try {
    const cfg = await getXeroSettings();
    return NextResponse.json({
      clientId: cfg.client_id,
      clientSecret: cfg.client_secret,
      redirectUri: cfg.redirect_uri,
      scopes: cfg.scopes.join(" "),
      hasClientSecret: !!cfg.client_secret,
    });
  } catch {
    return NextResponse.json({
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      scopes: "",
      hasClientSecret: false,
    });
  }
}

// POST stores settings; clientSecret is optional (omit to keep existing)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getSupabaseAdminClient();

  const updates: Record<string, unknown> = {
    id: 1,
    client_id: body.clientId,
    redirect_uri: body.redirectUri,
    scopes: String(body.scopes || "").split(" ").filter(Boolean),
    updated_at: new Date().toISOString(),
  };
  if (body.clientSecret) {
    updates.client_secret = body.clientSecret;
  }

  const { error } = await supabase.from("xero_settings").upsert(updates);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, hasClientSecret: !!updates.client_secret });
}