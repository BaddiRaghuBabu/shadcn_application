"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "./use-require-auth";

/** Ensure the current user has an admin role. Redirects to /403 otherwise. */
export function useRequireAdmin() {
  // First make sure the user is authenticated
  useRequireAuth();

  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const role = session?.user.user_metadata?.role;
      if (role !== "admin" && role !== "superadmin") {
        router.replace("/403");
      }
    };

    void checkRole();
  }, [router]);
}