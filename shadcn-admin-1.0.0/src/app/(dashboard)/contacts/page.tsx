"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  type ReactNode,
} from "react";
import {
  Search,
  Download,
  Filter,
  Mail,
  Phone,
  Building2,
  Globe,
  Eye,
  Copy,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Tag as TagIcon,
  Columns,
  ArrowUpDown,
  BookmarkCheck,
  Trash2,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

/* ────────────────── Types ────────────────── */
type Contact = {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  tags: string[];
  isCustomer: boolean;
  isSupplier: boolean;
  isArchived: boolean;
  updatedAt: string; // ISO
  balance: number;
};

type TypeFilter =
  | "all"
  | "customer"
  | "supplier"
  | "both"
  | "other"
  | "archived";

type SortKey = "name" | "company" | "country" | "updatedAt" | "balance";

type ColumnsState = {
  name: boolean;
  company: boolean;
  email: boolean;
  phone: boolean;
  country: boolean;
  type: boolean;
  tags: boolean;
  balance: boolean;
  updatedAt: boolean;
};

type ViewState = {
  type: TypeFilter;
  country: string | "all";
  selectedTags: string[];
  hasEmail: boolean;
  hasPhone: boolean;
  hasBalance: boolean;
  cols: ColumnsState;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  pageSize: number;
};

type ContactRow = {
  contact_id: string;
  name: string | null;
  email: string | null;
  is_customer: boolean | null;
  is_supplier: boolean | null;
};

const defaultCols: ColumnsState = {
  name: true,
  company: true,
  email: true,
  phone: true,
  country: true,
  type: true,
  tags: true,
  balance: true,
  updatedAt: true,
};

/* ────────────────── Page (READ ONLY) ────────────────── */
export default function ContactsReadOnlyPage() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [country, setCountry] = useState<string | "all">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasBalance, setHasBalance] = useState(false);
  const [dense, setDense] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openContact, setOpenContact] = useState<Contact | null>(null);
  const [cols, setCols] = useState<ColumnsState>(defaultCols);

  // Saved views
  const [views, setViews] = useState<string[]>(
    (() => {
      if (typeof window === "undefined") return [];
      const j = localStorage.getItem("xero_contact_views");
      return j ? (JSON.parse(j) as string[]) : [];
    })(),
  );
  const [activeView, setActiveView] = useState<string>("Default");

  // Debounced search
  const debRef = useRef<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => setQuery(searchInput), 250);
    return () => {
      if (debRef.current) window.clearTimeout(debRef.current);
    };
  }, [searchInput]);

  // Load contacts from Supabase
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("xero_contacts")
        .select("contact_id, name, email, is_customer, is_supplier");

      if (error) {
        toast.error("Failed to load contacts");
        setContacts([]);
      } else {
        const rows: ContactRow[] = (data ?? []) as unknown as ContactRow[];
        const mapped: Contact[] = rows.map((c) => ({
          id: c.contact_id,
          name: c.name ?? "",
          company: null,
          email: c.email ?? null,
          phone: null,
          country: null,
          tags: [],
          isCustomer: Boolean(c.is_customer),
          isSupplier: Boolean(c.is_supplier),
          isArchived: false,
          updatedAt: new Date().toISOString(),
          balance: 0,
        }));
        setContacts(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Derived lists
  const countries = useMemo(
    () =>
      Array.from(
        new Set(contacts.map((c) => c.country).filter(Boolean)),
      ) as string[],
    [contacts],
  );
  const allTags = useMemo(
    () => Array.from(new Set(contacts.flatMap((c) => c.tags))).sort(),
    [contacts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = contacts.filter((c) => {
      const matchesType =
        type === "all"
          ? true
          : type === "customer"
          ? c.isCustomer && !c.isSupplier && !c.isArchived
          : type === "supplier"
          ? c.isSupplier && !c.isCustomer && !c.isArchived
          : type === "both"
          ? c.isCustomer && c.isSupplier && !c.isArchived
          : type === "archived"
          ? c.isArchived
          : !c.isCustomer && !c.isSupplier && !c.isArchived;

      const matchesQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q);

      const matchesCountry = country === "all" ? true : (c.country || "") === country;
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((t) => c.tags.includes(t));
      const emailOk = hasEmail ? !!c.email : true;
      const phoneOk = hasPhone ? !!c.phone : true;
      const balanceOk = hasBalance ? c.balance > 0 : true;

      return (
        matchesType &&
        matchesQ &&
        matchesCountry &&
        matchesTags &&
        emailOk &&
        phoneOk &&
        balanceOk
      );
    });

    list = list.sort((a, b) => {
      if (sortBy === "balance") {
        const cmp = (a.balance ?? 0) - (b.balance ?? 0);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const A = (a[sortBy] ?? "") as string;
      const B = (b[sortBy] ?? "") as string;
      const cmp = String(A).localeCompare(String(B));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [
    contacts,
    query,
    type,
    country,
    selectedTags,
    hasEmail,
    hasPhone,
    hasBalance,
    sortBy,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // KPIs
  const kpi = useMemo(() => {
    const count = filtered.length;
    const withEmail = filtered.filter((c) => !!c.email).length;
    const withPhone = filtered.filter((c) => !!c.phone).length;
    const owingAmt = filtered
      .filter((c) => c.balance > 0)
      .reduce((s, c) => s + c.balance, 0);
    return { count, withEmail, withPhone, owingAmt };
  }, [filtered]);

  function toggleSort(col: SortKey) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
  }

  function exportCSV() {
    type ExportMap = {
      name: string;
      company: string;
      email: string;
      phone: string;
      country: string;
      type: string;
      tags: string;
      balance: number;
      updatedAt: string;
    };
    type ColumnKey = keyof ColumnsState;
    type ExportKey = keyof ExportMap;

    const columnOrder = (
      Object.entries(cols) as [ColumnKey, boolean][]
    )
      .filter(([, v]) => v)
      .map(([k]) => k) as ExportKey[];

    const headers = columnOrder.map((k) => headerLabel(k));

    const rows = filtered.map<(string | number)[]>((c) => {
      const map: ExportMap = {
        name: c.name,
        company: c.company ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        country: c.country ?? "",
        type: getType(c),
        tags: c.tags.join(";"),
        balance: c.balance,
        updatedAt: c.updatedAt,
      };
      return columnOrder.map((k) => map[k]);
    });

    const csv = [headers, ...rows]
      .map((r) => r.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts_read_only.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveCurrentView() {
    const name = prompt("Save current filters as view name:");
    if (!name) return;
    const state: ViewState = {
      type,
      country,
      selectedTags,
      hasEmail,
      hasPhone,
      hasBalance,
      cols,
      sortBy,
      sortDir,
      pageSize,
    };
    localStorage.setItem(`xero_contact_view_${name}`, JSON.stringify(state));
    const next = Array.from(new Set([...views, name]));
    setViews(next);
    localStorage.setItem("xero_contact_views", JSON.stringify(next));
    setActiveView(name);
    toast.success(`Saved view: ${name}`);
  }

  function deleteView(name: string) {
    localStorage.removeItem(`xero_contact_view_${name}`);
    const next = views.filter((v) => v !== name);
    setViews(next);
    localStorage.setItem("xero_contact_views", JSON.stringify(next));
    if (name === activeView) {
      applyView("Default");
      setActiveView("Default");
    }
    toast.success(`Deleted view: ${name}`);
  }

  function applyView(name: string) {
    if (name === "Default") {
      setType("all");
      setCountry("all");
      setSelectedTags([]);
      setHasEmail(false);
      setHasPhone(false);
      setHasBalance(false);
      setCols(defaultCols);
      setSortBy("name");
      setSortDir("asc");
      setPageSize(10);
      setActiveView("Default");
      setPage(1);
      return;
    }
    const j = localStorage.getItem(`xero_contact_view_${name}`);
    if (!j) return;
    const s = JSON.parse(j) as ViewState;
    setType(s.type);
    setCountry(s.country);
    setSelectedTags(s.selectedTags);
    setHasEmail(s.hasEmail);
    setHasPhone(s.hasPhone);
    setHasBalance(s.hasBalance);
    setCols({ ...defaultCols, ...(s.cols as Partial<ColumnsState>) });
    setSortBy(s.sortBy);
    setSortDir(s.sortDir);
    setPageSize(s.pageSize);
    setActiveView(name);
    setPage(1);
  }

  /* ── Sticky left offset (no fake padding; real-time) ── */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [_stickyOffset, setStickyOffset] = useState(0);

  useLayoutEffect(() => {
    const getSidebarWidth = () => {
      const varVal = getComputedStyle(
        document.documentElement,
      ).getPropertyValue("--sidebar-width").trim();
      if (varVal) {
        const num = parseFloat(varVal);
        if (!Number.isNaN(num)) return num;
      }
      const el =
        (document.querySelector("[data-sidebar]") as HTMLElement) ||
        (document.querySelector(
          "aside[role='navigation']",
        ) as HTMLElement) ||
        (document.querySelector("aside") as HTMLElement) ||
        (document.querySelector(
          "nav[aria-label='Sidebar']",
        ) as HTMLElement);
      return el ? el.getBoundingClientRect().width : 0;
    };

    const calc = () => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const sidebarW = getSidebarWidth();
      const overlap =
        rect.left < sidebarW ? sidebarW - Math.max(0, rect.left) : 0;
      const v = Math.max(0, Math.round(overlap));
      setStickyOffset(v);
      scroller.style.setProperty("--sticky-offset", `${v}px`);
    };

    calc();
    const onResize = () => calc();
    window.addEventListener("resize", onResize);

    const ro = new ResizeObserver(() => calc());
    if (scrollRef.current) ro.observe(scrollRef.current);

    const sidebar =
      (document.querySelector("[data-sidebar]") as HTMLElement) ||
      (document.querySelector(
        "aside[role='navigation']",
      ) as HTMLElement) ||
      (document.querySelector("aside") as HTMLElement) ||
      (document.querySelector(
        "nav[aria-label='Sidebar']",
      ) as HTMLElement);
    if (sidebar) ro.observe(sidebar);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Contacts (Read-only)
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, filter, sort, export, quick views, and quick look drawer.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <BookmarkCheck className="h-4 w-4" />
                  {activeView}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Views</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => applyView("Default")}>
                  Default
                </DropdownMenuItem>

                {views.map((v) => (
                  <DropdownMenuItem
                    key={v}
                    className="pl-2 pr-1"
                    onClick={() => applyView(v)}
                  >
                    <span className="flex-1 truncate">{v}</span>
                    <button
                      className="ml-2 rounded p-1 hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteView(v);
                      }}
                      title={`Delete "${v}"`}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={saveCurrentView}>
                  Save current as new…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Contacts" value={kpi.count.toLocaleString()} />
          <Kpi label="With email" value={kpi.withEmail.toLocaleString()} />
          <Kpi label="With phone" value={kpi.withPhone.toLocaleString()} />
          <Kpi label="Owing total" value={fmtMoney(kpi.owingAmt)} />
        </div>

        {/* Toolbar */}
        <Card className="mt-6">
          <CardHeader className="pb-0">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or company…"
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => {
                    setPage(1);
                    setSearchInput(e.target.value);
                  }}
                />
              </div>

              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <Filter className="mr-2 h-4 w-4" />
                    Type: {typeLabel(type)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(
                    [
                      "all",
                      "customer",
                      "supplier",
                      "both",
                      "other",
                      "archived",
                    ] as TypeFilter[]
                  ).map((t) => (
                    <DropdownMenuItem
                      key={t}
                      onClick={() => {
                        setPage(1);
                        setType(t);
                      }}
                    >
                      {typeLabel(t)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Country Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <Globe className="mr-2 h-4 w-4" />
                    Country: {country === "all" ? "All" : country}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-72 overflow-auto"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setPage(1);
                      setCountry("all");
                    }}
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {countries.map((c) => (
                    <DropdownMenuItem
                      key={c}
                      onClick={() => {
                        setPage(1);
                        setCountry(c);
                      }}
                    >
                      {c}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tags Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <TagIcon className="mr-2 h-4 w-4" />
                    {selectedTags.length
                      ? `${selectedTags.length} Tag(s)`
                      : "Tags"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Filter by tags</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allTags.map((t) => (
                    <DropdownMenuCheckboxItem
                      key={t}
                      checked={selectedTags.includes(t)}
                      onCheckedChange={(v) =>
                        setSelectedTags((prev) =>
                          v ? [...prev, t] : prev.filter((x) => x !== t),
                        )
                      }
                    >
                      {t}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Separator className="mt-4" />

            {/* Quick toggles + rows/columns */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="grid w-full gap-3 md:w-auto md:grid-cols-3">
                <ToggleLine
                  label="Has email"
                  checked={hasEmail}
                  onChange={(v) => {
                    setPage(1);
                    setHasEmail(v);
                  }}
                />
                <ToggleLine
                  label="Has phone"
                  checked={hasPhone}
                  onChange={(v) => {
                    setPage(1);
                    setHasPhone(v);
                  }}
                />
                <ToggleLine
                  label="Has outstanding balance"
                  checked={hasBalance}
                  onChange={(v) => {
                    setPage(1);
                    setHasBalance(v);
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Compact</span>
                  <Switch checked={dense} onCheckedChange={setDense} />
                </label>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Columns className="h-4 w-4" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(Object.keys(cols) as Array<keyof ColumnsState>).map(
                      (k) => (
                        <DropdownMenuCheckboxItem
                          key={k}
                          checked={cols[k]}
                          onCheckedChange={(v) =>
                            setCols((p) => ({ ...p, [k]: Boolean(v) }))
                          }
                        >
                          {headerLabel(k)}
                        </DropdownMenuCheckboxItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="hidden text-sm text-muted-foreground md:block">
                  Rows
                </div>
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
          </CardHeader>

          <CardContent>
            {/* Table */}
            <div className="relative">
              <div ref={scrollRef} className="rounded-md border overflow-hidden">
                <Table className={`table-fixed w-full ${dense ? "text-sm" : ""}`}>
                  {/* Column widths total ~100% so no X-scroll */}
                  <colgroup>
                    {cols.name && <col className="w-[18%]" />}
                    {cols.company && <col className="w-[12%]" />}
                    {cols.email && <col className="w-[16%]" />}
                    {cols.phone && <col className="w-[10%]" />}
                    {cols.country && <col className="w-[8%]" />}
                    {cols.type && <col className="w-[6%]" />}
                    {cols.tags && <col className="w-[10%]" />}
                    {cols.balance && <col className="w-[8%]" />}
                    {cols.updatedAt && <col className="w-[8%]" />}
                    <col className="w-[4%]" />
                  </colgroup>

                  <TableHeader className="sticky top-0 z-20 bg-background">
                    <TableRow>
                      {cols.name && (
                        <ThSticky
                          label="Name"
                          active={sortBy === "name"}
                          dir={sortDir}
                          onSort={() => toggleSort("name")}
                          className="w-[18%]"
                        />
                      )}
                      {cols.company && (
                        <Th
                          label="Company"
                          active={sortBy === "company"}
                          dir={sortDir}
                          onSort={() => toggleSort("company")}
                          className="w-[12%]"
                        />
                      )}
                      {cols.email && <Th label="Email" className="w-[16%]" />}
                      {cols.phone && <Th label="Phone" className="w-[10%]" />}
                      {cols.country && (
                        <Th
                          label="Country"
                          active={sortBy === "country"}
                          dir={sortDir}
                          onSort={() => toggleSort("country")}
                          className="w-[8%]"
                        />
                      )}
                      {cols.type && <Th label="Type" className="w-[6%]" />}
                      {cols.tags && <Th label="Tags" className="w-[10%]" />}
                      {cols.balance && (
                        <Th
                          label="Balance"
                          className="w-[8%] text-right"
                          active={sortBy === "balance"}
                          dir={sortDir}
                          onSort={() => toggleSort("balance")}
                        />
                      )}
                      {cols.updatedAt && (
                        <Th
                          label="Updated"
                          active={sortBy === "updatedAt"}
                          dir={sortDir}
                          onSort={() => toggleSort("updatedAt")}
                          className="w-[8%]"
                        />
                      )}
                      <Th label="" className="w-[4%]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-6" colSpan={12}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : pageData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          className="h-28 text-center text-muted-foreground"
                        >
                          No contacts match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageData.map((c) => (
                        <TableRow key={c.id} className="hover:bg-muted/30">
                          {cols.name && (
                            <TdSticky className="w-[18%] overflow-hidden">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarFallback>
                                    {initials(c.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">
                                    {c.name}
                                  </div>
                                  {c.company ? (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">
                                        {c.company}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </TdSticky>
                          )}

                          {cols.company && (
                            <TableCell className="w-[12%] overflow-hidden">
                              <span className="block truncate">
                                {c.company || "—"}
                              </span>
                            </TableCell>
                          )}

                          {cols.email && (
                            <TableCell className="w-[16%] overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                {c.email ? (
                                  <>
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <button
                                      className="block min-w-0 flex-1 truncate text-left hover:underline"
                                      onClick={() =>
                                        (window.location.href = `mailto:${c.email}`)
                                      }
                                    >
                                      {c.email}
                                    </button>
                                    <IconButton
                                      title="Copy email"
                                      onClick={() =>
                                        copyToClipboard(c.email as string)
                                      }
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </IconButton>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}

                          {cols.phone && (
                            <TableCell className="w-[10%] overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                {c.phone ? (
                                  <>
                                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <a
                                      className="block min-w-0 flex-1 truncate hover:underline"
                                      href={`tel:${(c.phone || "").replace(/\s/g, "")}`}
                                    >
                                      {c.phone}
                                    </a>
                                    <IconButton
                                      title="Copy phone"
                                      onClick={() =>
                                        copyToClipboard(c.phone as string)
                                      }
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </IconButton>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}

                          {cols.country && (
                            <TableCell className="w-[8%] overflow-hidden">
                              <span className="block truncate">
                                {c.country || "—"}
                              </span>
                            </TableCell>
                          )}

                          {cols.type && (
                            <TableCell className="w-[6%] overflow-hidden">
                              <TypeBadge contact={c} />
                            </TableCell>
                          )}

                          {cols.tags && (
                            <TableCell className="w-[10%] overflow-hidden">
                              <div className="flex flex-wrap gap-1">
                                {c.tags.length ? (
                                  c.tags.map((t) => (
                                    <Badge
                                      key={t}
                                      variant="secondary"
                                      className="px-2 py-0.5"
                                    >
                                      <span className="truncate max-w-[8rem]">
                                        {t}
                                      </span>
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}

                          {cols.balance && (
                            <TableCell
                              className={`w-[8%] text-right ${
                                c.balance > 0 ? "font-medium" : ""
                              }`}
                            >
                              {fmtMoney(c.balance)}
                            </TableCell>
                          )}

                          {cols.updatedAt && (
                            <TableCell className="w-[8%] overflow-hidden text-sm text-muted-foreground">
                              <span className="block truncate">
                                {timeAgo(c.updatedAt)}
                              </span>
                            </TableCell>
                          )}

                          <TableCell className="w-[4%] text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setOpenContact(c)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium">
                  {(page - 1) * pageSize + 1}
                </span>
                –
                <span className="font-medium">
                  {Math.min(page * pageSize, filtered.length)}
                </span>{" "}
                of <span className="font-medium">{filtered.length}</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="mx-2 min-w-[90px] text-center text-sm">
                  Page {page} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick View */}
      <Sheet
        open={!!openContact}
        onOpenChange={(o) => !o && setOpenContact(null)}
      >
        <SheetContent className="w-[520px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {initials(openContact?.name || "")}
                </AvatarFallback>
              </Avatar>
              {openContact?.name || "Contact"}
            </SheetTitle>
            <SheetDescription>Read-only contact details</SheetDescription>
          </SheetHeader>

          {openContact && (
            <div className="mt-5 space-y-4">
              <InfoRow label="Name" value={openContact.name} />
              <InfoRow label="Company" value={openContact.company || "—"} />
              <InfoRow
                label="Email"
                value={
                  openContact.email ? (
                    <span className="inline-flex items-center gap-2">
                      <a
                        className="hover:underline"
                        href={`mailto:${openContact.email}`}
                      >
                        {openContact.email}
                      </a>
                      <IconButton
                        title="Copy"
                        onClick={() =>
                          copyToClipboard(openContact.email as string)
                        }
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </IconButton>
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow
                label="Phone"
                value={
                  openContact.phone ? (
                    <span className="inline-flex items-center gap-2">
                      <a
                        className="hover:underline"
                        href={`tel:${openContact.phone.replace(/\s/g, "")}`}
                      >
                        {openContact.phone}
                      </a>
                      <IconButton
                        title="Copy"
                        onClick={() =>
                          copyToClipboard(openContact.phone as string)
                        }
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </IconButton>
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow label="Country" value={openContact.country || "—"} />
              <InfoRow
                label="Tags"
                value={
                  openContact.tags.length ? (
                    openContact.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="mr-1">
                        {t}
                      </Badge>
                    ))
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow label="Type" value={<TypeBadge contact={openContact} />} />
              <InfoRow
                label="Outstanding balance"
                value={fmtMoney(openContact.balance)}
              />
              <InfoRow label="Updated" value={timeAgo(openContact.updatedAt)} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

/* ────────────────── Small UI bits ────────────────── */

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-2xl font-semibold">{value}</div>
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
        <span className="truncate">{label}</span>
        {onSort ? (
          <ArrowUpDown
            className={`h-3.5 w-3.5 ${active ? "" : "text-muted-foreground"}`}
          />
        ) : null}
      </div>
    </TableHead>
  );
}

function ThSticky({
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
      style={{ left: "var(--sticky-offset, 0px)" }}
      className={[
        "sticky z-30 bg-background relative",
        "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border",
        "select-none",
        onSort ? "cursor-pointer" : "",
        className ?? "",
      ].join(" ")}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <div className="flex items-center gap-1">
        <span className="truncate">{label}</span>
        {onSort ? (
          <ArrowUpDown
            className={`h-3.5 w-3.5 ${active ? "" : "text-muted-foreground"}`}
          />
        ) : null}
      </div>
    </TableHead>
  );
}

function TdSticky({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <TableCell
      style={{ left: "var(--sticky-offset, 0px)" }}
      className={[
        "sticky z-20 bg-background relative",
        "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border",
        "whitespace-normal",
        className,
      ].join(" ")}
    >
      {children}
    </TableCell>
  );
}

function ToggleLine({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded p-1 hover:bg-muted"
      type="button"
    >
      {children}
    </button>
  );
}

function TypeBadge({ contact }: { contact: Contact }) {
  const t = getType(contact);
  const styles: Record<string, string> = {
    Customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Supplier: "bg-blue-50 text-blue-700 border-blue-200",
    Both: "bg-purple-50 text-purple-700 border-purple-200",
    Other: "bg-gray-100 text-gray-700 border-gray-200",
    Archived: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <Badge variant="secondary" className={`border ${styles[t]} px-2`}>
      {t}
    </Badge>
  );
}

function typeLabel(t: TypeFilter) {
  switch (t) {
    case "all":
      return "All";
    case "customer":
      return "Customer";
    case "supplier":
      return "Supplier";
    case "both":
      return "Both";
    case "other":
      return "Other";
    case "archived":
      return "Archived";
  }
}

function getType(c: Contact) {
  if (c.isArchived) return "Archived";
  if (c.isCustomer && c.isSupplier) return "Both";
  if (c.isCustomer) return "Customer";
  if (c.isSupplier) return "Supplier";
  return "Other";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function fmtMoney(n: number, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function headerLabel(k: keyof Contact | string) {
  const map: Record<string, string> = {
    name: "Name",
    company: "Company",
    email: "Email",
    phone: "Phone",
    country: "Country",
    type: "Type",
    tags: "Tags",
    balance: "Balance",
    updatedAt: "Updated",
  };
  return map[k] ?? String(k);
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).then(() => {
    toast.success("Copied");
  });
}
