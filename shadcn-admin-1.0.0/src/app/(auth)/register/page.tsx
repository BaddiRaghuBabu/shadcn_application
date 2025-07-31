/* src/app/(auth)/register/page.tsx
   — renders the SIGN‑UP page
--------------------------------------------------*/
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "./components/register-form";

export default function RegisterPage() {
  return (
    <Card className="p-6">
      <div className="mb-4 space-y-2">
        <h1 className="text-lg font-semibold">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your details below.<br />
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-primary"
          >
            Log in
          </Link>
        </p>
      </div>

      {/* SIGN‑UP form (email + password) */}
      < RegisterForm/>

      <p className="text-muted-foreground mt-4 px-8 text-center text-sm">
        By creating an account you agree to our{" "}
        <a href="/terms" className="underline hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline hover:text-primary">
          Privacy Policy
        </a>
        .
      </p>
    </Card>
  );
}
