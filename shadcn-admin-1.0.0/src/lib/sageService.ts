// src/lib/sageService.ts
// Utilities for loading Sage credentials from Supabase
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export type SageSettings = {
  application_url: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
};

/** Fetch Sage OAuth app settings from Supabase */
export async function getSageSettings(): Promise<SageSettings> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sage_settings")
    .select("application_url, client_id, client_secret, redirect_uri, scopes")
    .eq("id", 1)
    .maybeSingle<SageSettings>();

  if (error || !data?.client_id || !data?.redirect_uri) {
    throw new Error("Sage settings not configured");
  }
  return {
    application_url: data.application_url,
    client_id: data.client_id,
    client_secret: data.client_secret,
    redirect_uri: data.redirect_uri,
    scopes: data.scopes || [],
  };
}