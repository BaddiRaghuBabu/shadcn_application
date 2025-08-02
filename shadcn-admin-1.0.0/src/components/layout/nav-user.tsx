// components/layout/nav-user.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  Power,
  PowerOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getOrSetDeviceId, clearDeviceId } from "@/lib/device";
import { supabase } from "@/lib/supabaseClient";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Props {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

// simple fallback device icon SVG
function SimpleDeviceIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-label="device"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={16}
      height={16}
      {...props}
    >
      <rect x="3" y="4" width="18" height="14" rx="2" ry="2" />
      <path d="M8 20h8" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  );
}

export function NavUser({ user }: Props) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [loadingScope, setLoadingScope] = useState<"local" | "global" | null>(null);
  const [sessionValid, setSessionValid] = useState(true);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  // keep session fresh / detect expired session
  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!currentSession && !cancelled) {
          setSessionValid(false);
          router.replace("/login");
        }
      } catch (_err) {
        toast.error("Connection to auth backend unstable. Retrying...");
      }
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  const fetchDeviceCount = useCallback(async () => {
    setCountLoading(true);
    try {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      const token = current?.access_token;
      if (!token) {
        return;
      }
      const res = await fetch("/api/device-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setDeviceCount(json.device_count);
                // if all devices have been removed (e.g., global logout from another
        // device), immediately clear the local session and redirect the user
        if (json.device_count === 0) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/login");
        }
      }
    } catch {
      // intentionally ignored
    } finally {
      setCountLoading(false);
    }
    }, [router]);


  useEffect(() => {
    void fetchDeviceCount();
      // subscribe to device list changes so the count stays current and we can
    // react to remote logouts in real time
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`device-count-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_devices", filter: `user_id=eq.${user.id}` },
          () => {
            void fetchDeviceCount();
          }
        )
        .subscribe();
    })();
    return () => {
      channel?.unsubscribe();
    };
  }, [fetchDeviceCount]);


  const logout = async (scope: "local" | "global") => {
    if (loadingScope) {
      return;
    }
      if (scope === "global" && !confirm("Log out from all devices?")) {
      return;
    }
    setLoadingScope(scope);
    try {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      const token = current?.access_token;

      const body = scope === "local" ? { device_id: getOrSetDeviceId() } : { all: true };

      if (token) {
        const res = await fetch("/api/devices", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          toast.error("Unable to unregister device. Try again.");
          setLoadingScope(null);
          return;
        }
      }

      const { error } = await supabase.auth.signOut(scope === "local" ? { scope: "local" } : undefined);
      if (error) {
        toast.error(error.message);
        setLoadingScope(null);
        return;
      }

      if (scope === "local") {
        clearDeviceId();
      }

      toast.success(scope === "local" ? "Logged out on this device" : "Logged out on all devices");
      router.replace("/login");
    } catch (_err) {
      toast.error("Unexpected error during logout");
    } finally {
      setLoadingScope(null);
    }
  };

  if (!sessionValid) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="ml-2 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">SN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <BadgeCheck className="mr-2 size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing">
                  <CreditCard className="mr-2 size-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/notifications">
                  <Bell className="mr-2 size-4" />
                  Notifications
                </Link>
              </DropdownMenuItem>

              {/* Device count display */}
              <DropdownMenuItem className="pointer-events-none flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SimpleDeviceIcon className="mr-1" />
                  <span className="text-sm">Connected devices</span>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {countLoading ? (
                    <div className="text-xs">…</div>
                  ) : (
                    <span className="text-xs font-medium">
                      {deviceCount ?? 0}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => void logout("local")}
              className="flex cursor-pointer items-center"
            >
              <PowerOff className="mr-2 size-4" />
              {loadingScope === "local"
                ? "Logging out…"
                : "Log out (this device)"}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => void logout("global")}
              className="flex cursor-pointer items-center"
            >
              <Power className="mr-2 size-4" />
              {loadingScope === "global"
                ? "Logging out everywhere…"
                : "Log out (all devices)"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
