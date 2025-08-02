"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner"; // optional fallback
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
import { motion, AnimatePresence } from "framer-motion";

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

type AlertType = "success" | "error";

interface AlertState {
  message: string;
  type: AlertType;
}

function InlineAlert({
  alert,
  onClose,
}: {
  alert: AlertState;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.message + alert.type}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          role="alert"
          className={`relative mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            alert.type === "success"
              ? "bg-green-50 border-green-400 text-green-800"
              : "bg-red-50 border-red-400 text-red-800"
          }`}
        >
          <div className="flex-1">
            <p className="m-0">{alert.message}</p>
          </div>
          <button
            aria-label="close"
            onClick={onClose}
            className="ml-2 rounded-full p-1 text-xs leading-none"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ChangePasswordForm() {
  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { current: "", newPass: "", confirm: "" },
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const router = useRouter();

  const showAlert = useCallback((message: string, type: AlertType) => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 5000);
  }, []);

  const onSubmit = async (values: FormVals) => {
    setLoading(true);
    try {
      const {
        data: { session: existingSession },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr || !existingSession) {
        showAlert("Session expired. Please log in again.", "error");
        toast.error?.("Session expired. Please log in again.");
        router.replace("/login");
        return;
      }

      const email = existingSession.user.email;
      if (!email) {
        showAlert(
          "Unable to determine user email. Please re-login.",
          "error"
        );
        toast.error?.("Unable to determine user email. Please re-login.");
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
        showAlert("Current password incorrect", "error");
        toast.error?.("Current password incorrect");
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: values.newPass,
      });

      if (updateErr) {
        showAlert(updateErr.message, "error");
        toast.error?.(updateErr.message);
        return;
      }

      showAlert("Password changed successfully!", "success");
      toast.success?.("Password changed successfully!");
      form.reset();

      setTimeout(() => {
        router.replace("/dashboard");
      }, 1200);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      showAlert("Unexpected error. Try again.", "error");
      toast.error?.("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <div>{alert && <InlineAlert alert={alert} onClose={() => setAlert(null)} />}</div>
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
