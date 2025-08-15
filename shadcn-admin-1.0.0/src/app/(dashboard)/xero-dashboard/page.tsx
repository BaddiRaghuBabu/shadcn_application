"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  FileText,
  Users,
  Building2,
  Banknote,
  BarChart3,
  LifeBuoy,
  RefreshCw,
  ShieldCheck,
  CircleAlert,
  CalendarClock,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ---------------- types ----------------
interface XeroStatus {
  connected: boolean;
  tenantName?: string | null;
  environment?: string | null;
  tokenExpiresAt?: string | null;
}

interface Summary {
  invoices: number;
  openInvoices: number;
  overdueInvoices: number;
  contacts: number;
  totalDue: number; // INR summary only
  lastUpdate?: string | null;
}

// -------------- helpers ----------------
const formatINR = (n?: number | null) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
    : "—";

const formatDate = (dt?: string | null) => {
  if (!dt) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dt));
  } catch {
    return dt;
  }
};

function useStatus(url: string, interval = 30000) {
  const [data, setData] = useState<XeroStatus | undefined>();
  const [isLoading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url);
      const json = (await res.json()) as XeroStatus;
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, interval]);
  return { data, isLoading, refresh };
}

// -------------- page ----------------
export default function XeroHubPage() {
  const router = useRouter();
  const { data: status, isLoading: statusLoading, refresh: refreshStatus } = useStatus("/api/xero/status", 30000);

  const [summary, setSummary] = useState<Summary>({
    invoices: 0,
    openInvoices: 0,
    overdueInvoices: 0,
    contacts: 0,
    totalDue: 0,
    lastUpdate: null,
  });
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      // Counts
      const [invCount, contactCount, openCount, overdueCount, dueRows, lastRow] = await Promise.all([
        supabase.from("xero_invoices").select("invoice_id", { count: "exact", head: true }),
        supabase.from("xero_contacts").select("contact_id", { count: "exact", head: true }),
        supabase
          .from("xero_invoices")
          .select("invoice_id", { count: "exact", head: true })
          .in("status", ["AUTHORISED", "SUBMITTED", "DRAFT"]),
        supabase
          .from("xero_invoices")
          .select("invoice_id", { count: "exact", head: true })
          .lt("due_at", new Date().toISOString())
          .gt("amount_due", 0),
        supabase.from("xero_invoices").select("amount_due").gt("amount_due", 0).limit(1000),
        supabase
          .from("xero_invoices")
          .select("updated_utc")
          .order("updated_utc", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const totalDue = (dueRows.data || []).reduce((s, r) => s + (Number((r as { amount_due: number }).amount_due) || 0), 0);
      setSummary({
        invoices: invCount.count || 0,
        openInvoices: openCount.count || 0,
        overdueInvoices: overdueCount.count || 0,
        contacts: contactCount.count || 0,
        totalDue,
        lastUpdate: lastRow.data?.updated_utc ?? null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Load failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const syncNow = async () => {
    try {
      toast.message("Syncing from Xero…");
      await Promise.all([
        fetch("/api/xero/invoices").then((r) => r.json()).catch(() => ({})),
        fetch("/api/xero/contacts").then((r) => r.json()).catch(() => ({})),
      ]);
      await Promise.all([loadSummary(), refreshStatus()]);
      toast.success("Sync complete");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      toast.error(msg);
    }
  };

  const tiles = useMemo(
    () => [
      {
        title: "Invoices",
        desc: `${summary.invoices} total • ${summary.openInvoices} open • ${summary.overdueInvoices} overdue`,
        icon: <FileText className="h-7 w-7" />,
        href: "/invoices",
      },
      {
        title: "Contacts",
        desc: `${summary.contacts} contacts in Xero`,
        icon: <Users className="h-7 w-7" />,
        href: "/contacts",
      },
      {
        title: "Accounting",
        desc: "Chart of accounts, journals & more",
        icon: <Building2 className="h-7 w-7" />,
        href: "#",
      },
      {
        title: "Banking",
        desc: "Reconcile payments & statements",
        icon: <Banknote className="h-7 w-7" />,
        href: "#",
      },
      {
        title: "Reports",
        desc: `Outstanding due ${formatINR(summary.totalDue)}`,
        icon: <BarChart3 className="h-7 w-7" />,
        href: "/xero-dashboard",
      },
      {
        title: "Support",
        desc: "Guides & developer help",
        icon: <LifeBuoy className="h-7 w-7" />,
        href: "#",
      },
    ],
    [summary]
  );

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-8">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Xero Hub</h1>
          <p className="text-sm text-muted-foreground">Quick modules for invoices, contacts, reporting and more.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/connection-xero")}>
            {statusLoading ? (
              <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 animate-pulse" /> Checking…</span>
            ) : status?.tenantName ? (
              <span className="flex items-center gap-2 text-emerald-600"><ShieldCheck className="h-4 w-4" /> Connected</span>
            ) : (
              <span className="flex items-center gap-2 text-destructive"><CircleAlert className="h-4 w-4" /> Not connected</span>
            )}
          </Button>
          <Button onClick={syncNow}><RefreshCw className="mr-2 h-4 w-4" /> Sync</Button>
        </div>
      </header>

      {/* grid like screenshot */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <TileCard key={t.title} title={t.title} desc={t.desc} href={t.href} icon={t.icon} loading={loading} />
        ))}
      </div>

      <div className="mt-8 text-xs text-muted-foreground">Last update: {formatDate(summary.lastUpdate)}</div>
    </div>
  );
}

function TileCard({
  title,
  desc,
  href,
  icon,
  loading,
}: {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card className="h-full rounded-2xl shadow-sm transition-colors hover:border-foreground/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border-2 border-emerald-600 p-3 text-emerald-700">
                  {icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-semibold">{title} <ArrowRight className="ml-1 inline h-4 w-4 translate-x-0 transition-transform group-hover:translate-x-1" /></div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {loading ? <span className="inline-block animate-pulse">Loading…</span> : desc}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
