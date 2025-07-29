import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ✅ Use NEXT_PUBLIC_‑prefixed vars so they work on both client & server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;


export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
