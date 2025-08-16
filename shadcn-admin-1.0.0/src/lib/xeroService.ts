// src/lib/xeroService.ts
// Utilities for loading Xero credentials from Supabase and creating a client
import { XeroClient } from "xero-node";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export type XeroSettings = {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  application_url: string;
  scopes: string[];
};

/**
 * Fetch Xero credentials.
 *
 * Reads credentials from the Supabase `xero_settings` table (id=1).
 */
export async function getXeroSettings(): Promise<XeroSettings> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("xero_settings")
    .select("client_id, client_secret, redirect_uri, application_url, scopes")
    .eq("id", 1)
    .maybeSingle<XeroSettings>();

 

  if (!data?.client_id || !data?.redirect_uri || !data?.application_url) {
      throw new Error("Xero settings not configured");
  }
  return {
    client_id: data.client_id,
    client_secret: data.client_secret,
    redirect_uri: data.redirect_uri,
    application_url: data.application_url,
    scopes: data.scopes || [],
  };
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
