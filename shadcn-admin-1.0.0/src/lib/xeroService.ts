// src/lib/xeroService.ts
// Utilities for loading Xero credentials from Supabase and creating a client
import { XeroClient } from "xero-node";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export type XeroSettings = {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
};

/**
 * Fetch Xero credentials.
 *
 * Prefers environment variables and falls back to the Supabase row
 * (`xero_settings` table, id=1). This allows deploys to override a
 * previously stored redirect URI like `https://0.0.0.0:10000/...`.
 */
export async function getXeroSettings(): Promise<XeroSettings> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("xero_settings")
    .select("client_id, client_secret, redirect_uri, scopes")
    .eq("id", 1)
    .maybeSingle<XeroSettings>();

 const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const envCfg: Partial<XeroSettings> = {
    client_id: process.env.XERO_CLIENT_ID,
    client_secret: process.env.XERO_CLIENT_SECRET,
    redirect_uri:
      process.env.XERO_REDIRECT_URI ||
      (siteUrl ? `${siteUrl}/connection-xero` : undefined),
    scopes: process.env.XERO_SCOPES?.split(/\s+/).filter(Boolean),
  };

  const cfg: XeroSettings = {
    client_id: envCfg.client_id || data?.client_id || "",
    client_secret: envCfg.client_secret || data?.client_secret || "",
    redirect_uri: envCfg.redirect_uri || data?.redirect_uri || "",
    scopes: envCfg.scopes || data?.scopes || [],
  };

  if (!cfg.client_id || !cfg.redirect_uri) {
    throw new Error("Xero settings not configured");
  }
  return cfg;
}

/** Create a XeroClient using credentials from Supabase */
export async function getXeroClient() {
  const cfg = await getXeroSettings();
  return new XeroClient({
    clientId: cfg.client_id,
    clientSecret: cfg.client_secret,
    redirectUris: [cfg.redirect_uri],
    scopes: cfg.scopes,
  });
}
