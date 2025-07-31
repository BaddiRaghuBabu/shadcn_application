/* components/login-form.tsx
   Password login  +  Email-OTP login
   Scenarios:
     1. User not found  → redirect to /register
     2. Login success  → toast “Welcome back, <name|email>”
     3. Email not verified → resend OTP & go to OTP flow
------------------------------------------------------------------*/
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/* ---------- validation ---------- */
const pwdSchema = z.object({
  email: z.string().email().min(1, "Email required"),
  password: z.string().min(1, "Password required"),
});
const emailSchema = z.object({
  email: z.string().email().min(1, "Email required"),
});
const otpSchema = z.object({
  code: z.string().length(6, "6-digit code").regex(/^\d+$/, "Digits only"),
});

type PwdVals = z.infer<typeof pwdSchema>;
type EmailVals = z.infer<typeof emailSchema>;
type OtpVals = z.infer<typeof otpSchema>;

type Stage =
  | "login"
  | "emailOtp"
  | "preOtpLoader"
  | "otp"
  | "postOtpLoader";

/* ---------- helpers -------------------------------------------- */
function isUserNotFoundErr(msg: string) {
  return /(user).*(not|no).*found/i.test(msg) ||
         /invalid login credentials/i.test(msg); // newest wording
}
function isEmailNotVerifiedErr(msg: string) {
  return /(email).*(not|un).*confirm|verify/i.test(msg);
}

export function LoginForm({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const [stage, setStage] = useState<Stage>("login");
  const [busy, setBusy] = useState<"pwd" | "send" | "verify" | null>(null);
  const [savedEmail, setSavedEmail] = useState("");
  const router = useRouter();

  /* forms */
  const pwdForm = useForm<PwdVals>({
    resolver: zodResolver(pwdSchema),
    defaultValues: { email: "", password: "" },
  });
  const emailForm = useForm<EmailVals>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const otpForm = useForm<OtpVals>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  /* ---------- stage helpers ------------------------------------ */
  function showPreOtpLoader(email: string) {
    setStage("preOtpLoader");
    setTimeout(() => {
      setSavedEmail(email);
      setStage("otp");
    }, 1000);
  }
  function showPostLoaderThenRedirect() {
    setStage("postOtpLoader");
    setTimeout(() => router.push("/dashboard"), 1000);
  }

  /* ---------- password login ----------------------------------- */
  async function loginWithPassword(values: PwdVals) {
    setBusy("pwd");
    const { data, error } = await supabase.auth.signInWithPassword(values);
    setBusy(null);

    if (error) {
      /* 1️⃣  user not registered → redirect to /register */
      if (isUserNotFoundErr(error.message)) {
        toast.warning("User not found. Redirecting to sign-up…");
        router.push("/register");
        return;
      }

      /* 2️⃣  email exists but not verified → resend code & OTP flow */
      if (isEmailNotVerifiedErr(error.message)) {
        toast.warning(
          "E-mail not verified. We’ve sent you a new verification code."
        );
        await sendOtp({ email: values.email });
        return;
      }

      /* fallback */
      return toast.error(error.message);
    }

    /* 🎉 login success */
    const user = data?.user;
    const display =
      user?.user_metadata?.full_name?.trim() || user?.email || "there";
    toast.success(`Welcome back, ${display}!`);
    showPostLoaderThenRedirect();
  }

  /* ---------- send OTP ----------------------------------------- */
  async function sendOtp(values: EmailVals) {
    setBusy("send");

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
    });

    setBusy(null);

    if (error) {
      if (isUserNotFoundErr(error.message)) {
        toast.warning("User not found. Redirecting to sign-up…");
        router.push("/register");
        return;
      }
      return toast.error(error.message);
    }

    toast.success("Verification code sent! Check your inbox.");
    showPreOtpLoader(values.email);
  }

  /* ---------- verify OTP --------------------------------------- */
  async function verifyOtp(values: OtpVals) {
    setBusy("verify");
    const { data, error } = await supabase.auth.verifyOtp({
      email: savedEmail,
      token: values.code,
      type: "email",
    });
    setBusy(null);

    if (error) return toast.error(error.message);

    /* success toast */
    const display =
      data.user?.user_metadata?.full_name?.trim() ||
      data.user?.email ||
      "there";
    toast.success(`Welcome back, ${display}!`);
    showPostLoaderThenRedirect();
  }

  /* ---------- UI (unchanged except for toasts) ------------------ */
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {/* STEP 1 — email + password */}
      {stage === "login" && (
        <Form {...pwdForm}>
          <form
            onSubmit={pwdForm.handleSubmit(loginWithPassword)}
            className="grid gap-4"
          >
            {/* Email */}
            <FormField
              control={pwdForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
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
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={busy === "pwd"}>
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

            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => setStage("emailOtp")}
            >
              Magic Code (Email OTP)
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="underline">
                Sign up
              </Link>
            </p>
          </form>
        </Form>
      )}

      {/* STEP 2 — email for OTP */}
      {stage === "emailOtp" && (
        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit(sendOtp)}
            className="grid gap-4"
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={busy === "send"}>
              {busy === "send" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Code
            </Button>

            <Button
              variant="link"
              type="button"
              className="justify-start p-0 text-sm"
              disabled={busy !== null}
              onClick={() => setStage("login")}
            >
              ← Back to password login
            </Button>
          </form>
        </Form>
      )}

      {/* STEP 2½ — loader */}
      {stage === "preOtpLoader" && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-20 w-20 animate-spin text-primary" />
          <p className="mt-6 text-sm text-muted-foreground">
            Preparing verification …
          </p>
        </div>
      )}

      {/* STEP 3 — OTP input */}
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

            <Button type="submit" disabled={busy === "verify"}>
              {busy === "verify" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify & Continue
            </Button>

            <Button
              variant="link"
              type="button"
              className="justify-start p-0 text-sm"
              disabled={busy === "send"}
              onClick={() => {
                emailForm.setValue("email", savedEmail);
                sendOtp({ email: savedEmail });
              }}
            >
              Resend code
            </Button>
          </form>
        </Form>
      )}

      {/* STEP 4 — post-login loader */}
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
