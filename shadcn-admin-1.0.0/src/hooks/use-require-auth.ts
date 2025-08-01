// hooks/use-require-auth.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // base delay

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useRef(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    isMounted.current = true;

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const verifySession = async (attempt = 1): Promise<void> => {
      if (!active) return;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (pathname !== "/login") router.replace("/login");
          return;
        }

        if (pathname === "/login") {
          router.replace("/dashboard");
        }
        return;
      } catch (_err) {
        if (attempt >= MAX_RETRIES) {
          if (pathname !== "/login") router.replace("/login");
          return;
        }
        const delay = RETRY_DELAY_MS * 2 ** (attempt - 1);
        await wait(delay);
        return verifySession(attempt + 1);
      }
    };

    void verifySession();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted.current) return;
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
        return;
      }
      if (session && pathname === "/login") {
        router.replace("/dashboard");
      }
    });

    setChecked(true);

    return () => {
      active = false;
      isMounted.current = false;
      data?.subscription.unsubscribe?.();
    };
  }, [router, pathname]);

  return { checked };
}
