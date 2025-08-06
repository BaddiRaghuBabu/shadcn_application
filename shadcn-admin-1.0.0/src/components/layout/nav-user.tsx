"use client";

import { useState, useEffect } from "react";
import { BadgeCheck, Bell, PowerOff, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { clearDeviceId, getOrSetDeviceId } from "@/lib/device";
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
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

// wrap AvatarImage in motion
const MotionAvatarImage = motion(AvatarImage);

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;

        let name = authUser.user_metadata?.full_name ?? "";
        let avatar = authUser.user_metadata?.avatar_url ?? "";

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("name, avatar")
          .eq("user_id", authUser.id)
          .single();

        if (profile) {
          name = profile.name ?? name;
          avatar = profile.avatar ?? avatar;
        }

        setUser({
          name: name || authUser.email || "User",
          email: authUser.email || "",
          avatar: avatar || `https://i.pravatar.cc/150?u=${authUser.id}`,
        });
      } catch {
        toast.error("Failed to load profile");
      }
    })();
  }, []);

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
      } catch {
        toast.error("Connection to auth backend unstable. Retrying...");
      }
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  const logout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      const token = current?.access_token;

      // unregister only this device
      const body = { device_id: getOrSetDeviceId() };

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
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      clearDeviceId();
      toast.success("Logged out on this device");
      router.replace("/login");
    } catch {
      toast.error("Unexpected error during logout");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionValid || !user) {
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
                {user.avatar && (
                  <MotionAvatarImage
                    src={user.avatar}
                    alt={user.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  />
                )}
                <AvatarFallback className="rounded-lg">
                  {user.name[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              <motion.div
                className="ml-2 grid flex-1 text-left text-sm leading-tight"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </motion.div>
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
                  {user.avatar && (
                    <MotionAvatarImage
                      src={user.avatar}
                      alt={user.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    />
                  )}
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
                <Link href="/settings/notifications">
                  <Bell className="mr-2 size-4" />
                  Notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => void logout()} className="flex cursor-pointer items-center">
              <PowerOff className="mr-2 size-4" />
              {loading ? "Logging out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
