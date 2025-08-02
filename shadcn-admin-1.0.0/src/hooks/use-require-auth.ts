// src/hooks/use-require-auth.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOrSetDeviceId } from "@/lib/device";
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
      if (pathname !== "/login") {
        router.replace("/login");
      }
      setSession(null);
    } else {
      setSession(currentSession);
      if (pathname === "/login") {
        router.replace("/dashboard");
      }
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

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted.current) return;

      if (event === "SIGNED_OUT" || !newSession) {
        if (pathname !== "/login") {
          router.replace("/login");
        }
        setSession(null);
      } else {
        setSession(newSession);
        if (pathname === "/login") {
          router.replace("/dashboard");
        }
      }
    });

    return () => {
      isMounted.current = false;
      authSubscription?.unsubscribe();
    };
  }, [router, pathname, verifySession]);

  // forced global logout via broadcast (optionally targeted by device)
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    type ForceLogoutPayload = { device_id?: string } | null;

    // cast to any to bypass restrictive typings for .on("broadcast", ...)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel: any = supabase.channel(`logout-user-${userId}`);

    channel
      .on(
        "broadcast",
        { event: "force-logout" },
        (payload: ForceLogoutPayload) => {
          const currentDevice = getOrSetDeviceId();
          if (!payload?.device_id || payload.device_id === currentDevice) {
            void supabase.auth.signOut();
            router.replace("/login");
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session, router]);

  return { checked, isLoading, session };
}
