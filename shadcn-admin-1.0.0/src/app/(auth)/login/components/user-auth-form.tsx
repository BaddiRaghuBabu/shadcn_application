"use client";

import { HTMLAttributes, useState, useEffect, useRef, useCallback } from "react";
import { z } from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { registerDevice } from "@/lib/device";
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
const pwdSchema = z.object({
  email: z.string().email({ message: "Invalid email" }).min(1, "Email required"),
  password: z.string().min(1, "Password required"),
});
const emailSchema = z.object({
  email: z.string().email({ message: "Invalid email" }).min(1, "Email required"),
});
const otpSchema = z.object({
  code: z.string().length(6, "6-digit code").regex(/^\d+$/, "Digits only"),
});

type PwdVals = z.infer<typeof pwdSchema>;
type EmailVals = z.infer<typeof emailSchema>;
type OtpVals = z.infer<typeof otpSchema>;
type Stage = "login" | "magicEmail" | "preOtpLoader" | "otp" | "postOtpLoader";

/* ---------- typed window for grecaptcha ---------- */
interface GrecaptchaAPI {
  render: (
    container: string | HTMLElement,
    parameters: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      size?: string;
    }
  ) => number;
  reset: (widgetId: number) => void;
  ready?: (cb: () => void) => void;
}
declare global {
  interface Window {
    grecaptcha?: GrecaptchaAPI;
  }
}

/* ---------- helper to load reCAPTCHA script ---------- */
const loadRecaptchaScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.grecaptcha) return resolve();
    const existing = document.getElementById("recaptcha-v2-script");
    if (existing) {
      const interval = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error("grecaptcha init timeout"));
      }, 5000);
      return;
    }
    const script = document.createElement("script");
    script.id = "recaptcha-v2-script";
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const interval = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error("grecaptcha ready timeout"));
      }, 5000);
    };
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });
};

const isEmailNotVerifiedErr = (msg: string) =>
  /(email).*(not|un).*confirm|verify/i.test(msg) ||
  /email.*not verified/i.test(msg) ||
  /confirm your email/i.test(msg);

export function LoginForm({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefillEmail = searchParams.get("email") ?? "";

  const [stage, setStage] = useState<Stage>("login");
  const [busy, setBusy] = useState<"pwd" | "send" | "verify" | null>(null);
  const [savedEmail, setSavedEmail] = useState(prefillEmail);
  const [autoOpenedMagic, setAutoOpenedMagic] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const widgetIdRef = useRef<number | null>(null);

  const pwdForm = useForm<PwdVals>({
    resolver: zodResolver(pwdSchema),
    defaultValues: { email: prefillEmail, password: "" },
  });
  const magicEmailForm = useForm<EmailVals>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: prefillEmail },
  });
  const otpForm = useForm<OtpVals>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (prefillEmail && !autoOpenedMagic) {
      setStage("magicEmail");
      setAutoOpenedMagic(true);
    }
  }, [prefillEmail, autoOpenedMagic]);

  const showPreOtpLoader = (email: string) => {
    setStage("preOtpLoader");
    setTimeout(() => {
      setSavedEmail(email);
      setStage("otp");
    }, 800);
  };

  const showPostLoaderThenRedirect = useCallback(() => {
    setStage("postOtpLoader");
    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  }, [router]);

  const resetCaptcha = () => {
    if (window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
    setCaptchaToken(null);
  };

  const renderCaptcha = useCallback(async () => {
    try {
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (!siteKey) throw new Error("Missing reCAPTCHA site key");
      await loadRecaptchaScript();
      if (!window.grecaptcha) throw new Error("grecaptcha not available");
      if (widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.grecaptcha.render("recaptcha-container", {
        sitekey: siteKey,
        callback: (token: string) => {
          setCaptchaToken(token);
        },
        "expired-callback": () => {
          setCaptchaToken(null);
        },
        size: "normal",
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Captcha render failed", e);
      toast.error("Failed to load CAPTCHA. Please refresh."); // user feedback
    }
  }, []);

  useEffect(() => {
    if (stage === "magicEmail") {
      renderCaptcha();
    } else {
      setCaptchaToken(null);
    }
  }, [stage, renderCaptcha]);

  const verifyCaptcha = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/verify-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { success: boolean };
      return data.success === true;
    } catch {
      return false;
    }
  };

  /* ---------- password login ---------- */
  const loginWithPassword = async (values: PwdVals) => {
    setBusy("pwd");
    const { data, error } = await supabase.auth.signInWithPassword(values);
    setBusy(null);

    if (error) {
      if (isEmailNotVerifiedErr(error.message)) {
        toast.warning("E-mail not verified. Please use magic code login.");
        return;
      }
      toast.error("Invalid email or password.");
      return;
    }

    if (!data?.session || !data.user) {
      toast.error("Authentication failed. Please try again.");
      return;
    }

    await registerDevice(data.session.access_token, data.user.id);
    const display =
      data.user?.user_metadata?.full_name?.trim() || data.user?.email || "there";
    toast.success(`Welcome back, ${display}!`);
    showPostLoaderThenRedirect();
  };

  /* ---------- magic code login flow ---------- */
  const startMagicLogin = () => {
    setStage("magicEmail");
  };

  const sendMagicCode = async ({ email }: EmailVals) => {
    if (busy === "send") return;
    if (!captchaToken) {
      toast.error("Please complete the CAPTCHA.");
      return;
    }
    setBusy("send");
    const valid = await verifyCaptcha(captchaToken);
    if (!valid) {
      toast.error("CAPTCHA verification failed.");
      resetCaptcha();
      setBusy(null);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes("user not found") ||
          msg.includes("no user") ||
          msg.includes("invalid login credentials") ||
          msg.includes("not a valid login")
        ) {
          toast.error("Email not registered. Please sign up first.");
        } else if (msg.includes("rate")) {
          toast.error("Too many attempts. Please wait and try again.");
        } else {
          toast.error(`Failed to send code: ${error.message}`);
        }
        setBusy(null);
        return;
      }

      setSavedEmail(email);
      toast.success("Verification code sent! Check your inbox.");
      showPreOtpLoader(email);
    } catch {
      toast.error("Unexpected error sending code.");
    } finally {
      resetCaptcha();
      setBusy(null);
    }
  };

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
      data.user?.user_metadata?.full_name?.trim() || data.user?.email || "there";
    toast.success(`Welcome back, ${display}!`);
    showPostLoaderThenRedirect();
  };

  /* ---------- existing session ---------- */
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
  }, [showPostLoaderThenRedirect]);

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {/* PASSWORD LOGIN */}
      {stage === "login" && (
        <Form {...pwdForm}>
          <form onSubmit={pwdForm.handleSubmit(loginWithPassword)} className="grid gap-4">
            <FormField
              control={pwdForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" autoComplete="username" {...field} />
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground text-sm hover:opacity-75"
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
              {busy === "pwd" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log in
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">or</span>
              </div>
            </div>

            <Button type="button" onClick={startMagicLogin} className="w-full">
              {busy === "send" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Magic code login
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline">
                Sign up
              </Link>
            </p>
          </form>
        </Form>
      )}

      {/* MAGIC EMAIL ENTRY */}
      {stage === "magicEmail" && (
        <Form {...magicEmailForm}>
          <form onSubmit={magicEmailForm.handleSubmit(sendMagicCode)} className="grid gap-4">
            <FormField
              control={magicEmailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email for magic code</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div id="recaptcha-container" className="" />

            <Button type="submit" disabled={busy === "send" || !captchaToken} className="w-full">
              {busy === "send" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send 6-digit Code
            </Button>

            <Button
              variant="link"
              type="button"
              className="justify-start p-0 text-sm"
              onClick={() => setStage("login")}
            >
              ← Back to password login
            </Button>
          </form>
        </Form>
      )}

      {/* PRE-OTP LOADER */}
      {stage === "preOtpLoader" && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="text-primary h-20 w-20 animate-spin" />
          <p className="text-muted-foreground mt-6 text-sm">Preparing verification …</p>
        </div>
      )}

      {/* OTP ENTRY */}
      {stage === "otp" && (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(verifyOtp)} className="grid gap-4">
            <p className="text-muted-foreground text-sm">
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

            <Button
              type="submit"
              disabled={busy === "verify"}
              className="w-full"
            >
              {busy === "verify" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Continue
            </Button>
          </form>
        </Form>
      )}

      {/* FINAL LOADER */}
      {stage === "postOtpLoader" && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="text-primary h-20 w-20 animate-spin" />
          <p className="text-muted-foreground mt-6 text-sm">
            Redirecting to your dashboard …
          </p>
        </div>
      )}
    </div>
  );
}
