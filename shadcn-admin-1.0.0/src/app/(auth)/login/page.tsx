import { Card } from "@/components/ui/card"
import { LoginForm } from "./components/user-auth-form"

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
      <LoginForm />
   
    </Card>
  )
}
