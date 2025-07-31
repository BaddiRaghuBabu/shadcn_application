/* components/register-form.tsx
   Unified sign-up (password or email-only) with a single
   “User already exists” check, then redirects to /login
------------------------------------------------------------------*/
"use client";

import { HTMLAttributes, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import type { User } from "@supabase/supabase-js"; // ✅ removes “any” warning

/* ---------- validation ---------- */
const pwdSchema = z
  .object({
    email: z.string().email().min(1, "Email required"),
    password: z.string().min(6, "Min 6 chars"),
    confirm: z.string().min(1, "Confirm password"),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["confirm"],
        message: "Passwords do not match",
      });
    }
  });

const emailSchema = z.object({
  email: z.string().email().min(1, "Email required"),
});
const otpSchema = z.object({
  code: z
    .string()
    .length(6, "6-digit code")
    .regex(/^\d+$/, "Digits only"),
});

type PwdVals = z.infer<typeof pwdSchema>;
type EmailVals = z.infer<typeof emailSchema>;
type OtpVals = z.infer<typeof otpSchema>;

type Stage = "signup" | "emailOtp" | "otp" | "redirect";

/* ---------- helpers -------------------------------------------- */
const explicitDuplicateErr = (msg: string) =>
  /already (registered|exists)/i.test(msg);

/** Supabase returns `identities: []` when the e-mail already exists */
const silentDuplicate = (user: User | null | undefined) =>
  Array.isArray(user?.identities) && user.identities.length === 0;

export function RegisterForm({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const [stage, setStage] = useState<Stage>("signup");
  const [busy, setBusy] = useState<"signup" | "send" | "verify" | null>(null);
  const [savedEmail, setSavedEmail] = useState("");
  const router = useRouter();

  /* forms */
  const pwdForm = useForm<PwdVals>({
    resolver: zodResolver(pwdSchema),
    defaultValues: { email: "", password: "", confirm: "" },
  });
  const emailForm = useForm<EmailVals>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const otpForm = useForm<OtpVals>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  /* loader then redirect */
  const goToLogin = () => {
    setStage("redirect");
    setTimeout(() => {
      toast.success("Account verified! Please sign in.");
      router.push("/login");
    }, 1000);
  };

  /* ---------- sign-up with password ----------------------------- */
  const signupWithPassword = async (values: PwdVals) => {
    setBusy("signup");

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    /* duplicate caught explicitly */
    if (error) {
      setBusy(null);
      if (explicitDuplicateErr(error.message)) {
        toast.warning("User already exists. Please sign in.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    /* silent duplicate */
    if (silentDuplicate(data?.user)) {
      setBusy(null);
      toast.warning("User already exists. Please sign in.");
      return;
    }

    /* brand-new user → send OTP */
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { shouldCreateUser: false },
    });

    setBusy(null);

    if (otpErr) {
      toast.error(otpErr.message);
      return;
    }

    setSavedEmail(values.email);
    toast.success("Verification code sent! Check your inbox.");
    setStage("otp");
  };

  /* ---------- email-only sign-up ------------------------------- */
  const sendOtp = async (values: EmailVals) => {
    setBusy("send");

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { shouldCreateUser: true },
    });

    setBusy(null);

    if (error) {
      if (explicitDuplicateErr(error.message)) {
        toast.warning("User already exists. Please sign in.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    setSavedEmail(values.email);
    toast.success("Verification code sent! Check your inbox.");
    setStage("otp");
  };

  /* ---------- verify OTP --------------------------------------- */
  const verifyOtp = async (values: OtpVals) => {
    setBusy("verify");
    const { error } = await supabase.auth.verifyOtp({
      email: savedEmail,
      token: values.code,
      type: "email",
    });
    setBusy(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    goToLogin();
  };

  /* ---------- UI ----------------------------------------------- */
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {/* STEP 1 — email + password */}
      {stage === "signup" && (
        <Form {...pwdForm}>
          <form
            onSubmit={pwdForm.handleSubmit(signupWithPassword)}
            className="grid gap-4"
          >
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

            <FormField
              control={pwdForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={pwdForm.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={busy === "signup"}>
              {busy === "signup" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Account
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
          </form>
        </Form>
      )}

      {/* STEP 2 — email-only path */}
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
              onClick={() => setStage("signup")}
            >
              ← Back to password sign-up
            </Button>
          </form>
        </Form>
      )}

      {/* STEP 3 — 6-digit code */}
      {stage === "otp" && (
        <Form {...otpForm}>
          <form
            onSubmit={otpForm.handleSubmit(verifyOtp)}
            className="grid gap-4"
          >
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to{" "}
              <strong>{savedEmail}</strong>
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

      {/* STEP 4 — redirect loader */}
      {stage === "redirect" && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-20 w-20 animate-spin text-primary" />
          <p className="mt-6 text-sm text-muted-foreground">
            Redirecting to sign-in…
          </p>
        </div>
      )}
    </div>
  );
}
