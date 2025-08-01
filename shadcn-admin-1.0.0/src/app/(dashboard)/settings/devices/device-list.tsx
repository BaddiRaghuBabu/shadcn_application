"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { getOrSetDeviceId, clearDeviceId } from "@/lib/device";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Device {
  device_id: string;
  user_agent: string | null;
  platform: string | null;
  ip_address: string | null;
  last_active: string;
  created_at: string;
}

export default function DeviceList() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const localId = getOrSetDeviceId();

  const fetchDevices = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (session?.expires_at) {
      setExpiresAt(new Date(session.expires_at * 1000));
    }
    if (!token) return;
    try {
      const res = await fetch("/api/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setDevices(json.devices as Device[]);
      }
    } catch {}
  };

  useEffect(() => {
    void fetchDevices();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`devices-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_devices", filter: `user_id=eq.${user.id}` },
          () => {
            void fetchDevices();
          }
        )
        .subscribe();
    })();
    return () => {
      channel?.unsubscribe();
    };
  }, []);

  const logoutLocal = async () => {
    setLoading("local");
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      toast.error(error.message);
      setLoading(null);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
        const res = await fetch("/api/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ device_id: localId }),
      });
            if (!res.ok) {
        toast.error("Unable to unregister device.");
        setLoading(null);
        return;
      }
    }
    
    clearDeviceId();
    router.replace("/login");
  };

  const logoutGlobal = async () => {
    setLoading("global");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      setLoading(null);
      return;
    }
    if (token) {
      const res =  await fetch("/api/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      });
            if (!res.ok) {
        toast.error("Unable to unregister devices.");
        setLoading(null);
        return;
      }
    }
    clearDeviceId();
    router.replace("/login");
  };

  const removeDevice = async (id: string) => {
    setLoading(id);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res= await fetch("/api/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_id: id }),
    });
        if (!res.ok) {
      toast.error("Failed to remove device.");
    }
    setLoading(null);
    void fetchDevices();
  };

  return (
    <div className="space-y-4">
      {expiresAt && (
        <p className="text-sm text-muted-foreground">
          Session expires {formatDistanceToNow(expiresAt, { addSuffix: true })}
        </p>
      )}
      {devices.map((d) => (
        <div key={d.device_id} className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-1">
            <p className="font-medium">
              {d.device_id === localId ? "This Device" : d.platform || "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">
              {d.ip_address ? `${d.ip_address} • ` : ""}
              Last active {formatDistanceToNow(new Date(d.last_active), { addSuffix: true })}
            </p>
          </div>
          {d.device_id === localId ? (
            <Button size="sm" onClick={logoutLocal} disabled={loading === "local"}>
              {loading === "local" ? "Logging out…" : "Log out (this device)"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void removeDevice(d.device_id)} disabled={loading === d.device_id}>
              {loading === d.device_id ? "Removing…" : "Remove"}
            </Button>
          )}
        </div>
      ))}
      {devices.length > 0 && (
        <Button variant="destructive" className="mt-2" onClick={logoutGlobal} disabled={loading === "global"}>
          {loading === "global" ? "Logging out…" : "Log out everywhere"}
        </Button>
      )}
    </div>
  );
}