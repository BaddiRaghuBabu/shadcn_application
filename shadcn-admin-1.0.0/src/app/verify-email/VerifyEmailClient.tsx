/* -------------------------------------------
   Client component that does the heavy work
--------------------------------------------*/
"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabaseClient"

/** display states */
type Status = "loading" | "success" | "error"

export default function VerifyEmailClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<Status>("loading")

  /* --- verify email token --- */
  useEffect(() => {
    async function verify() {
      const type  = params.get("type")   // "signup" on first confirm
      const token = params.get("token")
      const email = params.get("email")

      if (!token || !email || type !== "signup") {
        toast.error("Invalid or expired confirmation link.")
        setStatus("error")
        return
      }

      const { error } = await supabase.auth.verifyOtp({
        type: "email",
        email,
        token,
      })

      if (error) {
        toast.error(error.message)
        setStatus("error")
        return
      }

      /* success */
      setStatus("success")
      toast.success("Email verified! You can now log in.")
      setTimeout(() => router.push("/login"), 2000)
    }

    verify()
  }, [params, router])

  /* --- UI --- */
  if (status === "loading") {
    return (
      <LoaderScreen text="Verifying your email…" />
    )
  }

  if (status === "success") {
    return (
      <SuccessScreen />
    )
  }

  /* status === "error" */
  return (
    <ErrorScreen />
  )
}

/* ------------ Re‑usable screens ------------ */

function LoaderScreen({ text }: { text: string }) {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </main>
  )
}

function SuccessScreen() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <CheckCircle2 className="h-10 w-10 text-green-600" />
      <p className="text-lg font-medium">Successfully verified!</p>
      <Link
        href="/login"
        className="text-sm underline underline-offset-4 text-blue-600 hover:text-blue-700"
      >
        Continue to Login
      </Link>
    </main>
  )
}

function ErrorScreen() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <XCircle className="h-10 w-10 text-destructive" />
      <p className="text-sm text-destructive">
        Verification failed or link expired.
      </p>
      <Link
        href="/login"
        className="text-sm underline underline-offset-4 text-blue-600 hover:text-blue-700"
      >
        Back to Login
      </Link>
    </main>
  )
}
