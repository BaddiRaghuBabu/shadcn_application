/* components/magic-link-form.tsx */
"use client";

import { HTMLAttributes, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

/* ------------- validation ------------- */
const schema = z.object({
  email: z
    .string()
    .min(1, { message: "Please enter your email" })
    .email({ message: "Invalid email address" }),
});

/* ------------- component ------------- */
export function MagicLinkForm({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  /* ------------- submit ------------- */
  async function onSubmit(values: z.infer<typeof schema>) {
    setLoading(true);

    /**
     * When the user clicks the magic link, Supabase will POST the
     * access token to <origin>/dashboard?code=...  (because we set
     * emailRedirectTo below).  Handle the token in that page or in
     * middleware and then show the dashboard content.
     */
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        // 👇 always points to /dashboard
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Magic link sent! Check your inbox.");
    }
    setLoading(false);
  }

  /* ------------- render ------------- */
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
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

          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send Magic Link"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
