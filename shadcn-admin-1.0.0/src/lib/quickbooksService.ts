// src/lib/quickbooksService.ts
// Utilities for loading QuickBooks credentials from Supabase
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export type QuickBooksSettings = {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
};

/** Fetch QuickBooks credentials from Supabase */
export async function getQuickBooksSettings(): Promise<QuickBooksSettings> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("quickbooks_settings")
    .select("client_id, client_secret, redirect_uri, scopes")
    .eq("id", 1)
    .maybeSingle<QuickBooksSettings>();

  if (error || !data?.client_id || !data?.redirect_uri) {
    throw new Error("QuickBooks settings not configured");
  }
  return {
    client_id: data.client_id,
    client_secret: data.client_secret,
    redirect_uri: data.redirect_uri,
    scopes: data.scopes || [],
  };
}