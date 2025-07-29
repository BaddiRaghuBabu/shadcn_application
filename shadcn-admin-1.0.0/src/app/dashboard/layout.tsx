import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const {
    data: { session },
  } = await supabase.auth.getSession();

  /* 1️⃣  Not logged in?  Kick to /login */
  if (!session) redirect("/login");

  /* 2️⃣  Logged in → render the dashboard pages normally */
  return <>{children}</>;
}
