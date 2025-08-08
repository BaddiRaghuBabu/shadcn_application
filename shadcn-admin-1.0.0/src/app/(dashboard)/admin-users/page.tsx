// src/app/(dashboard)/admin-users/page.tsx
"use client";

import { useMemo, useState } from "react";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Info,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ShieldBan,
  RotateCw,
  X,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type User = {
  id: string;
  email: string;
  status: "Active" | "Invited" | "Suspended";
  createdAt: string;
  lastSignIn?: string;
};

const makeUsers = (count = 123): User[] => {
  const names = [
    "hazel.howard",
    "tiffany.phillips",
    "natalie.brooks",
    "michael.rodriguez",
    "rachel.green",
    "nathan.cooper",
    "emily.cook",
    "henry.white",
    "emily.cox",
    "ian.richardson",
    "skylar.cox",
    "amelia.harris",
    "liam.martin",
    "sophia.lewis",
    "noah.walker",
    "mia.thomas",
  ];
  const base = "Aug 8 2025, 03:00";
  return new Array(count).fill(0).map((_, i) => ({
    id: `${i + 1}`,
    email: `demo-user-${names[i % names.length]}.${1754647200 + i}@supamode.demo`,
    status: "Active",
    createdAt: base,
    lastSignIn: "-",
  }));
};

NProgress.configure({ showSpinner: false, trickleSpeed: 120 });

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const pageSize = 25;

  const allUsers = useMemo(() => makeUsers(), []);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? allUsers.filter((u) => u.email.toLowerCase().includes(q)) : allUsers;
  }, [allUsers, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const allVisibleChecked = visible.length > 0 && visible.every((u) => selected[u.id]);
  const hasSomeVisibleChecked = visible.some((u) => selected[u.id]);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  // Drives header checkbox (true | false | "indeterminate")
  const headerChecked: boolean | "indeterminate" =
    allVisibleChecked ? true : hasSomeVisibleChecked ? "indeterminate" : false;

  const changePage = async (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    setLoading(true);
    NProgress.start();
    await new Promise((r) => setTimeout(r, 600)); // replace with real fetch if needed
    setPage(next);
    setLoading(false);
    NProgress.done();
  };

  const clearSelection = () => setSelected({});

  return (
    <div className="w-full h-full flex flex-col">
      {/* nprogress green bar */}
      <style jsx global>{`
        #nprogress .bar {
          background: rgb(16 185 129);
          height: 3px;
        }
        #nprogress .peg {
          box-shadow: 0 0 10px rgb(16 185 129), 0 0 5px rgb(16 185 129);
        }
      `}</style>

      <div className="pb-3 pl-4 pt-2">
        <div className="ml-1 flex items-center">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </div>
        <h1 className="text-2xl font-sans leading-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage and monitor all users in your application.
        </p>
      </div>

      <Card className="w-full h-full border-0 shadow-none">
        {/* Selection toolbar */}
        {selectedCount > 0 && (
          <div className="mb-3 flex items-center gap-6 rounded-none border bg-card px-4 py-2.5 text-sm">
            <div className="font-medium">{selectedCount} user(s) selected</div>
            <div className="h-5 w-px bg-border" />
            <Button variant="outline" className="gap-2">
              <ShieldBan className="h-4 w-4" />
              Ban User
            </Button>
            <Button variant="outline" className="gap-2">
              <RotateCw className="h-4 w-4" />
              Reset Password
            </Button>
            <Button variant="ghost" className="gap-2" onClick={clearSelection}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        )}

        {/* Search */}
        <CardHeader className="pb-3 px-0">
          <div className="relative w-full sm:w-80 ml-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all..."
              className="pl-9"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
            />
          </div>
        </CardHeader>

        {/* Table */}
        <CardContent className="pt-0 px-0">
          <div className="w-full rounded-none border overflow-hidden">
            {/* scrollable container */}
            <div className="relative max-h-[560px] overflow-auto">
              <Table className="w-full table-fixed">
                {/* locked widths to keep alignment */}
                <colgroup>
                  {([48, null, 180, 200, 160, 60] as const).map((w, i) => (
                    <col key={i} {...(w ? { style: { width: w } } : {})} />
                  ))}
                </colgroup>

                {/* sticky header that stays visible while scrolling */}
                <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
                  <TableRow>
                    <TableHead className="font-medium">
                      <Checkbox
                        checked={headerChecked}
                        onCheckedChange={(c) => {
                          const checked = Boolean(c);
                          setSelected((prev) => {
                            const next = { ...prev };
                            visible.forEach((u) => (next[u.id] = checked));
                            return next;
                          });
                        }}
                        aria-label="Select all visible"
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                    </TableHead>
                    <TableHead className="font-medium">Email</TableHead>
                    <TableHead className="font-medium">Account Status</TableHead>
                    <TableHead className="font-medium">Created</TableHead>
                    <TableHead className="font-medium">Last Sign In</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {!loading
                    ? visible.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/40">
                          <TableCell className="align-middle">
                            <Checkbox
                              checked={!!selected[user.id]}
                              onCheckedChange={(c) =>
                                setSelected((s) => ({ ...s, [user.id]: Boolean(c) }))
                              }
                              aria-label={`Select ${user.email}`}
                              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                          </TableCell>

                          {/* Email */}
                          <TableCell className="align-middle">
                            <div className="flex items-start gap-3">
                              <Mail className="mt-1 h-4 w-4 text-muted-foreground" />
                              <div className="leading-tight">
                                <div className="font-medium">demo-user-</div>
                                <div className="text-muted-foreground text-sm">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Account status */}
                          <TableCell className="align-middle">
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              {user.status}
                            </Badge>
                          </TableCell>

                          {/* Created */}
                          <TableCell className="align-middle text-sm whitespace-nowrap">
                            {user.createdAt}
                          </TableCell>

                          {/* Last sign in */}
                          <TableCell className="align-middle text-sm whitespace-nowrap">
                            {user.lastSignIn ?? "-"}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="align-middle text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="gap-2">
                                  <Info className="h-4 w-4" /> View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    : Array.from({ length: pageSize }).map((_, i) => (
                        <TableRow key={`sk-${i}`}>
                          <TableCell>
                            <Skeleton className="h-4 w-4 rounded" />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <Skeleton className="mt-1 h-4 w-4 rounded" />
                              <div className="flex flex-col gap-2 w-[420px] max-w-full">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-3/4" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-between border-t p-3 text-sm">
              <div className="text-muted-foreground">
                Page {clampedPage} of {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => changePage(1)}
                  disabled={clampedPage === 1 || loading}
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => changePage(clampedPage - 1)}
                  disabled={clampedPage === 1 || loading}
                  aria-label="Prev page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => changePage(clampedPage + 1)}
                  disabled={clampedPage === totalPages || loading}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => changePage(totalPages)}
                  disabled={clampedPage === totalPages || loading}
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
