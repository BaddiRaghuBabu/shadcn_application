// src/lib/user-role.ts
import { supabase } from "@/lib/supabaseClient"

export type UserRole = "default" | "admin"

/**
 * Fetch the role for the given user.
 * Returns "default" if no role is found or an error occurs.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", userId)
    .single()

  if (error || !data?.role) {
    return "default"
  }

  return data.role as UserRole
}