// hooks/use-require-auth.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useRef(false);

  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const wait = useCallback((ms: number) => new Promise((r) => setTimeout(r, ms)), []);

  const verifySession = useCallback(
    async (attempt = 1): Promise<void> => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!currentSession) {
          if (pathname !== "/login") router.replace("/login");
          setSession(null);
          return;
        }

        setSession(currentSession);
        if (pathname === "/login") {
          router.replace("/dashboard");
        }
      } catch (_err) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * 2 ** (attempt - 1);
          await wait(delay);
          return verifySession(attempt + 1);
        }
        if (pathname !== "/login") router.replace("/login");
        setSession(null);
      }
    },
    [pathname, router, wait]
  );

  useEffect(() => {
    let active = true;
    isMounted.current = true;

    (async () => {
      await verifySession();
      if (active) {
        setChecked(true);
        setIsLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted.current) return;

      if (event === "SIGNED_OUT" || !newSession) {
        if (pathname !== "/login") router.replace("/login");
        setSession(null);
        return;
      }

      setSession(newSession);
      if (pathname === "/login") {
        router.replace("/dashboard");
      }
    });

    return () => {
      active = false;
      isMounted.current = false;
      listener?.subscription.unsubscribe();
    };
  }, [router, pathname, verifySession]);

  // fallback global logout via logout_signals table
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    const channel = supabase
      .channel(`logout-signal-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "logout_signals",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // forced logout
          void supabase.auth.signOut();
          router.replace("/login");
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session, router]);

  return { checked, isLoading, session };
}
