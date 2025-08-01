// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Public client (safe for browser)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (ONLY use this on the server; do NOT expose the service role key to clients)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  // You can choose to throw here or only instantiate when needed server-side.
 
}

// It's okay to lazy-create the admin client to avoid using it on the client bundle.
export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin client");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
