"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { UserRole } from "@/lib/user-role"

/**
 * React hook to retrieve the current user's role.
 */
export function useUserRole() {
  const [role, setRole] = useState<UserRole>("default")

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .single()

      if (!error && data?.role) {
        setRole(data.role as UserRole)
      }
    })()
  }, [])

  return role
}