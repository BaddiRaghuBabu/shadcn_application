import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function XeroInvoicesPage() {
  const supabase = getSupabaseAdminClient();
  const { data: invoices } = await supabase
    .from("xero_invoices")
    .select("invoice_id, invoice_number, status, amount_due")
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Xero Invoices</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h2 className="text-xl font-bold tracking-tight">Invoices</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices?.map((inv) => (
            <TableRow key={inv.invoice_id}>
              <TableCell>{inv.invoice_number}</TableCell>
              <TableCell>{inv.status}</TableCell>
              <TableCell className="text-right">{inv.amount_due}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}