// src/app/(dashboard)/admin-users/page.tsx
"use client";

import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
  ShieldCheck,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type User = {
  id: string;
  email: string;
  status: "Active" | "Invited" | "Suspended";
  createdAt: string;
  lastSignIn?: string | null;
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

// soft “light” badge colors for each status
const statusStyles: Record<
  User["status"],
  { badge: string; dot: string; label: string }
> = {
  Active: {
    badge:
      "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Active",
  },
  Invited: {
    badge: "bg-sky-100 text-sky-700 hover:bg-sky-100 border-sky-200",
    dot: "bg-sky-500",
    label: "Invited",
  },
  Suspended: {
    badge: "bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200",
    dot: "bg-rose-500",
    label: "Suspended",
  },
};

NProgress.configure({ showSpinner: false, trickleSpeed: 120 });

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const pageSize = 25;

  const [allUsers, setAllUsers] = useState<User[]>([]);
  useEffect(() => {
    const loadUsers = async () => {
      try {
        NProgress.start();
        const res = await fetch("/api/admin-users");
        const data = await res.json();
        setAllUsers(data.users ?? []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load users", err);
      } finally {
        setLoading(false);
        NProgress.done();
      }
    };
    loadUsers();
  }, []);

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
    await new Promise((r) => setTimeout(r, 600));
    setPage(next);
    setLoading(false);
    NProgress.done();
  };

  const clearSelection = () => setSelected({});

  // ---------- Confirmation Dialog plumbing (returns true/false) ----------
  const [banOpen, setBanOpen] = useState(false);
  const [unbanOpen, setUnbanOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const [banText, setBanText] = useState("");

  const openBanConfirm = () =>
    new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setBanText("");
      setBanOpen(true);
    });

  const openUnbanConfirm = () =>
    new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setUnbanOpen(true);
    });

  const openResetConfirm = () =>
    new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setResetOpen(true);
    });

  const resolveConfirm = (value: boolean) => {
    resolverRef.current?.(value);
    setBanOpen(false);
    setUnbanOpen(false);
    setResetOpen(false);
  };

  const selectedUsers = useMemo(
    () => allUsers.filter((u) => selected[u.id]),
    [allUsers, selected]
  );

  // ---------------------- Actions ----------------------
  const banSelected = async () => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (ids.length === 0) return;

    const ok = await openBanConfirm(); // true | false
    if (!ok) return;

    try {
      setLoading(true);
      NProgress.start();
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "ban" }),
      });
      if (!res.ok) throw new Error("Failed to ban users");
      setAllUsers((prev) =>
        prev.map((u) => (ids.includes(u.id) ? { ...u, status: "Suspended" } : u))
      );
      toast.success("User(s) banned");
      clearSelection();
    } catch {
      toast.error("Failed to ban users");
    } finally {
      setLoading(false);
      NProgress.done();
    }
  };

  const unbanSelected = async () => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (ids.length === 0) return;

    const ok = await openUnbanConfirm(); // true | false
    if (!ok) return;

    try {
      setLoading(true);
      NProgress.start();
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "unban" }),
      });
      if (!res.ok) throw new Error("Failed to unban users");
      setAllUsers((prev) =>
        prev.map((u) => (ids.includes(u.id) ? { ...u, status: "Active" } : u))
      );
      toast.success("User(s) unbanned");
      clearSelection();
    } catch {
      toast.error("Failed to unban users");
    } finally {
      setLoading(false);
      NProgress.done();
    }
  };

  // ---------- Reset Password (NO toasts; pop-up confirm only) ----------
  const resetPasswordSelected = async () => {
    const emails = selectedUsers.map((u) => u.email);
    if (emails.length === 0) return;

    const ok = await openResetConfirm(); // true | false
    if (!ok) return;

    try {
      setLoading(true);
      NProgress.start();
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", emails }),
      });
      if (!res.ok) throw new Error("Failed to reset passwords");
      // No toast — per request. Just finish silently.
      clearSelection();
    } catch {
      // No toast — per request. You could show another dialog if you want.
      // For now, do nothing visible.
    } finally {
      setLoading(false);
      NProgress.done();
    }
  };

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
            <Button variant="outline" className="gap-2" onClick={banSelected}>
              <ShieldBan className="h-4 w-4" />
              Ban User
            </Button>
            <Button variant="outline" className="gap-2" onClick={unbanSelected}>
              <ShieldCheck className="h-4 w-4" />
              Unban User
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={resetPasswordSelected}
            >
              <RotateCw className="h-4 w-4" />
              Reset Password
            </Button>
            <Button variant="outline" className="gap-2" onClick={clearSelection}>
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
                  {([48, null, 200, 200, 160, 60] as const).map((w, i) => (
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
                          <TableCell className="align-middle ">
                            <div className="flex  gap-3 items-center">
                              <Mail className="mt-1 h-4 w-4 text-muted-foreground" />
                              <div className="text-xs ">
                                <div className="font-medium">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Account status */}
                          <TableCell className="align-middle">
                            <Badge
                              className={`gap-2 px-2.5 py-1 text-xs font-medium ${statusStyles[user.status].badge}`}
                              variant="outline"
                            >
                              <span className={`h-2 w-2 rounded-full ${statusStyles[user.status].dot}`} />
                              {statusStyles[user.status].label}
                            </Badge>
                          </TableCell>

                          {/* Created */}
                          <TableCell className="align-middle text-sm whitespace-nowrap">
                            {formatDate(user.createdAt)}
                          </TableCell>

                          {/* Last sign in */}
                          <TableCell className="align-middle text-sm whitespace-nowrap">
                            {formatDate(user.lastSignIn)}
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
                            <Skeleton className="h-6 w-24 rounded-full" />
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

      {/* ---------- Ban Confirm (requires typing BAN) ---------- */}
      <Dialog open={banOpen} onOpenChange={(o) => (!o ? resolveConfirm(false) : null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Ban {selectedUsers.length} User(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will prevent the selected user(s) from accessing the system. They will receive an error when trying to log in.
            </p>
            <div className="rounded-md border bg-muted/40 p-3 text-xs max-h-36 overflow-auto">
              {selectedUsers.map((u) => (
                <div key={u.id} className="truncate">{u.email}</div>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type <span className="font-semibold">BAN</span> to confirm</label>
              <Input value={banText} onChange={(e) => setBanText(e.target.value)} placeholder="BAN" />
            </div>
            <div className="text-xs text-red-600">You are about to ban {selectedUsers.length} user(s)</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => resolveConfirm(false)}>Cancel</Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={banText.trim().toUpperCase() !== "BAN"}
              onClick={() => resolveConfirm(true)}
            >
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Unban Confirm ---------- */}
      <Dialog open={unbanOpen} onOpenChange={(o) => (!o ? resolveConfirm(false) : null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Confirm to unban user</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The user will have access to your project again once unbanned. Are you sure you want to unban the selected user(s)?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => resolveConfirm(false)}>Cancel</Button>
            <Button
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => resolveConfirm(true)}
            >
              Unban user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Reset Password Confirm (no toasts) ---------- */}
      <Dialog open={resetOpen} onOpenChange={(o) => (!o ? resolveConfirm(false) : null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Send password reset to {selectedUsers.length} user(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We will email a password reset link to the selected user(s).
            </p>
            <div className="rounded-md border bg-muted/40 p-3 text-xs max-h-36 overflow-auto">
              {selectedUsers.map((u) => (
                <div key={u.id} className="truncate">{u.email}</div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => resolveConfirm(false)}>Cancel</Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => resolveConfirm(true)}>
              Send reset link(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
