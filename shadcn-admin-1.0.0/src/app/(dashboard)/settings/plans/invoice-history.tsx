"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FileText, DownloadCloud, ChevronDown } from "lucide-react";

interface Payment {
  id: string;
  created_at: string;
  plan_id: string;
  amount: number;
  status: "pending" | "success" | "failed";
}

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "success" | "failed" | "pending">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from<Payment>("payments")
        .select("id, created_at, plan_id, amount, status");
      if (error) {
        // eslint-disable-next-line no-console
        console.error("Supabase error:", error.message);
        setErrorMsg(error.message);
      } else {
        setInvoices(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return invoices
      .filter((inv) => (tab === "all" ? true : inv.status === tab))
      .filter(
        (inv) =>
          inv.id.toLowerCase().includes(search.toLowerCase()) ||
          inv.plan_id.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) =>
        sortDesc
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [invoices, tab, search, sortDesc]);

  if (errorMsg) {
    return (
      <div className="p-6 text-red-600">
        <strong>Failed to load invoices:</strong> {errorMsg}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Previous invoices</h2>
        <div className="flex items-center space-x-3">
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[200px]"
          />
          <Select onValueChange={(v) => setSortDesc(v === "desc")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={sortDesc ? "Most recent" : "Oldest"} />
              <ChevronDown className="ml-auto" size={16} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Most recent</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          setTab(v as "all" | "success" | "failed" | "pending")
        }
      >
        <TabsList>
          <TabsTrigger value="all">View all</TabsTrigger>
          <TabsTrigger value="success">Success</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
      </Tabs>

      <Separator />

      <div className="space-y-2">
        {loading ? (
          <p className="text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No invoices found.</p>
        ) : (
          filtered.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between py-3 border-b last:border-none"
            >
              <div className="flex items-center space-x-3">
                <FileText className="text-gray-400" size={24} />
                <span className="font-medium">Invoice {inv.id.slice(0, 8)}</span>
              </div>
              <div className="hidden md:flex items-center space-x-8 text-sm text-gray-600">
                <span>{format(new Date(inv.created_at), "dd MMM yyyy")}</span>
                <span className="capitalize">{inv.plan_id}</span>
                <span>₹ {(inv.amount / 100).toFixed(2)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  window.open(`/api/download-invoice?id=${inv.id}`, "_blank")
                }
              >
                <DownloadCloud size={20} />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}