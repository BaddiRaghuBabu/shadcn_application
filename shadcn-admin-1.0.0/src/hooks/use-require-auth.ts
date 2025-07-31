/* hooks/use-require-auth.ts
   Redirect unauthenticated users to /login
   (client hook, safe in Next.js app dir)
------------------------------------------------------------------*/
"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();          // e.g. /dashboard or /login
  const isMounted = useRef(false);         // ✅ prefer-const satisfied

  useEffect(() => {
    const ensure = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      // Not signed in → always go to /login
      if (!session && pathname !== "/login") {
        router.replace("/login");
      }
    };

    void ensure();                         // initial check
    isMounted.current = true;

    /* listen for future auth changes */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, _sess) => {
      if (isMounted.current) {
        void ensure();                     // explicit call, no lint error
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);
}
