// src/hooks/use-require-auth.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useRef(false);

  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const verifySession = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (!currentSession) {
      if (pathname !== "/login") router.replace("/login");
      setSession(null);
    } else {
      setSession(currentSession);
      if (pathname === "/login") router.replace("/dashboard");
    }
  }, [pathname, router]);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      await verifySession();
      if (isMounted.current) {
        setChecked(true);
        setIsLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted.current) return;
      if (event === "SIGNED_OUT" || !newSession) {
        router.replace("/login");
        setSession(null);
      } else if (newSession) {
        setSession(newSession);
        if (pathname === "/login") router.replace("/dashboard");
      }
    });

    return () => {
      isMounted.current = false;
      listener?.subscription.unsubscribe();
    };
  }, [router, pathname, verifySession]);

  // forced global logout via broadcast
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const channel = supabase
      .channel(`logout-user-${userId}`)
      .on(
        "broadcast",
        { event: "force-logout" },
        () => {
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
