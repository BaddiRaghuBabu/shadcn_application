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

/** Fetch Xero credentials stored in Supabase */
export async function getXeroSettings(): Promise<XeroSettings> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("xero_settings")
    .select("client_id, client_secret, redirect_uri, scopes")
    .eq("id", 1)
    .maybeSingle<XeroSettings>();

  if (error || !data) {
    throw new Error(error?.message || "Xero settings not configured");
  }
  return data;
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
