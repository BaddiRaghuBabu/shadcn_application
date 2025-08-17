// app/(dashboard)/connection-xero/api-key-quickbooks/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast, Toaster } from "sonner";
import { ArrowLeft, Clipboard, Shield, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

NProgress.configure({ showSpinner: false, trickleSpeed: 120, minimum: 0.08 });

const QBConfigSchema = z.object({
  applicationUrl: z.string().url().optional().or(z.literal("")),
  redirectUri: z.string().url().optional().or(z.literal("")),
  clientId: z.string().min(5, "Client ID too short"),
  clientSecret: z.string().min(5, "Client Secret too short"),
  scopes: z.string().min(1),
});
type QBConfig = z.infer<typeof QBConfigSchema>;

function CopyBtn({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard.writeText(value ?? "");
        toast.success(`${label} copied`);
      }}
    >
      <Clipboard className="h-4 w-4" />
    </Button>
  );
}

export default function QuickBooksApiKeyPage() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  const form = useForm<QBConfig>({
    resolver: zodResolver(QBConfigSchema),
    defaultValues: {
      applicationUrl: "",
      redirectUri: "",
      clientId: "",
      clientSecret: "",
      scopes: "com.intuit.quickbooks.accounting",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (origin) {
      if (!form.getValues("applicationUrl"))
        form.setValue("applicationUrl", origin, { shouldDirty: true });
      if (!form.getValues("redirectUri"))
        form.setValue("redirectUri", `${origin}/api/quickbooks/callback`, { shouldDirty: true });
    }
    const load = async () => {
      try {
        NProgress.start();
        const res = await fetch("/api/quickbooks/settings");
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.clientId) form.setValue("clientId", cfg.clientId, { shouldDirty: true, shouldValidate: true });
          if (cfg.clientSecret) form.setValue("clientSecret", cfg.clientSecret, { shouldDirty: true, shouldValidate: true });
          if (cfg.redirectUri) form.setValue("redirectUri", cfg.redirectUri, { shouldDirty: true, shouldValidate: true });
          if (cfg.applicationUrl) form.setValue("applicationUrl", cfg.applicationUrl, { shouldDirty: true, shouldValidate: true });
          if (cfg.scopes) form.setValue("scopes", cfg.scopes, { shouldDirty: true, shouldValidate: true });
        }
      } catch {
        toast.error("Failed to load settings");
      } finally {
        NProgress.done();
      }
    };
    load();
  }, [form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      NProgress.start();
      setConnecting(true);
      const res = await fetch("/api/quickbooks/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationUrl: values.applicationUrl,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
          redirectUri: values.redirectUri,
          scopes: values.scopes,
        }),
      });
      if (!res.ok) {
        NProgress.done();
        setConnecting(false);
        toast.error("Server error while saving settings");
        return;
      }
      await new Promise((r) => setTimeout(r, 150));
      window.location.assign("/api/quickbooks/connect");
    } catch {
      toast.error("Failed to save settings");
      NProgress.done();
      setConnecting(false);
    }
  });

  const [clientId, clientSecret, redirectUri, scopes, applicationUrl] = form.watch([
    "clientId",
    "clientSecret",
    "redirectUri",
    "scopes",
    "applicationUrl",
  ]);
  const hasAnyInput = [clientId, clientSecret, redirectUri, scopes, applicationUrl].some((v) => (v ?? "").toString().trim().length > 0);
  const canContinue = form.formState.isValid && !form.formState.isSubmitting && !connecting;

  return (
    <div className="mx-auto w-full max-w-none p-4 md:p-8">
      <style jsx global>{`
        #nprogress .bar { background: #10b981; height: 1px; }
        #nprogress .peg { box-shadow: 0 0 10px #10b981, 0 0 5px #10b981; }
      `}</style>

      <Toaster position="bottom-right" />

      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={() => router.back()} title="Back" disabled={connecting}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">Secure mode</Badge>
        </div>
      </div>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle>Connect QuickBooks — Step 1: API Credentials</CardTitle>
          <CardDescription>Store credentials in Supabase. Keep your Client Secret secure.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-start gap-2 rounded-lg border p-3">
            <Shield className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div className="text-sm">
              <strong>Security tip:</strong> Handle your Client Secret carefully and rotate it if exposed.
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="applicationUrl">Application URL</Label>
            <div className="flex items-center gap-2">
              <Input id="applicationUrl" placeholder="https://yourapp.example" {...form.register("applicationUrl")} disabled={connecting} />
              <CopyBtn value={form.watch("applicationUrl") || ""} label="Application URL" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="redirectUri">Redirect URI</Label>
            <div className="flex items-center gap-2">
              <Input id="redirectUri" placeholder="https://yourapp.example/api/quickbooks/callback" {...form.register("redirectUri")} disabled={connecting} />
              <CopyBtn value={form.watch("redirectUri") || ""} label="Redirect URI" />
            </div>
          </div>

          <Separator />

          <div className="grid gap-1.5">
            <Label htmlFor="clientId">Client ID</Label>
            <Input id="clientId" placeholder="abcd123" {...form.register("clientId")} disabled={connecting} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input id="clientSecret" placeholder="secret" {...form.register("clientSecret")} disabled={connecting} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="scopes">Scopes</Label>
            <Textarea id="scopes" rows={2} {...form.register("scopes")} disabled={connecting} />
          </div>
        </CardContent>
        <div className="p-6 pt-0 flex justify-end">
          <Button onClick={onSubmit} disabled={!canContinue || !hasAnyInput}>
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Connect"}
          </Button>
        </div>
      </Card>
    </div>
  );
}