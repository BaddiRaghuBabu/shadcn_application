import { Card } from "@/components/ui/card"
import { LoginForm } from "./components/user-auth-form"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"


function LoginFallback() {
  return (
    <div className="flex w-full justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Card className="p-6">
      <div className="flex flex-col space-y-2 text-left">
        <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and password below <br />
          to log into your account
        </p>
      </div>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
   
    </Card>
  )
}
