"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/password-input";
import { Loader2 } from "lucide-react";

const schema = z
  .object({
    current: z.string().min(1, "Current password required"),
    newPass: z.string().min(7, "Min 7 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.newPass === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormVals = z.infer<typeof schema>;

export default function ChangePasswordForm() {
  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { current: "", newPass: "", confirm: "" },
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (values: FormVals) => {
    setLoading(true);
    try {
      const {
        data: { session: existingSession },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr || !existingSession) {
        toast.error("Session expired. Please log in again.");
        router.replace("/login");
        return;
      }

      const email = existingSession.user.email;
      if (!email) {
        toast.error("Unable to determine user email. Please re-login.");
        router.replace("/login");
        return;
      }

      const {
        data: { session: newSession },
        error: signErr,
      } = await supabase.auth.signInWithPassword({
        email,
        password: values.current,
      });

      if (signErr || !newSession) {
        toast.error("Current password incorrect");
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: values.newPass,
      });

      if (updateErr) {
        toast.error(updateErr.message);
        return;
      }

      toast.success("Password changed successfully!");
      form.reset();

      setTimeout(() => {
        router.replace("/dashboard");
      }, 1200);
    } catch {
      toast.error("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="current"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPass"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Password
        </Button>
      </form>
    </Form>
  );
}
