"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  type Column as TanstackColumn,
  type Table as TanstackTable,
} from "@tanstack/react-table"
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  Copy,
} from "lucide-react"
import NProgress from "nprogress"
import "nprogress/nprogress.css"
import { toast } from "sonner"
import { supabase } from "@/lib/supabaseClient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
  import {
  Table as UiTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/* ----------------------- Types ----------------------- */

interface Account {
  account_id: string
  name: string | null
  fully_qualified_name: string | null
  account_type: string | null
  account_sub_type: string | null
  current_balance: number | null
}

interface Invoice {
  invoice_id: string
  doc_number: string | null
  customer_name: string | null
  total_amt: number | null
  balance: number | null;
  currency_code: string | null
}

/* ----------------------- Page ----------------------- */

export default function QuickBooksPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingA, setLoadingA] = useState(false)
  const [loadingI, setLoadingI] = useState(false)
  const [lastSyncA, setLastSyncA] = useState<Date | null>(null)
  const [lastSyncI, setLastSyncI] = useState<Date | null>(null)

  const loadAccounts = async () => {
    try {
           setLoadingA(true)
      NProgress.start()
      const { data, error } = await supabase
        .from("quickbooks_accounts")
        .select("*")
      if (error) throw error
      const list = (data ?? []).map(sanitizeAccount)
      setAccounts(list)
      setLastSyncA(new Date())
      toast.success(`Accounts loaded: ${list.length}`)
    } catch (e) {
      toast.error(
        `Accounts failed: ${e instanceof Error ? e.message : "Unknown error"}`
      )    } finally {
      setLoadingA(false)
      NProgress.done()
    }
  }

  const loadInvoices = async () => {
    try {
      setLoadingI(true)
      NProgress.start()
      const { data, error } = await supabase
        .from("quickbooks_invoices")
        .select("*")
      if (error) throw error
      const list = (data ?? []).map(sanitizeInvoice)
      setInvoices(list)
      setLastSyncI(new Date())
      toast.success(`Invoices loaded: ${list.length}`)
    } catch (e) {
      toast.error(
        `Invoices failed: ${e instanceof Error ? e.message : "Unknown error"}`
      )    } finally {
      setLoadingI(false)
      NProgress.done()
    }
  }

  useEffect(() => {
    void Promise.all([loadAccounts(), loadInvoices()])
  }, [])

  // KPI cards
  const totalAccounts = accounts.length
  const totalBalance = accounts.reduce(
    (s, a) => s + (a.current_balance ?? 0),
    0
  )
  const invCount = invoices.length
  const invTotalAmt = invoices.reduce((s, i) => s + (i.total_amt ?? 0), 0)
  const invOpenAmt = invoices.reduce((s, i) => s + (i.balance ?? 0), 0)

  return (
    <div className="space-y-6 p-6">
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">QuickBooks Dashboard</CardTitle>
              <CardDescription className="text-sm">
                Accounts &amp; Invoices from your QuickBooks company
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void loadAccounts();
                  void loadInvoices();
                }}
                disabled={loadingA || loadingI}
              >
                {(loadingA || loadingI) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh All
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              title="Accounts"
              value={formatNumberIN(totalAccounts)}
              hint={
                lastSyncA
                  ? `Synced ${lastSyncA.toLocaleString()}`
                  : "Not synced"
              }            />
            <Kpi
              title="Total Balance"
              value={formatINR(totalBalance)}
              hint="Sum of current balances"
            />
            <Kpi
              title="Invoices"
              value={formatNumberIN(invCount)}
              hint={
                lastSyncI
                  ? `Synced ${lastSyncI.toLocaleString()}`
                  : "Not synced"
              }            />
            <Kpi
              title="Open Balance"
              value={formatINR(invOpenAmt)}
              hint={`Total Amount: ${formatINR(invTotalAmt)}`}
            />
          </div>

          <Tabs defaultValue="accounts" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="accounts">Accounts</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  Company: QuickBooks
                </Badge>
              </div>
            </div>

            <TabsContent value="accounts" className="mt-4">
              <AccountsTable
                data={accounts}
                loading={loadingA}
                onRefresh={loadAccounts}
              />            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <InvoicesTable
                data={invoices}
                loading={loadingI}
                onRefresh={loadInvoices}
              />
             </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------- Accounts Table ----------------------- */

function AccountsTable({
  data,
  loading,
  onRefresh,
}: {
  data: Account[]
  loading: boolean
  onRefresh: () => void
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])
  const [globalFilter, setGlobalFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [subTypeFilter, setSubTypeFilter] = useState<string>("all")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    account_id: false,
    fully_qualified_name: true,
  });

  const filteredData = useMemo(() => {
    let d = data
    if (typeFilter !== "all")
      d = d.filter((r) => (r.account_type ?? "Unknown") === typeFilter)
    if (subTypeFilter !== "all")
      d = d.filter((r) => (r.account_sub_type ?? "Unknown") === subTypeFilter)
    return d
  }, [data, typeFilter, subTypeFilter])


  const types = useMemo(
    () => ["all", ...uniqStrings(data.map((d) => d.account_type ?? "Unknown"))],
    [data]
  );
  const subTypes = useMemo(
    () => [
      "all",
      ...uniqStrings(data.map((d) => d.account_sub_type ?? "Unknown")),
    ],
    [data]
  );

  const columns = useMemo<ColumnDef<Account>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <HeaderSorter label="Name" column={column} />,
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name ?? "Unnamed"}</div>
        ),
         },
      {
        accessorKey: "fully_qualified_name",
        header: "Full Name",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.fully_qualified_name ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "account_type",
        header: ({ column }) => <HeaderSorter label="Type" column={column} />,
        cell: ({ row }) => <Badge variant="outline">{row.original.account_type ?? "Unknown"}</Badge>,
      },
      {
        accessorKey: "account_sub_type",
        header: "Subtype",
        cell: ({ row }) => <span>{row.original.account_sub_type ?? "-"}</span>,
      },
      {
        accessorKey: "current_balance",
        header: ({ column }) => (
          <HeaderSorter label="Balance" column={column} />
        ),        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatINR(row.original.current_balance ?? 0)}
          </div>
         ),
      },
      {
        accessorKey: "account_id",
        header: "Account ID",
        cell: ({ row }) => <CopyCell text={row.original.account_id} />,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const v = String(row.getValue(columnId) ?? "").toLowerCase()
      return v.includes(String(filterValue ?? "").toLowerCase())
    },
  })

  const exportCSV = () => {
    const rows = table.getFilteredRowModel().rows.map((r) => r.original)
    const header = [
      "name",
      "fully_qualified_name",
      "account_type",
      "account_sub_type",
      "current_balance",
      "account_id",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.name ?? "",
          r.fully_qualified_name ?? "",
          r.account_type ?? "",
          r.account_sub_type ?? "",
          String(r.current_balance ?? 0),
          r.account_id,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ].join("\n");
    downloadCsv(csv, "quickbooks_accounts.csv")
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-2 md:w-auto">
          <SearchBox
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder="Search name, full name..."
          />
         <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All types" : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subTypeFilter} onValueChange={setSubTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Subtype" />
            </SelectTrigger>
            <SelectContent>
              {subTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All subtypes" : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || data.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          <ColumnToggle table={table} />

         <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={loading || data.length === 0}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
           Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        table={table}
        loading={loading}
        placeholder={
          <EmptyState
            title="No accounts to display"
            hint="Try syncing or adjusting filters."
          />
        }
      />
          </div>
  )
}

/* ----------------------- Invoices Table ----------------------- */

function InvoicesTable({
  data,
  loading,
  onRefresh,
}: {
  data: Invoice[]
  loading: boolean
  onRefresh: () => void
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "doc_number", desc: false },
  ])
  const [globalFilter, setGlobalFilter] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "paid">("all")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    invoice_id: false,
  })

  const filteredData = useMemo(() => {
  let d = data
    if (currencyFilter !== "all")
      d = d.filter((r) => (r.currency_code ?? "UNK") === currencyFilter)
    if (statusFilter === "open") d = d.filter((r) => (r.balance ?? 0) > 0)
    if (statusFilter === "paid") d = d.filter((r) => (r.balance ?? 0) <= 0)
    return d
  }, [data, currencyFilter, statusFilter])

  const currencies = useMemo(
    () => ["all", ...uniqStrings(data.map((d) => d.currency_code ?? "UNK"))],
    [data]
  )

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "doc_number",
           header: ({ column }) => (
          <HeaderSorter label="Invoice No." column={column} />
        ),
        cell: ({ row }) => (
          <div className="font-medium">{row.original.doc_number ?? "-"}</div>
        ),
      },
      {
        accessorKey: "customer_name",
        header: ({ column }) => (
          <HeaderSorter label="Customer" column={column} />),        
        cell: ({ row }) => <span>{row.original.customer_name ?? "-"}</span>,
      },
      {
        accessorKey: "total_amt",
        header: ({ column }) => <HeaderSorter label="Total" column={column} />,
        cell: ({ row }) => (
          <div className="tabular-nums">
            {formatCurrency(
              row.original.total_amt ?? 0,
              row.original.currency_code
            )}          
            </div>
        ),
      },
      {
        accessorKey: "balance",
        header: ({ column }) => (
          <HeaderSorter label="Balance" column={column} />
        ),        
        cell: ({ row }) => {
          const bal = row.original.balance ?? 0
          const isOpen = bal > 0.0001
          return (
            <div className="flex items-center gap-2">
                            <div className="tabular-nums">
                {formatCurrency(bal, row.original.currency_code)}
              </div>
              <Badge variant={isOpen ? "destructive" : "secondary"}>
                {isOpen ? "Open" : "Paid"}
              </Badge>
            </div>
          )
        },
      },
      {
        accessorKey: "currency_code",
        header: "Currency",
        cell: ({ row }) => <span>{row.original.currency_code ?? "-"}</span>,
      },
      {
        accessorKey: "invoice_id",
        header: "Invoice ID",
        cell: ({ row }) => <CopyCell text={row.original.invoice_id} />,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const v = String(row.getValue(columnId) ?? "").toLowerCase()
      return v.includes(String(filterValue ?? "").toLowerCase())
    },
  })

  const exportCSV = () => {
       const rows = table.getFilteredRowModel().rows.map((r) => r.original)
    const header = [
      "doc_number",
      "customer_name",
      "total_amt",
      "balance",
      "currency_code",
      "invoice_id",
    ]
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.doc_number ?? "",
          r.customer_name ?? "",
          String(r.total_amt ?? 0),
          String(r.balance ?? 0),
          r.currency_code ?? "",
          r.invoice_id,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ].join("\n")
    downloadCsv(csv, "quickbooks_invoices.csv")
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-2 md:w-auto">
          <SearchBox value={globalFilter} onChange={setGlobalFilter} placeholder="Search number, customer..." />
          <SearchBox
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder="Search number, customer..."
          />
          <Select
            value={statusFilter}
            onValueChange={(v: "all" | "open" | "paid") => setStatusFilter(v)}
          >  
           <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open only</SelectItem>
              <SelectItem value="paid">Paid only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "all" ? "All currencies" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={loading || data.length === 0}
          >            
          <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          <ColumnToggle table={table} />

          <Button size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}            
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        table={table}
        loading={loading}
        placeholder={
          <EmptyState
            title="No invoices to display"
            hint="Try syncing or adjusting filters."
          />
        }
      />   
       </div>
  )
}

/* ----------------------- Shared UI bits ----------------------- */

function Kpi({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint?: string
}) {
    return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="muted-foreground text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl leading-tight font-semibold">{value}</div>
        {hint && (
          <div className="text-muted-foreground mt-1 text-xs">{hint}</div>
        )}
      </CardContent>
    </Card>
  )
}

function HeaderSorter<TData>({
  label,
  column,
}: {
  label: string;
  column: TanstackColumn<TData, unknown>
}) {
  const sorted = column.getIsSorted?.()
  return (
    <button
      className="flex items-center gap-1 font-medium"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowDownAZ className="h-4 w-4" />
      ) : sorted === "desc" ? (
        <ArrowUpAZ className="h-4 w-4" />
      ) : null}
    </button>
  )
}

function CopyCell({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="bg-muted rounded px-2 py-0.5 text-xs">{text}</code>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          toast.success("Copied");
        }}
        aria-label="Copy"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ColumnToggle<TData>({ table }: { table: TanstackTable<TData> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <Separator className="my-1" />
        {table
          .getAllLeafColumns()
          .filter((c) => c.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
            >
              {column.id.replaceAll("_", " ")}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative w-full md:w-72">
          <Search className="absolute top-2.5 left-2 h-4 w-4 opacity-60" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

function DataTable<TData>({
  table,
  loading,
  placeholder,
}: {
  table: TanstackTable<TData>
  loading: boolean
  placeholder: ReactNode
}) {
  return (
    <>
      <div className=" bg-card rounded-xl border">
        <UiTable>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}                 
                      
                   </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <LoadingRows colSpan={table.getAllLeafColumns().length} />
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}                    
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length}>
                  {placeholder}
                </TableCell>             
             </TableRow>
            )}
          </TableBody>
        </UiTable>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length} result
          {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >            
           <SelectTrigger className="w-28">
              <SelectValue placeholder="Rows per page" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >             
             Prev
            </Button>
            <span className="px-2 text-sm">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}           
             </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >             
             Next
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function LoadingRows({ colSpan }: { colSpan: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan}>
            <div className="flex items-center gap-4">
               <div className="bg-muted h-3 w-40 animate-pulse rounded" />
              <div className="bg-muted h-6 w-20 animate-pulse rounded" />
              <div className="bg-muted h-3 w-56 animate-pulse rounded" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-2 text-base font-medium">{title}</div>
      {hint && <p className="text-muted-foreground max-w-sm text-sm">{hint}</p>}    
      </div>
  )
}

/* ----------------------- Utils ----------------------- */

function sanitizeAccount(a: Account): Account {
  return {
    account_id: String(a.account_id),
    name: a.name ?? null,
    fully_qualified_name: a.fully_qualified_name ?? null,
    account_type: a.account_type ?? null,
    account_sub_type: a.account_sub_type ?? null,
    current_balance:
      typeof a.current_balance === "number"
        ? a.current_balance
        : Number(a.current_balance ?? 0),
  }
}

function sanitizeInvoice(i: Invoice): Invoice {
  return {
    invoice_id: String(i.invoice_id),
    doc_number: i.doc_number ?? null,
    customer_name: i.customer_name ?? null,
    total_amt:
      typeof i.total_amt === "number" ? i.total_amt : Number(i.total_amt ?? 0),   
       balance: typeof i.balance === "number" ? i.balance : Number(i.balance ?? 0),
    currency_code: i.currency_code ?? null,
  };
}

function uniqStrings(arr: string[]) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b))
}

function formatNumberIN(n: number) {
  return new Intl.NumberFormat("en-IN").format(n)
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n)}

function formatCurrency(n: number, code?: string | null) {
  if (!code)
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
      n
    )
    try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(n)  
 } catch {
    return `${n.toFixed(2)} ${code}`
  }
}

function escapeCsv(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
