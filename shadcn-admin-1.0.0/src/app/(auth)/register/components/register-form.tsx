// components/register-form.tsx
"use client"

import { HTMLAttributes, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { User } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { registerDevice } from "@/lib/device"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { PasswordInput } from "@/components/password-input"

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
      })
    }
  })

const emailSchema = z.object({
  email: z.string().email().min(1, "Email required"),
})
const otpSchema = z.object({
  code: z
    .string()
    .length(6, "6-digit code")
    .regex(/^\d+$/, "Digits only"),
})

type PwdVals = z.infer<typeof pwdSchema>
type EmailVals = z.infer<typeof emailSchema>
type OtpVals = z.infer<typeof otpSchema>

type Stage = "signup" | "emailOtp" | "otp" | "redirect"

/* ---------- helpers -------------------------------------------- */
const explicitDuplicateErr = (msg: string) =>
  /already (registered|exists)/i.test(msg)

/** Supabase returns `identities: []` when the e-mail already exists */
const silentDuplicate = (user: User | null | undefined) =>
  Array.isArray(user?.identities) && user.identities.length === 0

// Supabase rate limits OTP requests and returns messages like:
//   "For security purposes, you can only request this after X seconds."
//   "Verification code already sent. Please check your email and wait..."
const rateLimitErr = (msg: string) =>
  /for security purposes, you can only request this after/i.test(msg) ||
  /verification code already sent/i.test(msg)

export function RegisterForm({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const [stage, setStage] = useState<Stage>("signup")
  const [busy, setBusy] = useState<"signup" | "send" | "verify" | null>(null)
  const [savedEmail, setSavedEmail] = useState("")
  const router = useRouter()

  /* forms */
  const pwdForm = useForm<PwdVals>({
    resolver: zodResolver(pwdSchema),
    defaultValues: { email: "", password: "", confirm: "" },
  })
  const emailForm = useForm<EmailVals>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  })
  const otpForm = useForm<OtpVals>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  })

  /* loader then redirect */
  const goToLogin = () => {
    setStage("redirect")
    setTimeout(() => {
      toast.success("Account verified! Please sign in.")
      router.push("/login")
    }, 1000)
  }

  /* ---------- sign-up with password ----------------------------- */
  const signupWithPassword = async (values: PwdVals) => {
    setBusy("signup")

    // 1) Create the user
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })

    if (signUpErr) {
      setBusy(null)
      if (explicitDuplicateErr(signUpErr.message)) {
        toast.warning("User already exists. Please sign in.")
      } else {
        toast.error(signUpErr.message)
      }
      return
    }

    if (silentDuplicate(data?.user)) {
      setBusy(null)
      toast.warning("User already exists. Please sign in.")
      return
    }

    // 2) Send OTP (Supabase's rate-limit may complain if signUp already triggered an email,
    //    but we now treat ANY rate-limit error as "go to OTP screen" rather than blocking)
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { shouldCreateUser: false },
    })

    setBusy(null)

    if (otpErr && !rateLimitErr(otpErr.message)) {
      // only show errors that are NOT “already sent”
      toast.error(otpErr.message)
      return
    }

    // always advance to OTP stage, with a success toast
    setSavedEmail(values.email)
    toast.success("Verification code sent! Check your inbox.")
    setStage("otp")
  }

  /* ---------- email-only sign-up with existence check ---------- */
  const sendOtp = async (values: EmailVals) => {
    setBusy("send")

    // Preflight: try to send OTP without creating user to detect existing account
    const { error: existsErr } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { shouldCreateUser: false },
    })

    if (existsErr && rateLimitErr(existsErr.message)) {
      setBusy(null)
      setSavedEmail(values.email)
      toast.warning(
        "Verification code already sent. Please check your email and wait before requesting again."
      )
      setStage("otp")
      return
    }

    if (!existsErr) {
      setBusy(null)
      toast.warning("Email already exists. Please login.")
      router.push(`/login?email=${encodeURIComponent(values.email)}`)
      return
    }

    const isNotFound =
      /not found/i.test(existsErr.message) ||
      /no user/i.test(existsErr.message) ||
      /user does not exist/i.test(existsErr.message) ||
      /invalid login credentials/i.test(existsErr.message)

    if (!isNotFound) {
      setBusy(null)
      if (explicitDuplicateErr(existsErr.message)) {
        toast.warning("Email already exists. Please login.")
        router.push(`/login?email=${encodeURIComponent(values.email)}`)
      } else {
        toast.error(existsErr.message)
      }
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { shouldCreateUser: true },
    })

    setBusy(null)

    if (error) {
      if (explicitDuplicateErr(error.message)) {
        toast.warning("User already exists. Please sign in.")
        router.push(`/login?email=${encodeURIComponent(values.email)}`)
      } else if (rateLimitErr(error.message)) {
        setSavedEmail(values.email)
        toast.warning(
          "Verification code already sent. Please check your email and wait before requesting again."
        )
        setStage("otp")
      } else {
        toast.error(error.message)
      }
      return
    }

    setSavedEmail(values.email)
    toast.success("Verification code sent! Check your inbox.")
    setStage("otp")
  }

  /* ---------- verify OTP --------------------------------------- */
  const verifyOtp = async (values: OtpVals) => {
    setBusy("verify")
    const { data, error } = await supabase.auth.verifyOtp({
      email: savedEmail,
      token: values.code,
      type: "email",
    })
    setBusy(null)

    if (error) {
      toast.error(error.message)
      return
    }

    if (data?.session && data.user) {
      await registerDevice(data.session.access_token, data.user.id)
      await supabase.auth.signOut()
    }
    goToLogin()
  }

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
                emailForm.setValue("email", savedEmail)
                sendOtp({ email: savedEmail })
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
          <Loader2 className="text-primary h-20 w-20 animate-spin" />
          <p className="text-muted-foreground mt-6 text-sm">
            Redirecting to sign-in…
          </p>
        </div>
      )}
    </div>
  )
}
