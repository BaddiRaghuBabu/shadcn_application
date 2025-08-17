import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getQuickBooksSettings } from "@/lib/quickbooksService";

export async function GET() {
  let clientConfigured = false;
  try {
    const cfg = await getQuickBooksSettings();
    clientConfigured = Boolean(cfg.client_id && cfg.client_secret && cfg.redirect_uri);
  } catch {
    clientConfigured = false;
  }

  const supabase = getSupabaseAdminClient();
  const { data: token } = await supabase
    .from("quickbooks_tokens")
    .select("realm_id, access_token, refresh_token, expires_at, company_name, updated_at, created_at")
    .single();

  if (!token) {
    return NextResponse.json({ connected: false, clientConfigured });
  }

  const expiresAt = token.expires_at ?? null;
  const issuedAt = token.updated_at ?? token.created_at ?? null;
const expires_in = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : undefined;

  const tenantName = token.realm_id
    ? `${token.realm_id}${token.company_name ? `: ${token.company_name}` : ""}`
    : token.company_name ?? null;

  return NextResponse.json({
    connected: true,
    tenantName,
    realm_id: token.realm_id,    
    clientConfigured,
    expires_at: expiresAt,
    issuedAt,
    updated_at: issuedAt,
    expires_in,
  });
}