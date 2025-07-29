"use client";

import { HTMLAttributes, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";

/* ---------- validation ---------- */
const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Please enter your email" })
    .email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(1, { message: "Please enter your password" })
    .min(7, { message: "Password must be at least 7 characters long" }),
});

export function UserAuthForm({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const router = useRouter();
  const [authLoading, setAuthLoading]   = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  /* ----- Email + Password login ----- */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setAuthLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Logged in successfully!");
    router.push("/dashboard");
  }

  /* ----- Magic‑link login ----- */
  async function handleMagicLink() {
    const email = form.getValues("email");

    if (!email) {
      form.setError("email", { message: "Please enter your email first" });
      return;
    }

    setMagicLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        /** 👇 When the user clicks the link they will land here.  
         *  Supabase JS will auto‑exchange the token for a session;
         *  your /dashboard page/layout can then read that session.
         */
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setMagicLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Magic link sent! Check your inbox.");
    }
  }

  /* ---------- render ---------- */
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground text-sm font-medium hover:opacity-75"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Login button */}
            <Button className="mt-2" disabled={authLoading}>
              {authLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Login
            </Button>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Magic‑link button */}
            <Button
              variant="outline"
              className="w-full"
              type="button"
              disabled={magicLoading}
              onClick={handleMagicLink}
            >
              {magicLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Magic Link
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
