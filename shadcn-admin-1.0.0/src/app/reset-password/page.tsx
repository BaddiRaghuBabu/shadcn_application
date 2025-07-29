/* -------------------------------------------------
   Supabase redirect page after a user clicks the
   “reset‑password” link in the e‑mail.
--------------------------------------------------*/
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"  // ⬅️  useSearchParams removed
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

import { supabase } from "@/lib/supabaseClient"
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

/* ---------- states ---------- */
type Phase = "checking" | "form" | "success" | "error"

/* ---------- schema ---------- */
const pwdSchema = z
  .object({
    password: z
      .string()
      .min(7, { message: "Password must be at least 7 characters long" }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export default function ResetPasswordPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("checking")
  const [loading, setLoading] = useState(false)

  /* ------------- verify token ------------- */
  useEffect(() => {
    async function exchange() {
      /** Supabase JS auto‑exchanges the token in the URL for a session
       *  once supabase.auth.getSession() is called anywhere.
       *  We call it here to ensure the session exists before showing the form.
       */
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        toast.error("Invalid or expired reset link.")
        setPhase("error")
        return
      }

      setPhase("form")
    }

    exchange()
  }, [])

  /* ------------- form ------------- */
  const form = useForm<z.infer<typeof pwdSchema>>({
    resolver: zodResolver(pwdSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  async function onSubmit(values: z.infer<typeof pwdSchema>) {
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setPhase("success")
    toast.success("Password changed successfully!")
    setTimeout(() => router.push("/login"), 2000)
  }

  /* ------------- render ------------- */
  if (phase === "checking") {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking your link…</p>
      </main>
    )
  }

  if (phase === "error") {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-destructive">
          Reset link invalid or expired.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-blue-600 underline underline-offset-4 hover:text-blue-700"
        >
          Try again
        </Link>
      </main>
    )
  }

  if (phase === "success") {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
        <p className="text-lg font-medium">Password updated!</p>
        <Link
          href="/login"
          className="text-sm text-blue-600 underline underline-offset-4 hover:text-blue-700"
        >
          Continue to Login
        </Link>
      </main>
    )
  }

  /* --------- phase === "form" --------- */
  return (
    <main className="flex h-screen flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-xl font-semibold">
          Set a new password
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            {/* -------- New password -------- */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* -------- Confirm password -------- */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* -------- Submit button -------- */}
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  )
}
