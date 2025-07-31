/* components/forgot-password-form.tsx
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PasswordInput } from "@/components/password-input";

/* ---------- validation ---------- */
const emailSchema = z.object({
  email: z.string().email().min(1, "Email required"),
});
const otpSchema = z.object({
  code: z.string().length(6, "6‑digit code").regex(/^\d+$/, "Digits only"),
});
const pwdSchema = z
  .object({
    password: z.string().min(6, "Min 6 chars"),
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

type EmailVals = z.infer<typeof emailSchema>;
type OtpVals = z.infer<typeof otpSchema>;
type PwdVals = z.infer<typeof pwdSchema>;

type Stage =
  | "email"          // ask e‑mail
  | "preOtpLoader"   // 1 s loader
  | "otp"            // enter code
  | "password"       // enter new password
  | "postLoader";    // final loader

export function ForgotPasswordForm({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const [stage, setStage] = useState<Stage>("email");
  const [busy, setBusy] = useState<"send" | "verify" | "reset" | null>(null);
  const [savedEmail, setSavedEmail] = useState("");
  const router = useRouter();

  /* forms */
  const emailForm = useForm<EmailVals>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const otpForm = useForm<OtpVals>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });
  const pwdForm = useForm<PwdVals>({
    resolver: zodResolver(pwdSchema),
    defaultValues: { password: "", confirm: "" },
  });

  /* helpers */
  function showPreOtpLoader(email: string) {
    setStage("preOtpLoader");
    setTimeout(() => {
      setSavedEmail(email);
      setStage("otp");
    }, 1000);
  }
  function showFinalLoaderThenLogin() {
    setStage("postLoader");
    setTimeout(() => {
      toast.success("Password updated! Redirecting…");
      router.replace("/login");
    }, 1000);
  }

  /* ---------- send OTP ---------- */
  async function sendOtp(values: EmailVals) {
    setBusy("send");
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { shouldCreateUser: false },
    });
    setBusy(null);

    if (error) return toast.error(error.message);
    toast.success("Verification code sent! Check your inbox.");
    showPreOtpLoader(values.email);
  }

  /* ---------- verify code ---------- */
  async function verifyOtp(values: OtpVals) {
    setBusy("verify");
    const { error } = await supabase.auth.verifyOtp({
      email: savedEmail,
      token: values.code,
      type: "email",
    });
    setBusy(null);

    if (error) return toast.error(error.message);
    setStage("password");
  }

  /* ---------- set new password ---------- */
  async function resetPassword(values: PwdVals) {
    setBusy("reset");
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    setBusy(null);

    if (error) return toast.error(error.message);

    // Sign the user out so they re‑auth with the new password
    await supabase.auth.signOut();
    showFinalLoaderThenLogin();
  }

  /* ---------- UI ---------- */
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {/* STEP 1 — e‑mail */}
      {stage === "email" && (
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
              Send Code
            </Button>
          </form>
        </Form>
      )}

      {/* STEP 1½ — loader before OTP prompt */}
      {stage === "preOtpLoader" && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-20 w-20 animate-spin text-primary" />
          <p className="mt-6 text-sm text-muted-foreground">
            Preparing verification …
          </p>
        </div>
      )}

      {/* STEP 2 — enter code */}
      {stage === "otp" && (
        <Form {...otpForm}>
          <form
            onSubmit={otpForm.handleSubmit(verifyOtp)}
            className="grid gap-4"
          >
            <p className="text-sm text-muted-foreground">
              Enter the 6‑digit code sent to <strong>{savedEmail}</strong>
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
              Verify Code
            </Button>
          </form>
        </Form>
      )}

      {/* STEP 3 — new password */}
      {stage === "password" && (
        <Form {...pwdForm}>
          <form
            onSubmit={pwdForm.handleSubmit(resetPassword)}
            className="grid gap-4"
          >
            <FormField
              control={pwdForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
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

            <Button type="submit" disabled={busy === "reset"}>
              {busy === "reset" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Password
            </Button>
          </form>
        </Form>
      )}

      {/* STEP 4 — final loader */}
      {stage === "postLoader" && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-20 w-20 animate-spin text-primary" />
          <p className="mt-6 text-sm text-muted-foreground">
            All set! Redirecting …
          </p>
        </div>
      )}
    </div>
  );
}
