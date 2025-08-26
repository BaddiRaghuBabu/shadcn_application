"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ─────────────────── ECharts minimal types ─────────────────── */
type EChartsInstance = {
  setOption: (opt: unknown, notMerge?: boolean, lazyUpdate?: boolean) => void;
  resize: () => void;
  dispose: () => void;
};
type EChartsStatic = {
  init: (el: HTMLDivElement) => EChartsInstance;
};
type WindowWithECharts = Window & { echarts?: EChartsStatic };

/* ─────────────────── Data shapes ─────────────────── */
type InvoiceRow = {
  invoice_id: string;
  contact_name: string | null;
  status: string | null;
  currency_code: string | null;
  amount_due: number | null;
  total: number | null;
  issued_at: string | null; // timestamptz
  due_at: string | null; // timestamptz
};

type ContactRow = {
  contact_id: string;
  is_customer: boolean | null;
  is_supplier: boolean | null;
  email: string | null;
};

type Summary = {
  invoices: number;
  openInvoices: number;
  overdueInvoices: number;
  contacts: number;
  outstandingTotal: number; // sum of amount_due
};

export default function XeroAnalyticsPage() {
  /* ---------------- DOM refs for 6 charts ---------------- */
  const refOverview = useRef<HTMLDivElement>(null);
  const refMonthly = useRef<HTMLDivElement>(null);
  const refStatus = useRef<HTMLDivElement>(null);
  const refAging = useRef<HTMLDivElement>(null);
  const refTopCust = useRef<HTMLDivElement>(null);
  const refContacts = useRef<HTMLDivElement>(null);

  /* ---------------- chart instances ---------------- */
  const cOverview = useRef<EChartsInstance | null>(null);
  const cMonthly = useRef<EChartsInstance | null>(null);
  const cStatus = useRef<EChartsInstance | null>(null);
  const cAging = useRef<EChartsInstance | null>(null);
  const cTopCust = useRef<EChartsInstance | null>(null);
  const cContacts = useRef<EChartsInstance | null>(null);

  /* ---------------- page state ---------------- */
  const [loading, setLoading] = useState(true);
  const [echartsReady, setEchartsReady] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    invoices: 0,
    openInvoices: 0,
    overdueInvoices: 0,
    contacts: 0,
    outstandingTotal: 0,
  });

  /* ---------------- theme helpers ---------------- */
  const isDark = useMemo(() => {
    if (typeof document === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
    );
  }, []);
  const axisText = isDark ? "#d1d5db" : "#374151";
  const gridLine = isDark ? "#334155" : "#e5e7eb";
  const subText = isDark ? "#9ca3af" : "#6b7280";

  /* ---------------- load data once ---------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Pull everything we need in two efficient selects
      const [invRes, cRes] = await Promise.all([
        supabase
          .from("xero_invoices")
          .select(
            "invoice_id,contact_name,status,currency_code,amount_due,total,issued_at,due_at"
          ),
        supabase
          .from("xero_contacts")
          .select("contact_id,is_customer,is_supplier,email"),
      ]);

      const inv = (invRes.data ?? []) as InvoiceRow[];
      const cons = (cRes.data ?? []) as ContactRow[];

      setInvoices(inv);
      setContacts(cons);

      // Build summary quickly from the fetched rows
      const openStatuses = new Set(["AUTHORISED", "SUBMITTED", "DRAFT"]);
      const now = Date.now();

      const openInvoices = inv.filter((r) =>
        openStatuses.has(safeStatus(r.status))
      ).length;
      const overdueInvoices = inv.filter(
        (r) =>
          r.amount_due &&
          r.amount_due > 0 &&
          r.due_at &&
          new Date(r.due_at).getTime() < now &&
          safeStatus(r.status) !== "PAID"
      ).length;
      const outstandingTotal = inv.reduce(
        (s, r) => s + (Number(r.amount_due) || 0),
        0
      );

      setSummary({
        invoices: inv.length,
        openInvoices,
        overdueInvoices,
        contacts: cons.length,
        outstandingTotal,
      });

      setLoading(false);
    };

    load();
  }, []);

  /* ---------------- live refresh button ---------------- */
  const refresh = async () => {
    setLoading(true);
    const [invRes, cRes] = await Promise.all([
      supabase
        .from("xero_invoices")
        .select(
          "invoice_id,contact_name,status,currency_code,amount_due,total,issued_at,due_at"
        ),
      supabase.from("xero_contacts").select("contact_id,is_customer,is_supplier,email"),
    ]);

    const inv = (invRes.data ?? []) as InvoiceRow[];
    const cons = (cRes.data ?? []) as ContactRow[];
    setInvoices(inv);
    setContacts(cons);

    const openStatuses = new Set(["AUTHORISED", "SUBMITTED", "DRAFT"]);
    const now = Date.now();
    const openInvoices = inv.filter((r) =>
      openStatuses.has(safeStatus(r.status))
    ).length;
    const overdueInvoices = inv.filter(
      (r) =>
        r.amount_due &&
        r.amount_due > 0 &&
        r.due_at &&
        new Date(r.due_at).getTime() < now &&
        safeStatus(r.status) !== "PAID"
    ).length;
    const outstandingTotal = inv.reduce(
      (s, r) => s + (Number(r.amount_due) || 0),
      0
    );

    setSummary({
      invoices: inv.length,
      openInvoices,
      overdueInvoices,
      contacts: cons.length,
      outstandingTotal,
    });
    setLoading(false);
    drawAll(); // redraw with fresh data
  };

  /* ---------------- derived aggregations ---------------- */

  // last 12 months labels (YYYY-MM)
  const months = useMemo(() => {
    const L: string[] = [];
    const base = new Date();
    // use UTC first-of-month for stability
    base.setUTCDate(1);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(
        Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1)
      );
      L.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      );
    }
    return L;
  }, []);

  // invoices per month
  const monthlyCounts = useMemo(() => {
    const m = new Map<string, number>();
    months.forEach((key) => m.set(key, 0));
    invoices.forEach((r) => {
      const key = toMonthKey(r.issued_at);
      if (key && m.has(key)) m.set(key, (m.get(key) ?? 0) + 1);
    });
    return months.map((k) => m.get(k) ?? 0);
  }, [invoices, months]);

  // status distribution (all time in current dataset)
  const statusDist = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((r) => {
      const s = safeStatus(r.status);
      map.set(s, (map.get(s) ?? 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    // sort by value desc
    arr.sort((a, b) => b.value - a.value);
    return arr;
  }, [invoices]);

  // AR aging buckets by outstanding (amount_due)
  const agingBuckets = useMemo(() => {
    const buckets = { Current: 0, "1–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
    const now = Date.now();
    invoices.forEach((r) => {
      const due = r.due_at ? new Date(r.due_at).getTime() : NaN;
      const bal = Number(r.amount_due || 0);
      if (!bal || isNaN(due)) return;
      const days = Math.floor((now - due) / 86400000);
      if (days <= 0) buckets["Current"] += bal;
      else if (days <= 30) buckets["1–30"] += bal;
      else if (days <= 60) buckets["31–60"] += bal;
      else if (days <= 90) buckets["61–90"] += bal;
      else buckets["90+"] += bal;
    });
    const labels = Object.keys(buckets);
    const values = labels.map((k) =>
      round2(buckets[k as keyof typeof buckets])
    );
    return { labels, values };
  }, [invoices]);

  // Top 10 customers by outstanding
  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((r) => {
      const name = (r.contact_name ?? "Unknown").trim() || "Unknown";
      const bal = Number(r.amount_due || 0);
      if (bal > 0) map.set(name, (map.get(name) ?? 0) + bal);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 10);
  }, [invoices]);

  // Currency totals (by total amount)
  const currencyTotals = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((r) => {
      const ccy = (r.currency_code ?? "UNK").toUpperCase();
      const total = Number(r.total || 0);
      if (total > 0) map.set(ccy, (map.get(ccy) ?? 0) + total);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: round2(value),
    }));
    arr.sort((a, b) => b.value - a.value);
    return arr;
  }, [invoices]);

  // Contacts: type breakdown + email coverage
  const contactSplit = useMemo(() => {
    let customer = 0,
      supplier = 0,
      both = 0,
      other = 0;
    contacts.forEach((c) => {
      const isC = !!c.is_customer;
      const isS = !!c.is_supplier;
      if (isC && isS) both++;
      else if (isC) customer++;
      else if (isS) supplier++;
      else other++;
    });
    return [
      { name: "Customer", value: customer },
      { name: "Supplier", value: supplier },
      { name: "Both", value: both },
      { name: "Other", value: other },
    ];
  }, [contacts]);

  const emailCoverage = useMemo(() => {
    let withEmail = 0,
      noEmail = 0;
    contacts.forEach((c) => (c.email ? withEmail++ : noEmail++));
    return [
      { name: "With email", value: withEmail },
      { name: "No email", value: noEmail },
    ];
  }, [contacts]);

  /* ── keys for effect deps (avoid complex expressions in arrays) ── */
  const agingLabelsKey = useMemo(
    () => agingBuckets.labels.join("|"),
    [agingBuckets.labels]
  );
  const agingValuesKey = useMemo(
    () => agingBuckets.values.join("|"),
    [agingBuckets.values]
  );
  const topCustomersKey = useMemo(
    () => JSON.stringify(topCustomers),
    [topCustomers]
  );
  const currencyTotalsKey = useMemo(
    () => JSON.stringify(currencyTotals),
    [currencyTotals]
  );
  const contactSplitKey = useMemo(
    () => JSON.stringify(contactSplit),
    [contactSplit]
  );
  const emailCoverageKey = useMemo(
    () => JSON.stringify(emailCoverage),
    [emailCoverage]
  );

  /* ---------------- ECharts lifecycle & drawing ---------------- */

  // keep a ref to drawAll so mount effect doesn't depend on it
  const drawAllRef = useRef<() => void>(() => {});
  useEffect(() => {
    drawAllRef.current = drawAll;
  });

  useEffect(() => {
    const onResize = () => {
      cOverview.current?.resize();
      cMonthly.current?.resize();
      cStatus.current?.resize();
      cAging.current?.resize();
      cTopCust.current?.resize();
      cContacts.current?.resize();
    };
    window.addEventListener("resize", onResize);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onTheme = () => drawAllRef.current();
    mq?.addEventListener?.("change", onTheme);

    const mo = new MutationObserver(() => drawAllRef.current());
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("resize", onResize);
      mq?.removeEventListener?.("change", onTheme);
      mo.disconnect();
      // dispose on unmount
      cOverview.current?.dispose();
      cMonthly.current?.dispose();
      cStatus.current?.dispose();
      cAging.current?.dispose();
      cTopCust.current?.dispose();
      cContacts.current?.dispose();
    };
  }, []);

  useEffect(() => {
    drawAll();
  }, [
    echartsReady,
    isDark,
    summary,
    monthlyCounts,
    statusDist,
    agingLabelsKey,
    agingValuesKey,
    topCustomersKey,
    currencyTotalsKey,
    contactSplitKey,
    emailCoverageKey,
  ]);

  function drawAll() {
    const echarts = (window as WindowWithECharts).echarts;
    if (!echarts || !echartsReady) return;

    /* Overview bar */
    if (refOverview.current) {
      cOverview.current?.dispose();
      cOverview.current = echarts.init(refOverview.current);
      cOverview.current.setOption({
        backgroundColor: "transparent",
        aria: { enabled: true },
        title: {
          text: "Overview",
          left: "center",
          textStyle: { color: axisText, fontWeight: 600 },
        },
        tooltip: { trigger: "axis" },
        toolbox: {
          right: 10,
          feature: {
            saveAsImage: {},
            dataView: { readOnly: true },
            restore: {},
            magicType: { type: ["line", "bar"] },
          },
        },
        grid: { left: 40, right: 20, top: 60, bottom: 40 },
        xAxis: {
          type: "category",
          data: ["Invoices", "Open", "Overdue", "Contacts"],
          axisLabel: { color: axisText },
          axisLine: { lineStyle: { color: gridLine } },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: axisText },
          splitLine: { lineStyle: { color: gridLine } },
        },
        series: [
          {
            name: "Count",
            type: "bar",
            universalTransition: true,
            itemStyle: {
              borderRadius: [6, 6, 0, 0],
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: isDark ? "#34d399" : "#10b981" },
                  { offset: 1, color: isDark ? "#059669" : "#34d399" },
                ],
              },
            },
            label: { show: true, position: "top", color: axisText },
            data: [
              summary.invoices,
              summary.openInvoices,
              summary.overdueInvoices,
              summary.contacts,
            ],
          },
        ],
        animationDuration: 600,
        animationEasing: "quarticOut",
      });
    }

    /* 12-month line (invoices created) */
    if (refMonthly.current) {
      cMonthly.current?.dispose();
      cMonthly.current = echarts.init(refMonthly.current);
      cMonthly.current.setOption({
        backgroundColor: "transparent",
        aria: { enabled: true },
        title: {
          text: "Invoices (Last 12 Months)",
          left: "center",
          textStyle: { color: axisText, fontWeight: 600 },
          subtext: "Drag to zoom • Hover for details",
          subtextStyle: { color: subText },
        },
        tooltip: { trigger: "axis" },
        toolbox: {
          right: 10,
          feature: {
            saveAsImage: {},
            dataZoom: { yAxisIndex: "none" },
            restore: {},
            magicType: { type: ["line", "bar"] },
          },
        },
        grid: { left: 48, right: 18, top: 70, bottom: 60 },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: months,
          axisLabel: { color: axisText },
          axisLine: { lineStyle: { color: gridLine } },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: axisText },
          splitLine: { lineStyle: { color: gridLine } },
        },
        dataZoom: [
          { type: "inside", start: 0, end: 100 },
          { type: "slider", start: 0, end: 100, bottom: 8 },
        ],
        series: [
          {
            name: "Invoices",
            type: "line",
            smooth: true,
            showSymbol: false,
            universalTransition: true,
            lineStyle: { width: 3 },
            areaStyle: { opacity: 0.35 },
            data: monthlyCounts,
          },
        ],
        animationDuration: 600,
        animationEasing: "quarticOut",
      });
    }

    /* Status donut */
    if (refStatus.current) {
      cStatus.current?.dispose();
      cStatus.current = echarts.init(refStatus.current);
      cStatus.current.setOption({
        backgroundColor: "transparent",
        aria: { enabled: true },
        title: {
          text: "Invoice Status",
          left: "center",
          textStyle: { color: axisText, fontWeight: 600 },
        },
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        legend: { type: "scroll", bottom: 0, textStyle: { color: axisText } },
        toolbox: { right: 10, feature: { saveAsImage: {}, restore: {} } },
        series: [
          {
            type: "pie",
            radius: ["40%", "65%"],
            avoidLabelOverlap: true,
            universalTransition: true,
            label: {
              color: axisText,
              formatter: "{b|{b}}\n{c} ({d}%)",
              rich: { b: { fontWeight: 600, color: axisText } },
            },
            data: statusDist,
          },
        ],
      });
    }

    /* AR Aging */
    if (refAging.current) {
      cAging.current?.dispose();
      cAging.current = echarts.init(refAging.current);
      cAging.current.setOption({
        backgroundColor: "transparent",
        aria: { enabled: true },
        title: {
          text: "A/R Aging (Outstanding)",
          left: "center",
          textStyle: { color: axisText, fontWeight: 600 },
        },
        tooltip: {
          trigger: "axis",
          valueFormatter: (v: unknown) => formatMoney(Number(v)),
        },
        toolbox: {
          right: 10,
          feature: {
            saveAsImage: {},
            restore: {},
            magicType: { type: ["line", "bar"] },
          },
        },
        grid: { left: 52, right: 20, top: 60, bottom: 36 },
        xAxis: {
          type: "category",
          data: agingBuckets.labels,
          axisLabel: { color: axisText },
          axisLine: { lineStyle: { color: gridLine } },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: axisText },
          splitLine: { lineStyle: { color: gridLine } },
        },
        series: [
          {
            name: "Outstanding",
            type: "bar",
            universalTransition: true,
            itemStyle: { borderRadius: [6, 6, 0, 0] },
            label: {
              show: true,
              position: "top",
              color: axisText,
              formatter: (p: { value: number }) => shortMoney(Number(p.value)),
            },
            data: agingBuckets.values,
          },
        ],
      });
    }

    /* Top customers by outstanding */
    if (refTopCust.current) {
      cTopCust.current?.dispose();
      cTopCust.current = echarts.init(refTopCust.current);
      const labels = topCustomers.map((t) => t.name);
      const values = topCustomers.map((t) => t.value);
      cTopCust.current.setOption({
        backgroundColor: "transparent",
        aria: { enabled: true },
        title: {
          text: "Top Customers by Outstanding",
          left: "center",
          textStyle: { color: axisText, fontWeight: 600 },
        },
        tooltip: {
          trigger: "axis",
          valueFormatter: (v: unknown) => formatMoney(Number(v)),
        },
        toolbox: { right: 10, feature: { saveAsImage: {}, restore: {} } },
        grid: { left: 140, right: 24, top: 60, bottom: 24 },
        xAxis: {
          type: "value",
          axisLabel: { color: axisText },
          splitLine: { lineStyle: { color: gridLine } },
        },
        yAxis: {
          type: "category",
          data: labels,
          axisLabel: { color: axisText },
          axisLine: { lineStyle: { color: gridLine } },
        },
        series: [
          {
            type: "bar",
            barWidth: 14,
            label: {
              show: true,
              position: "right",
              color: axisText,
              formatter: (p: { value: number }) => shortMoney(Number(p.value)),
            },
            data: values,
          },
        ],
      });
    }

    /* Contacts: type + email coverage (two rings) */
    if (refContacts.current) {
      cContacts.current?.dispose();
      cContacts.current = echarts.init(refContacts.current);
      cContacts.current.setOption({
        backgroundColor: "transparent",
        aria: { enabled: true },
        title: {
          text: "Contacts Overview",
          left: "center",
          textStyle: { color: axisText, fontWeight: 600 },
          subtext: "Inner: Types • Outer: Email Coverage",
          subtextStyle: { color: subText },
        },
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        legend: { type: "scroll", bottom: 0, textStyle: { color: axisText } },
        toolbox: { right: 10, feature: { saveAsImage: {}, restore: {} } },
        series: [
          {
            name: "Type",
            type: "pie",
            selectedOffset: 6,
            radius: ["25%", "45%"],
            label: { color: axisText },
            data: contactSplit,
          },
          {
            name: "Email",
            type: "pie",
            radius: ["55%", "75%"],
            label: { color: axisText },
            data: emailCoverage,
          },
        ],
      });
    }
  }

  /* ---------------- JSX ---------------- */
  return (
    <div className="w-full max-w-none px-0 md:px-6">
      <Script
        src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"
        strategy="afterInteractive"
        onLoad={() => setEchartsReady(true)}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Xero Analytics</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Invoices" value={nFmt(summary.invoices)} />
        <StatCard label="Open" value={nFmt(summary.openInvoices)} />
        <StatCard label="Overdue" value={nFmt(summary.overdueInvoices)} />
        <StatCard
          label="Outstanding"
          value={formatMoney(summary.outstandingTotal)}
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={refOverview} className="h-[340px] w-full" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Invoices Trend (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={refMonthly} className="h-[340px] w-full" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={refStatus} className="h-[360px] w-full" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>A/R Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={refAging} className="h-[340px] w-full" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader>
            <CardTitle>Top Customers by Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={refTopCust} className="h-[380px] w-full" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader>
            <CardTitle>Contacts (Type &amp; Email Coverage)</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={refContacts} className="h-[380px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────── tiny UI helpers ─────────────────── */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ─────────────────── utils ─────────────────── */
function nFmt(n: number) {
  return new Intl.NumberFormat().format(n);
}
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function toMonthKey(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function safeStatus(s: string | null | undefined) {
  const v = String(s ?? "").trim().toUpperCase();
  if (["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"].includes(v)) return v;
  if (v === "AUTHORIZED") return "AUTHORISED";
  if (["DELETED", "CANCELED", "CANCELLED"].includes(v)) return "VOIDED";
  return "DRAFT";
}
function formatMoney(n: number, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n || 0);
  } catch {
    return `${currency} ${(n || 0).toFixed(2)}`;
  }
}
function shortMoney(n: number) {
  // 12.3K / 4.5M style
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return formatMoney(n);
}
