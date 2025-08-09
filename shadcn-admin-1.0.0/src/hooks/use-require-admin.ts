"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "./use-require-auth";
import { getUserRole } from "@/lib/user-role";


/** Ensure the current user has an admin role. Redirects to /403 otherwise. */
export function useRequireAdmin() {
  // First make sure the user is authenticated
  useRequireAuth();

  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/403");
        return;
      }

      const role = await getUserRole(user.id);
      if (role !== "admin") {
        router.replace("/403");
      }
    };

    void checkRole();
  }, [router]);
}