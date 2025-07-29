/* -------------------------------------------
   SERVER component (no "use client")
   Adds the Suspense boundary required by Next.js
--------------------------------------------*/
import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import VerifyEmailClient from "./VerifyEmailClient"

/* Loader fallback while the client component hydrates */
function Fallback() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <VerifyEmailClient />
    </Suspense>
  )
}
