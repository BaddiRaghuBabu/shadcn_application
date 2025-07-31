/* app/(auth)/layout.tsx */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Logo } from "@/components/logo";
import { Toaster } from "sonner";

interface Props {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: Props) {
  const router = useRouter();

  /* Redirect if already logged in */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router]);

  return (
    <div className="bg-primary-foreground container grid h-svh flex-col items-center justify-center lg:max-w-none lg:px-0">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[480px] lg:p-8">
        <div className="mb-4 flex items-center justify-center">
          <Logo width={24} height={24} className="mr-2" />
          <h1 className="text-xl font-medium">Shadcnblocks&nbsp;– Admin Kit</h1>
        </div>

        {children}

        <Toaster richColors position="top-center" />
      </div>
    </div>
  );
}
