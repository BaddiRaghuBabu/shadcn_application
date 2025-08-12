// app/(dashboard)/invoices/page.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Search,
  Filter,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Eye,
  BadgeCheck,
  Clock4,
  CircleAlert,
  ArrowUpDown,
  Columns,
  ExternalLink,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

/* ───────────────────── Types ───────────────────── */

type InvoiceStatus = "DRAFT" | "SUBMITTED" | "AUTHORISED" | "PAID" | "VOIDED";
type StatusFilter = "all" | InvoiceStatus;
type CurrencyFilter = "all" | "INR" | "USD";

type Invoice = {
  id: string;                // internal key only (not displayed)
  number: string;            // invoice_number
  contact: string;           // contact_name
  currency: string;          // currency_code
  date: string;              // issued_at (yyyy-mm-dd)
  dueDate: string;           // due_at (yyyy-mm-dd)
  status: InvoiceStatus;     // status
  amount: number;            // total
  balance: number;           // amount_due
  reference?: string | null; // reference
  updatedAt: string;         // updated_utc
  link?: string | null;
};

type XeroInvoiceRow = {
  invoice_id: string;
  invoice_number: string | null;
  contact_name: string | null;
  status: string | null;
  currency_code: string | null;
  amount_due: number | null;
  amount_paid: number | null;
  total: number | null;
  issued_at: string | null;     // timestamptz
  due_at: string | null;        // timestamptz
  updated_utc: string | null;   // timestamptz
  reference: string | null;
  created_at: string | null;
};

const STATUS_ORDER: Record<InvoiceStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  AUTHORISED: 2,
  PAID: 3,
  VOIDED: 4,
};

/* ───────────────────── Status Normalizer ───────────────────── */

function normalizeStatus(v: string | null | undefined): InvoiceStatus {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "DRAFT" || s === "SUBMITTED" || s === "AUTHORISED" || s === "PAID" || s === "VOIDED") {
    return s as InvoiceStatus;
  }
  // common variants
  if (s === "AUTHORIZED") return "AUTHORISED";
  if (s === "DELETED" || s === "CANCELLED" || s === "CANCELED") return "VOIDED";
  return "DRAFT";
}

/* ───────────────────── Page (READ-ONLY) ───────────────────── */

export default function InvoicesReadOnlyPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [currency, setCurrency] = useState<CurrencyFilter>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [dense, setDense] = useState(false);

  const [sortBy, setSortBy] = useState<keyof Invoice>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [open, setOpen] = useState<Invoice | null>(null);

  // Column visibility (toggle on/off) — NO tenant_id / invoice_id columns here.
  const [cols, setCols] = useState<Record<string, boolean>>({
    number: true,
    contact: true,
    date: true,
    dueDate: true,
    status: true,
    amount: true,
    balance: true,
    currency: true,
    reference: true,
    updatedAt: false,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Select ONLY display fields (no tenant_id). We still fetch invoice_id to use as a stable React key, but we DO NOT show it.
      const { data, error } = await supabase
        .from("xero_invoices")
        .select(`
          invoice_id,
          invoice_number,
          contact_name,
          status,
          currency_code,
          amount_due,
          amount_paid,
          total,
          issued_at,
          due_at,
          updated_utc,
          reference,
          created_at
        `)
        .order("issued_at", { ascending: false });

      if (error) {
        toast.error("Failed to load invoices");
        setInvoices([]);
      } else {
        const mapped: Invoice[] = (data as XeroInvoiceRow[]).map((inv) => ({
          id: inv.invoice_id, // internal only
          number: inv.invoice_number ?? "",
          contact: inv.contact_name ?? "",
          currency: inv.currency_code ?? "",
          date: toISODate(inv.issued_at),
          dueDate: toISODate(inv.due_at),
          status: normalizeStatus(inv.status), // normalized & safe
          amount: Number(inv.total ?? 0),
          balance: Number(inv.amount_due ?? 0),
          reference: inv.reference ?? null,
          updatedAt: inv.updated_utc ?? inv.created_at ?? new Date().toISOString(),
          link: null,
        }));
        setInvoices(mapped);
      }

      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = invoices.filter((i) => {
      const matchesQ =
        !q ||
        i.number.toLowerCase().includes(q) ||
        i.contact.toLowerCase().includes(q) ||
        (i.reference || "").toLowerCase().includes(q);

      const statusOk = status === "all" ? true : i.status === status;
      const ccyOk = currency === "all" ? true : i.currency === currency;

      const fromOk = !dateFrom || i.date >= dateFrom;
      const toOk = !dateTo || i.date <= dateTo;

      return matchesQ && statusOk && ccyOk && fromOk && toOk;
    });

    list = list.sort((a, b) => {
      let cmp = 0;
      const A = a[sortBy];
      const B = b[sortBy];

      if (sortBy === "status") {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      } else if (typeof A === "number" && typeof B === "number") {
        cmp = A - B;
      } else {
        cmp = String(A ?? "").localeCompare(String(B ?? ""));
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [invoices, query, status, currency, dateFrom, dateTo, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // KPIs
  const kpi = useMemo(() => {
    const count = filtered.length;
    const outstanding = filtered.reduce((s, i) => s + (i.balance || 0), 0);
    const overdue = filtered.filter(isOverdue);
    const overdueAmt = overdue.reduce((s, i) => s + (i.balance || 0), 0);
    return { count, outstanding, overdueCount: overdue.length, overdueAmt };
  }, [filtered]);

  function toggleSort(col: keyof Invoice) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir(col === "contact" || col === "number" ? "asc" : "desc");
    }
  }

  function exportCSV() {
    const headers = Object.entries(cols)
      .filter(([, v]) => v)
      .map(([k]) => headerLabel(k as keyof Invoice));

    const rows = filtered.map((i) => {
      const map: Record<string, string | number> = {
        number: i.number,
        contact: i.contact,
        date: i.date,
        dueDate: i.dueDate,
        status: i.status,
        amount: i.amount,
        balance: i.balance,
        currency: i.currency,
        reference: i.reference ?? "",
        updatedAt: i.updatedAt,
      };
      return Object.entries(cols)
        .filter(([, v]) => v)
        .map(([k]) => map[k]);
    });

    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Invoices</h1>
            <p className="mt-1 text-sm text-muted-foreground">Showing selected fields from Xero → Supabase</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={<ClipboardList className="h-5 w-5" />} label="Invoices" value={kpi.count.toLocaleString()} />
          <Kpi icon={<BadgeCheck className="h-5 w-5" />} label="Outstanding" value={fmtMoney(kpi.outstanding)} />
          <Kpi icon={<Clock4 className="h-5 w-5" />} label="Overdue count" value={kpi.overdueCount.toLocaleString()} />
          <Kpi icon={<CircleAlert className="h-5 w-5" />} label="Overdue amount" value={fmtMoney(kpi.overdueAmt)} />
        </div>

        {/* Toolbar */}
        <Card className="mt-6">
          <CardHeader className="pb-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice no., contact, reference…"
                  className="pl-9"
                  value={query}
                  onChange={(e) => {
                    setPage(1);
                    setQuery(e.target.value);
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setPage(1);
                    setStatus(v as StatusFilter);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"] as InvoiceStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
              </div>
              <div>
                <Input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Currency</span>
                <Select
                  value={currency}
                  onValueChange={(v) => {
                    setPage(1);
                    setCurrency(v as CurrencyFilter);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span>Compact rows</span>
                <Switch checked={dense} onCheckedChange={setDense} />
              </label>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <Columns className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.keys(cols).map((k) => (
                    <DropdownMenuCheckboxItem
                      key={k}
                      checked={cols[k]}
                      onCheckedChange={(v) => setCols((p) => ({ ...p, [k]: !!v }))}
                    >
                      {headerLabel(k as keyof Invoice)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent>
            {/* Table */}
            <div className="overflow-x-auto">
              <Table className={dense ? "text-sm" : ""}>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    {cols.number && <Th label="Invoice No." active={sortBy === "number"} dir={sortDir} onSort={() => toggleSort("number")} />}
                    {cols.contact && <Th label="Contact" active={sortBy === "contact"} dir={sortDir} onSort={() => toggleSort("contact")} />}
                    {cols.date && <Th label="Date" active={sortBy === "date"} dir={sortDir} onSort={() => toggleSort("date")} />}
                    {cols.dueDate && <Th label="Due" active={sortBy === "dueDate"} dir={sortDir} onSort={() => toggleSort("dueDate")} />}
                    {cols.status && <Th label="Status" active={sortBy === "status"} dir={sortDir} onSort={() => toggleSort("status")} />}
                    {cols.amount && <Th label="Amount" className="text-right" active={sortBy === "amount"} dir={sortDir} onSort={() => toggleSort("amount")} />}
                    {cols.balance && <Th label="Balance" className="text-right" active={sortBy === "balance"} dir={sortDir} onSort={() => toggleSort("balance")} />}
                    {cols.currency && <Th label="CCY" />}
                    {cols.reference && <Th label="Reference" />}
                    {cols.updatedAt && <Th label="Updated" active={sortBy === "updatedAt"} dir={sortDir} onSort={() => toggleSort("updatedAt")} />}
                    <Th label="" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-6" colSpan={12}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : pageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                        No invoices match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((i) => (
                      <TableRow key={i.id} className="hover:bg-muted/30">
                        {cols.number && <TableCell className="font-medium">{i.number}</TableCell>}
                        {cols.contact && <TableCell>{i.contact || "—"}</TableCell>}
                        {cols.date && <TableCell>{fmtDate(i.date)}</TableCell>}
                        {cols.dueDate && <TableCell className={isOverdue(i) ? "text-red-600" : ""}>{fmtDate(i.dueDate)}</TableCell>}
                        {cols.status && (
                          <TableCell>
                            <StatusBadge status={i.status} />
                          </TableCell>
                        )}
                        {cols.amount && <TableCell className="text-right">{fmtMoney(i.amount, i.currency)}</TableCell>}
                        {cols.balance && <TableCell className="text-right">{fmtMoney(i.balance, i.currency)}</TableCell>}
                        {cols.currency && <TableCell>{i.currency}</TableCell>}
                        {cols.reference && <TableCell>{i.reference || "—"}</TableCell>}
                        {cols.updatedAt && <TableCell className="text-muted-foreground">{timeAgo(i.updatedAt)}</TableCell>}
                        <TableCell className="w-0 text-right">
                          <Button size="icon" variant="ghost" onClick={() => setOpen(i)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span>–
                <span className="font-medium">{Math.min(page * pageSize, filtered.length)}</span>{" "}
                of <span className="font-medium">{filtered.length}</span>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="mx-2 min-w-[90px] text-center text-sm">Page {page} / {totalPages}</div>
                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="mx-2 h-6" />

                <span className="hidden text-sm text-muted-foreground sm:inline">Rows</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPage(1);
                    setPageSize(Number(v));
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* READ-ONLY Quick View */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-[560px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {open?.number || "Invoice"}
              {open?.status ? <StatusBadge status={open.status} className="ml-1" /> : null}
            </SheetTitle>
            <SheetDescription>Read-only invoice details</SheetDescription>
          </SheetHeader>

          {open && (
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Info label="Contact" value={open.contact || "—"} />
                <Info label="Date" value={fmtDate(open.date)} />
                <Info label="Due date" value={fmtDate(open.dueDate)} valueClass={isOverdue(open) ? "text-red-600" : ""} />
                <Info label="Currency" value={open.currency || "—"} />
                <Info label="Reference" value={open.reference || "—"} />
                <Info label="Amount" value={fmtMoney(open.amount, open.currency)} />
                <Info label="Outstanding" value={fmtMoney(open.balance, open.currency)} />
                <Info label="Updated" value={timeAgo(open.updatedAt)} />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (open?.link) window.open(open.link, "_blank");
                    else toast("No external link available");
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Xero
                </Button>
                <Button variant="outline" onClick={() => window.print()}>Print</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

/* ───────────────────── Small UI bits ───────────────────── */

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">{icon}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Th({
  label,
  onSort,
  active,
  dir,
  className,
}: {
  label: string;
  onSort?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  className?: string;
}) {
  return (
    <TableHead
      onClick={onSort}
      className={`select-none ${onSort ? "cursor-pointer" : ""} ${className ?? ""}`}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {onSort ? <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "" : "text-muted-foreground"}`} /> : null}
      </div>
    </TableHead>
  );
}

function StatusBadge({
  status,
  className = "",
}: {
  status: InvoiceStatus | string;
  className?: string;
}) {
  const norm = normalizeStatus(status as string);

  const map: Record<InvoiceStatus, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
    SUBMITTED: { label: "Submitted", className: "bg-blue-50 text-blue-700 border-blue-200" },
    AUTHORISED: { label: "Authorised", className: "bg-purple-50 text-purple-700 border-purple-200" },
    PAID: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" },
    VOIDED: { label: "Voided", className: "bg-red-50 text-red-700 border-red-200" },
  };
  const s = map[norm];

  return (
    <Badge variant="secondary" className={`border ${s.className} px-2 ${className}`}>
      {s.label}
    </Badge>
  );
}

function Info({ label, value, valueClass = "" }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm ${valueClass}`}>{value}</div>
    </div>
  );
}

/* ───────────────────── Utilities ───────────────────── */

function headerLabel(k: keyof Invoice | string) {
  const map: Record<string, string> = {
    number: "Invoice No.",
    contact: "Contact",
    date: "Date",
    dueDate: "Due",
    status: "Status",
    amount: "Amount",
    balance: "Balance",
    currency: "CCY",
    reference: "Reference",
    updatedAt: "Updated",
  };
  return map[k] ?? String(k);
}

function toISODate(v: string | null) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v.slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return v.slice(0, 10);
  }
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString();
  } catch {
    return iso;
  }
}

function isOverdue(i: Invoice) {
  return i.status !== "PAID" && i.dueDate && new Date(i.dueDate).getTime() < Date.now() && (i.balance || 0) > 0;
}

function fmtMoney(n: number, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${Number(n || 0).toFixed(2)}`;
  }
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}
