// app/xero/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  ClipboardList,
  PlugZap,
  RefreshCw,
  Building2,
  Shield,
  Signal,
  Power,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { SidebarTrigger } from "@/components/ui/sidebar";

type ConnStatus = "connected" | "disconnected" | "loading";
type Env = "live" | "sandbox";

type XeroStatus = {
  connected: boolean;
  environment?: Env | string;
  tenantName?: string | null;
  tokenExpiresAt?: string | null; // ISO
  lastSyncAt?: string | null; // ISO
  scopes?: string[];
  clientConfigured?: boolean;
};

const POLL_MS = 20000;

const RECOMMENDED_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "accounting.contacts",
  "accounting.settings",
  "accounting.transactions",
];

export default function XeroPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [status, setStatus] = useState<ConnStatus>("loading");
  const [data, setData] = useState<XeroStatus | null>(null);
  const [env, setEnv] = useState<Env>("live");
  const [scopes, setScopes] = useState<string[]>(RECOMMENDED_SCOPES);
  const [scopesOpen, setScopesOpen] = useState(false);

  // NEW: Track when we consider the UI "connected" based on tenantName presence
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  // optional: implement this if you have /api/xero/status
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/xero/status", { cache: "no-store" });
      if (!res.ok) throw new Error("Status failed");
      const j: XeroStatus = await res.json();
      setData(j);
      setStatus(j.connected ? "connected" : "disconnected");
      if (j.scopes?.length) setScopes(j.scopes);
      if (j.environment === "sandbox" || j.environment === "live") setEnv(j.environment);
    } catch {
      setStatus("disconnected");
    }
  };

  useEffect(() => {
    // optional: comment out if /api/xero/status not implemented
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // handle OAuth callback message
  useEffect(() => {
    const m = sp.get("connected");
    const e = sp.get("error");
    if (m === "1") {
      toast.success("Connected to Xero");
      // optional refresh
      fetchStatus().catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    } else if (e) {
      toast.error(e);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [sp]);

  // NEW: derive UI status from presence of tenantName (your requested logic)
  const uiStatus: ConnStatus = useMemo(() => {
    if (status === "loading") return "loading";
    return data?.tenantName ? "connected" : "disconnected";
  }, [status, data?.tenantName]);

  // NEW: remember when we first saw a tenantName (i.e., "connected time")
  useEffect(() => {
    if (data?.tenantName) {
      if (!connectedAt) setConnectedAt(new Date().toISOString());
    } else {
      // reset if disconnected
      setConnectedAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.tenantName]);

  const handleConnect = () => {
    const u = new URL(window.location.origin + "/api/xero/connect");
    // Optionally pass scopes selection to backend
    u.searchParams.set("scopes", scopes.join(" "));
    // env is optional and unused by backend here
    u.searchParams.set("env", env);
    window.location.href = u.toString();
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch("/api/xero/disconnect", { method: "POST" });
      if (res.ok) {
        toast("Disconnected");
        fetchStatus().catch(() => {});
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? "Failed to disconnect");
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleRefreshToken = async () => {
    try {
      const res = await fetch("/api/xero/refresh", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Token refreshed");
        fetchStatus().catch(() => {});
      } else {
        toast.error(j?.error ?? "Refresh failed");
      }
    } catch {
      toast.error("Refresh failed");
    }
  };

  const handleSync = async (resource: "contacts" | "invoices") => {
    try {
      const res = await fetch(`/api/xero/${resource}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Sync failed");
      toast.success(`${resource === "contacts" ? "Contacts" : "Invoices"} synced`);
      router.push(`/${resource}`);
    } catch {
      toast.error(`Failed to sync ${resource}`);
    }
  };

  const handlePing = async () => {
    try {
      const res = await fetch("/api/xero/ping", { cache: "no-store" });
      const j = await res.json();
      if (res.ok) toast.success("API OK: " + (j?.message ?? "Success"));
      else toast.error(j?.error ?? "Xero ping failed");
    } catch {
      toast.error("Xero ping failed");
    }
  };

  const lastSync = useMemo(() => formatWhen(data?.lastSyncAt), [data?.lastSyncAt]);
  const tokenExp = useMemo(() => formatWhen(data?.tokenExpiresAt), [data?.tokenExpiresAt]);
  const connectedAgo = useMemo(() => formatWhen(connectedAt), [connectedAt]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="ml-1 flex items-center">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </div>
        <header className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Xero Contact Sync</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quick connect, real-time connection status, and handy actions.
          </p>
        </header>

        {/* TOP ACTIONS */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="h-12 rounded-xl border bg-muted px-5 text-base font-medium"
            onClick={handleConnect}
            disabled={uiStatus === "loading"}
          >
            <Link2 className="mr-2 h-5 w-5" />
            {uiStatus === "connected" ? "Reconnect to Xero" : "Connect to Xero"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="h-12 rounded-xl px-5 text-base font-medium"
              >
                <ClipboardList className="mr-2 h-5 w-5" />
                Sync from Xero
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleSync("contacts")}>
                Contacts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSync("invoices")}>
                Invoices
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl px-5 text-base"
                  onClick={fetchStatus}
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Refresh Status
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pull latest connection/tenant/token info</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* STATUS CARD */}
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              {uiStatus === "connected" ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : uiStatus === "loading" ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div className="text-lg font-semibold">Connection status</div>
              <Badge
                variant="secondary"
                className={
                  uiStatus === "connected"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : uiStatus === "loading"
                    ? "text-muted-foreground"
                    : "border-red-200 bg-red-50 text-red-700"
                }
              >
                {uiStatus === "connected" ? "Connected" : uiStatus === "loading" ? "Checking…" : "Not connected"}
              </Badge>
              {uiStatus === "connected" && (
                <span className="ml-2 text-xs text-muted-foreground">• {connectedAgo}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Select value={env} onValueChange={(v) => setEnv(v as Env)}>
                <SelectTrigger className="w-[160px]">
                  <Building2 className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setScopesOpen(true)}>
                <Shield className="mr-2 h-4 w-4" />
                Scopes
              </Button>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
            <InfoRow
              label="Tenant"
              value={data?.tenantName ? data.tenantName : "—"}
              icon={<PlugZap className="h-4 w-4" />}
            />

            {/* NEW: Show connection time based on tenantName logic */}
            <InfoRow
              label="Connected since"
              value={uiStatus === "connected" ? connectedAgo : "—"}
              icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            />

            <InfoRow
              label="Environment"
              value={data?.environment ? String(data.environment).toUpperCase() : env.toUpperCase()}
              icon={<Building2 className="h-4 w-4" />}
            />
            <InfoRow label="Token expires" value={tokenExp} icon={<Power className="h-4 w-4" />} />
            <InfoRow label="Last sync" value={lastSync} icon={<Signal className="h-4 w-4" />} />
            <InfoRow label="Scopes" value={scopes.join(" ")} icon={<Shield className="h-4 w-4" />} className="sm:col-span-2" />
          </CardContent>

          <CardFooter className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handlePing}>
              <Signal className="mr-2 h-4 w-4" />
              Test API
            </Button>
            <Button variant="outline" onClick={handleRefreshToken} disabled={uiStatus !== "connected"}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Token
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={uiStatus !== "connected"}>
              <XCircle className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Bottom status bar */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            {uiStatus === "connected" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : uiStatus === "loading" ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="text-sm text-muted-foreground">Xero status:</span>
            <Badge
              variant="secondary"
              className={
                uiStatus === "connected"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : uiStatus === "loading"
                  ? "text-muted-foreground"
                  : "border-red-200 bg-red-50 text-red-700"
              }
            >
              {uiStatus === "connected" ? "Connected" : uiStatus === "loading" ? "Checking…" : "Not connected"}
            </Badge>
            {uiStatus === "connected" && (
              <span className="ml-2 text-xs text-muted-foreground">• {connectedAgo}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={fetchStatus} className="rounded-lg">
              Refresh
            </Button>
            <Button size="sm" onClick={handleConnect} className="rounded-lg">
              {uiStatus === "connected" ? "Reconnect" : "Connect"}
            </Button>
          </div>
        </div>
      </div>

      {/* Scopes Dialog */}
      <Dialog open={scopesOpen} onOpenChange={setScopesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request scopes</DialogTitle>
            <DialogDescription>
              These will be sent with the OAuth request. Keep{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">offline_access</code> for refresh tokens.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            {RECOMMENDED_SCOPES.map((s) => (
              <label key={s} className="flex items-center gap-3">
                <Checkbox
                  checked={scopes.includes(s)}
                  onCheckedChange={(v) =>
                    setScopes((prev) => (v ? [...prev, s] : prev.filter((x) => x !== s)))
                  }
                />
                <span className="text-sm">{s}</span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setScopesOpen(false);
                // No backend call here; connect route reads scopes via querystring
                toast.success("Scopes updated");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function InfoRow({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className ?? ""}`}>
      <div className="mt-0.5">{icon}</div>
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm">{value || "—"}</div>
      </div>
    </div>
  );
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
