// components/login-form.tsx
"use client";

import { HTMLAttributes, useState, useEffect } from "react";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { getOrSetDeviceId } from "@/lib/device";

/* ---------- validation ---------- */
const pwdSchema = z.object({
  email: z.string().email({ message: "Invalid email" }).min(1, "Email required"),
  password: z.string().min(1, "Password required"),
});
const otpSchema = z.object({
  code: z
    .string()
    .length(6, "6-digit code")
    .regex(/^\d+$/, "Digits only"),
});

type PwdVals = z.infer<typeof pwdSchema>;
type OtpVals = z.infer<typeof otpSchema>;
type Stage = "login" | "preOtpLoader" | "otp" | "postOtpLoader";

/* ---------- helpers -------------------------------------------- */
const isEmailNotVerifiedErr = (msg: string) =>
  /(email).*(not|un).*confirm|verify/i.test(msg) ||
  /email.*not verified/i.test(msg) ||
  /confirm your email/i.test(msg);

export function LoginForm({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const [stage, setStage] = useState<Stage>("login");
  const [busy, setBusy] = useState<"pwd" | "send" | "verify" | "oauth" | null>(null);
  const [savedEmail, setSavedEmail] = useState("");
  const router = useRouter();

  /* forms */
  const pwdForm = useForm<PwdVals>({
    resolver: zodResolver(pwdSchema),
    defaultValues: { email: "", password: "" },
  });
  const otpForm = useForm<OtpVals>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  /* ---------- stage helpers ------------------------------------ */
  const showPreOtpLoader = (email: string) => {
    setStage("preOtpLoader");
    setTimeout(() => {
      setSavedEmail(email);
      setStage("otp");
    }, 1000);
  };

  const showPostLoaderThenRedirect = async () => {
    setStage("postOtpLoader");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  /* ---------- device registration ------------------------------ */
  const registerDevice = async (access_token: string, user_id: string) => {
    try {
      const device_id = getOrSetDeviceId();
      await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
          "x-user-id": user_id, // your backend should verify token and ignore this if doing secure mapping
        },
        body: JSON.stringify({
          device_id,
          path: window.location.pathname,
          user_agent: navigator.userAgent,
        }),
      });
    } catch (e) {
      // swallow device registration failures
      // eslint-disable-next-line no-console
      console.warn("Device registration failed", e);
    }
  };

  /* ---------- Microsoft OAuth ---------------------------------- */
  const signInWithMicrosoft = async () => {
    setBusy("oauth");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${location.origin}/dashboard`,
      },
    });
    setBusy(null);
    if (error) toast.error("OAuth failed. Please try again.");
  };

  /* ---------- password login ----------------------------------- */
  const loginWithPassword = async (values: PwdVals) => {
    setBusy("pwd");
    const { data, error } = await supabase.auth.signInWithPassword(values);
    setBusy(null);

    if (error) {
      if (isEmailNotVerifiedErr(error.message)) {
        toast.warning("E-mail not verified. We’ve sent you a new verification code.");
        await sendOtp({ email: values.email });
        return;
      }
      toast.error("Invalid email or password.");
      return;
    }

    if (!data?.session || !data.user) {
      toast.error("Authentication failed. Please try again.");
      return;
    }

    // on success, register device with user id
    await registerDevice(data.session.access_token, data.user.id);

    const user = data.user;
    const display =
      user?.user_metadata?.full_name?.trim() || user?.email || "there";
    toast.success(`Welcome back, ${display}!`);
    showPostLoaderThenRedirect();
  };

  /* ---------- send OTP (auto-resend when not verified) ---------- */
  const sendOtp = async (values: { email: string }) => {
    setBusy("send");

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
    });

    setBusy(null);

    if (error) {
      toast.error("Unable to send code. Check your email and try again.");
      return;
    }

    toast.success("Verification code sent! Check your inbox.");
    showPreOtpLoader(values.email);
  };

  /* ---------- verify OTP --------------------------------------- */
  const verifyOtp = async (values: OtpVals) => {
    setBusy("verify");
    const { data, error } = await supabase.auth.verifyOtp({
      email: savedEmail,
      token: values.code,
      type: "email",
    });
    setBusy(null);

    if (error) {
      toast.error("Invalid or expired code.");
      return;
    }

    if (!data?.session || !data.user) {
      toast.error("Verification failed. Please retry.");
      return;
    }

    await registerDevice(data.session.access_token, data.user.id);

    const display =
      data.user?.user_metadata?.full_name?.trim() ||
      data.user?.email ||
      "there";
    toast.success(`Welcome back, ${display}!`);
    showPostLoaderThenRedirect();
  };

  /* ---------- effect: if user already has session (e.g., landed after OAuth) ---------- */
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && session.user) {
        await registerDevice(session.access_token, session.user.id);
        toast.success("Welcome back!");
        showPostLoaderThenRedirect();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- UI ------------------------------------------------ */
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {/* STEP 1 — email + password */}
      {stage === "login" && (
        <Form {...pwdForm}>
          <form
            onSubmit={pwdForm.handleSubmit(loginWithPassword)}
            className="grid gap-4"
          >
            {/* email */}
            <FormField
              control={pwdForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      autoComplete="username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* password */}
            <FormField
              control={pwdForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:opacity-75"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput
                      placeholder="********"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={busy === "pwd"} className="w-full">
              {busy === "pwd" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Log in
            </Button>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  or
                </span>
              </div>
            </div>

            {/* Microsoft OAuth button */}
            <Button
              variant="outline"
              type="button"
              className="w-full"
              disabled={busy === "oauth"}
              onClick={signInWithMicrosoft}
            >
              {busy === "oauth" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <span className="mr-2">🪟</span>
              Sign in with Microsoft
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline">
                Sign up
              </Link>
            </p>

            <p className="text-muted-foreground mt-4 px-8 text-center text-sm">
              By clicking login, you agree to our{" "}
              <a
                href="/terms"
                className="hover:text-primary underline underline-offset-4"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="hover:text-primary underline underline-offset-4"
              >
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </Form>
      )}

      {/* STEP 2½ — tiny loader (auto-resend OTP) */}
      {stage === "preOtpLoader" && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-20 w-20 animate-spin text-primary" />
          <p className="mt-6 text-sm text-muted-foreground">
            Preparing verification …
          </p>
        </div>
      )}

      {/* STEP 3 — OTP (only unverified) */}
      {stage === "otp" && (
        <Form {...otpForm}>
          <form
            onSubmit={otpForm.handleSubmit(verifyOtp)}
            className="grid gap-4"
          >
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <strong>{savedEmail}</strong>
            </p>

            <FormField
              control={otpForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup>
                        {[...Array(6)].map((_, i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={busy === "verify"} className="w-full">
              {busy === "verify" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify & Continue
            </Button>
          </form>
        </Form>
      )}

      {/* Final loader */}
      {stage === "postOtpLoader" && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-20 w-20 animate-spin text-primary" />
          <p className="mt-6 text-sm text-muted-foreground">
            Redirecting to your dashboard …
          </p>
        </div>
      )}
    </div>
  );
}
