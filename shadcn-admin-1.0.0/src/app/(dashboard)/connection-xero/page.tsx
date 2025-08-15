"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, RefreshCw, PlugZap, Building2, Signal, Power, Link2,
  TimerReset, ShieldCheck, ExternalLink, Clock4,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { siXero, siQuickbooks, siMyob, siSage } from "simple-icons";

type PlatformID = "xero" | "quickbooks" | "myob" | "sage";
type ConnectionStatus = "connected" | "disconnected" | "expired" | "refreshing" | "error";

interface PlatformMeta {
  id: PlatformID; label: string; accent: string;
  oauthUrl: string; statusUrl: string; refreshUrl: string; disconnectUrl: string; dashboardPath: string;
}
interface PlatformState {
  status: ConnectionStatus; tenantName?: string | null; expiresAt?: string | null;
  lastRefreshedAt?: string | null; error?: string | null;
}

const PLATFORMS: PlatformMeta[] = [
  { id: "xero", label: "Xero", accent: "from-sky-500 via-sky-400 to-sky-600",
    oauthUrl: "/api/xero/connect", statusUrl: "/api/xero/status", refreshUrl: "/api/xero/refresh",
    disconnectUrl: "/api/xero/disconnect", dashboardPath: "/xero-dashboard" },
  { id: "quickbooks", label: "QuickBooks", accent: "from-emerald-500 via-emerald-400 to-emerald-600",
    oauthUrl: "/api/quickbooks/connect", statusUrl: "/api/quickbooks/status", refreshUrl: "/api/quickbooks/refresh",
    disconnectUrl: "/api/quickbooks/disconnect", dashboardPath: "/quickbooks" },
  { id: "myob", label: "MYOB", accent: "from-fuchsia-500 via-fuchsia-400 to-fuchsia-600",
    oauthUrl: "/api/myob/connect", statusUrl: "/api/myob/status", refreshUrl: "/api/myob/refresh",
    disconnectUrl: "/api/myob/disconnect", dashboardPath: "/myob" },
  { id: "sage", label: "Sage", accent: "from-lime-500 via-lime-400 to-lime-600",
    oauthUrl: "/api/sage/connect", statusUrl: "/api/sage/status", refreshUrl: "/api/sage/refresh",
    disconnectUrl: "/api/sage/disconnect", dashboardPath: "/sage" },
];
const SHORT_LABEL: Partial<Record<PlatformID, string>> = { quickbooks: "QuickBooks" };

function msToCompact(ms: number) {
  if (!isFinite(ms)) return "—";
  const neg = ms < 0, abs = Math.abs(ms);
  const s = Math.floor(abs / 1000) % 60, m = Math.floor(abs / (1000 * 60)) % 60, h = Math.floor(abs / (1000 * 60 * 60));
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (neg ? "-" : "") + `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function formatLocal(dt?: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function classNames(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }
function useCountdown(expiresAt?: string | null) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const msLeft = useMemo(() => (!expiresAt ? NaN : new Date(expiresAt).getTime() - now), [expiresAt, now]);
  return { expired: Number.isFinite(msLeft) ? msLeft <= 0 : false, label: Number.isFinite(msLeft) ? msToCompact(msLeft) : "—", msLeft };
}
async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
function normalizeTokenPayload(raw: any) {
  const connected = typeof raw?.connected === "boolean" ? raw.connected : Boolean(raw?.expires_at ?? raw?.expiresAt ?? raw?.expires_in);
  const tenantName = raw?.tenantName ?? raw?.tenant_name ?? raw?.tenant ?? null;
  const issuedAtISO: string | null = raw?.issuedAt ?? raw?.lastRefreshedAt ?? raw?.updated_at ?? raw?.created_at ?? null;
  const expiresAtISO: string | null = raw?.expiresAt ?? raw?.expires_at ?? (typeof raw?.expires_in === "number" ? new Date(Date.now() + raw.expires_in * 1000).toISOString() : null);
  return { connected, tenantName, issuedAtISO, expiresAtISO };
}

function BrandLogo({ id, size = 28 }: { id: PlatformID; size?: number }) {
  const iconMap = { xero: siXero, quickbooks: siQuickbooks, myob: siMyob, sage: siSage } as const;
  const icon = iconMap[id]; if (!icon) return null;
  return (<svg role="img" aria-label={icon.title} width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
    <title>{icon.title}</title><path d={icon.path} fill={`#${icon.hex}`} /></svg>);
}
function StatusPill({ status }: { status: ConnectionStatus }) {
  const map: Record<ConnectionStatus, { text: string; className: string }> = {
    connected: { text: "Connected", className: "bg-emerald-500/15 text-emerald-600" },
    disconnected: { text: "Disconnected", className: "bg-muted text-muted-foreground" },
    expired: { text: "Expired", className: "bg-amber-500/15 text-amber-600" },
    refreshing: { text: "Refreshing", className: "bg-blue-500/15 text-blue-600" },
    error: { text: "Error", className: "bg-rose-500/15 text-rose-600" },
  };
  const cfg = map[status];
  return <Badge className={classNames("rounded-full px-2 py-0.5 text-[10px] leading-none whitespace-nowrap shrink-0", cfg.className)}>{cfg.text}</Badge>;
}

function PlatformCard({
  meta, state, onConnect, onRefresh, onDisconnect, onOpen,
}: { meta: PlatformMeta; state: PlatformState; onConnect: () => void; onRefresh: () => void; onDisconnect: () => void; onOpen: () => void; }) {
  const { expired, label, msLeft } = useCountdown(state.expiresAt);
  const hasTenant = Boolean(state.tenantName && state.tenantName.trim().length);
  const isTimingStatus = state.status === "connected" || state.status === "refreshing" || state.status === "expired";
  const isConnected = isTimingStatus && hasTenant;
  const pillStatus: ConnectionStatus = isConnected ? state.status : "disconnected";
  const hasExpiry = Number.isFinite(msLeft);

  return (
    <motion.div className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="relative grid h-full min-w-[320px] grid-rows-[auto,1fr,auto] overflow-hidden border-muted bg-card sm:min-w-0">
        <div className={classNames("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", meta.accent)} />
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <BrandLogo id={meta.id} />
              <div className="min-w-0">
                <div className="text-[13px] sm:text-sm font-semibold leading-tight tracking-tight truncate" title={SHORT_LABEL[meta.id] ?? meta.label}>
                  {SHORT_LABEL[meta.id] ?? meta.label}
                </div>
                <div className="text-[11px] text-muted-foreground">{isConnected ? "OAuth2 connection" : "Not connected"}</div>
              </div>
            </div>
            {state.status !== "disconnected" && <StatusPill status={pillStatus} />}
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 text-sm">
          {isConnected ? (
            <>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0 break-words whitespace-normal leading-relaxed">
                  <span className="text-muted-foreground">Tenant:</span>{" "}
                  <span className="text-foreground font-medium" title={state.tenantName ?? undefined}>
                    {state.tenantName || "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock4 className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  Issued at: <span className="text-foreground font-medium">{formatLocal(state.lastRefreshedAt)}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <TimerReset className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  Expires at: <span className="text-foreground font-medium">{formatLocal(state.expiresAt)}</span>
                  {hasExpiry && (
                    <span className="ml-2 inline-flex items-center gap-1 align-middle">
                      <span className={classNames("inline-block size-1.5 rounded-full", expired ? "bg-amber-600" : "bg-emerald-500", "animate-pulse")} />
                      <span className={classNames("font-mono tabular-nums", expired ? "text-amber-700" : "text-muted-foreground")}>
                        {expired ? `expired ${msToCompact(-msLeft)} ago` : `in ${label}`}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              {state.lastRefreshedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Signal className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">Last refreshed: <span className="text-foreground">{formatLocal(state.lastRefreshedAt)}</span></div>
                </div>
              )}
              {state.error && (
                <div className="flex items-center gap-2 text-rose-600">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 break-words">{state.error}</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground">Connect to {meta.label} to sync invoices, contacts, and more.</div>
          )}
        </CardContent>

        <CardFooter className="pt-2">
          {isConnected ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="link" size="sm" className="h-7 px-1 text-xs font-medium whitespace-nowrap" onClick={onRefresh} disabled={state.status === "refreshing"}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh token
              </Button>
              <Button variant="link" size="sm" className="h-7 px-1 text-xs font-medium whitespace-nowrap" onClick={onOpen}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open dashboard
              </Button>
              <Button variant="link" size="sm" className="h-7 px-1 text-xs font-medium text-rose-600 hover:text-rose-700 whitespace-nowrap" onClick={onDisconnect}>
                <Power className="mr-1 h-3.5 w-3.5" /> Disconnect
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={onConnect} className="h-7 px-2 text-xs font-medium whitespace-nowrap">
              <Link2 className="mr-2 h-4 w-4" /> Connect {meta.label}
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default function AccountingConnectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<Record<PlatformID, PlatformState>>({
    xero: { status: "disconnected" }, quickbooks: { status: "disconnected" }, myob: { status: "disconnected" }, sage: { status: "disconnected" },
  });

  useEffect(() => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (sp.get("connected") === "1") toast.success("Xero connected");
    if (sp.get("error")) toast.error(`Xero: ${sp.get("error")}`);
  }, []);

  async function loadStatus(meta: PlatformMeta) {
    try {
      const raw = await fetchJSON<any>(meta.statusUrl);
      const n = normalizeTokenPayload(raw);
      if (n.connected) {
        const hasTenant = Boolean(n.tenantName && String(n.tenantName).trim().length);
        const expired = n.expiresAtISO ? new Date(n.expiresAtISO).getTime() < Date.now() : false;
        setStates((prev) => ({
          ...prev,
          [meta.id]: {
            status: hasTenant ? (expired ? "expired" : "connected") : "disconnected",
            tenantName: hasTenant ? n.tenantName : null,
            expiresAt: hasTenant ? (n.expiresAtISO ?? null) : null,
            lastRefreshedAt: n.issuedAtISO ?? null,
            error: hasTenant ? null : "No tenant selected",
          },
        }));
      } else {
        setStates((prev) => ({ ...prev, [meta.id]: { status: "disconnected" } }));
      }
    } catch (e: any) {
      setStates((prev) => ({ ...prev, [meta.id]: { status: "disconnected", error: e?.message ?? "Failed" } }));
    }
  }

  async function refresh(meta: PlatformMeta) {
    setStates((prev) => ({ ...prev, [meta.id]: { ...prev[meta.id], status: "refreshing" } }));
    setLoading(true);
    try {
      const raw = await fetchJSON<any>(meta.refreshUrl, { method: "POST" });
      const n = normalizeTokenPayload(raw);
      const hasTenant = Boolean(n.tenantName && String(n.tenantName).trim().length);
      if (!hasTenant) {
        toast.error(`${meta.label} refresh succeeded but no tenant found`);
        setStates((prev) => ({ ...prev, [meta.id]: { status: "disconnected", tenantName: null, expiresAt: null, lastRefreshedAt: n.issuedAtISO ?? new Date().toISOString(), error: "No tenant selected" } }));
        return;
      }
      toast.success(`${meta.label} token refreshed`);
      setStates((prev) => ({ ...prev, [meta.id]: { status: "connected", tenantName: n.tenantName, expiresAt: n.expiresAtISO ?? prev[meta.id]?.expiresAt ?? null, lastRefreshedAt: n.issuedAtISO ?? new Date().toISOString(), error: null } }));
    } catch (e: any) {
      toast.error(`${meta.label} refresh failed`);
      setStates((prev) => ({ ...prev, [meta.id]: { ...prev[meta.id], status: "error", error: e?.message ?? "Failed" } }));
    } finally {
      setLoading(false);
    }
  }

  async function disconnect(meta: PlatformMeta) {
    setLoading(true);
    try {
      await fetchJSON<any>(meta.disconnectUrl, { method: "POST" });
      toast.success(`${meta.label} disconnected`);
      setStates((prev) => ({ ...prev, [meta.id]: { status: "disconnected" } }));
    } catch (e: any) {
      toast.error(`${meta.label} disconnect failed`);
      setStates((prev) => ({ ...prev, [meta.id]: { ...prev[meta.id], status: "error", error: e?.message ?? "Failed" } }));
    } finally {
      setLoading(false);
    }
  }

  function connect(meta: PlatformMeta) {
    if (meta.id === "xero") { router.push("connection-xero/api-key-connect"); return; }
    window.location.href = meta.oauthUrl;
  }
  function openDashboard(meta: PlatformMeta) { router.push(meta.dashboardPath); }

  async function hydrateAll() {
    setLoading(true);
    await Promise.all(PLATFORMS.map((p) => loadStatus(p)));
    setLoading(false);
  }

  useEffect(() => { hydrateAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnected = PLATFORMS.filter((p) => states[p.id].status === "disconnected");
  const connected = PLATFORMS.filter((p) => states[p.id].status !== "disconnected");

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounting Connections</h1>
          <p className="text-sm text-muted-foreground">Connect and manage Xero, Intuit QuickBooks, MYOB, and Sage.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={hydrateAll} className="h-7 px-2 text-xs" disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh status
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                <PlugZap className="mr-2 h-4 w-4" /> Quick actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PLATFORMS.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => connect(p)}>
                  <Link2 className="mr-2 h-4 w-4" /> Connect {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Disconnected */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Connect a platform</h2>
          <span className="text-xs text-muted-foreground">Only showing disconnected</span>
        </div>
        {disconnected.length === 0 ? (
          <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">All platforms are connected.</div>
        ) : (
          <div className="grid grid-cols-1 auto-rows-[1fr] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {disconnected.map((meta) => (
              <PlatformCard key={meta.id} meta={meta} state={states[meta.id]} onConnect={() => connect(meta)} onRefresh={() => refresh(meta)} onDisconnect={() => disconnect(meta)} onOpen={() => openDashboard(meta)} />
            ))}
          </div>
        )}
      </section>

      <Separator className="my-8" />

      {/* Connected */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Connected</h2>
        </div>
        {connected.length === 0 ? (
          <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">No platforms connected. Use the buttons above to connect Xero, QuickBooks, MYOB, or Sage.</div>
        ) : (
          <div className="grid grid-cols-1 auto-rows-[1fr] gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((meta) => (
              <PlatformCard key={meta.id} meta={meta} state={states[meta.id]} onConnect={() => connect(meta)} onRefresh={() => refresh(meta)} onDisconnect={() => disconnect(meta)} onOpen={() => openDashboard(meta)} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-10 text-xs text-muted-foreground">
        <p className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" /> OAuth2 scopes are requested per-platform. Only the selected platform’s data is shown in its dashboard.
        </p>
        <p className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" /> When a platform is disconnected, it automatically moves back to “Connect a platform”.
        </p>
      </div>
    </div>
  );
}
