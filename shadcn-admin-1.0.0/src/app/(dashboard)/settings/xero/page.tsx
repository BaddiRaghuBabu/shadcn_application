import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export default async function XeroSettingsPage() {
  const supabase = getSupabaseAdminClient();
  const { data: token } = await supabase
    .from("xero_tokens")
    .select("id")
    .single();

  const connected = !!token;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Xero Connection</h2>
      <p className="text-muted-foreground">
        {connected ? "Your account is connected to Xero." : "No Xero connection found."}
      </p>
      <Link
        href="/api/xero/connect"
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {connected ? "Reconnect" : "Connect"}
      </Link>
    </div>
  );
}