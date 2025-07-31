/* components/layout/dashboard-guard.tsx */
"use client";

import { useRequireAuth } from "@/hooks/use-require-auth";

/** Wrap any protected subtree with this component. */
export function DashboardGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  useRequireAuth();        // ⬅ redirects to /login when session is missing
  return <>{children}</>;
}
