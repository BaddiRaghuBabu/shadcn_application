// app/api-key-connect/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast, Toaster } from "sonner";
import {
  ArrowLeft,
  Clipboard,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Shield,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 120,
  minimum: 0.08,
});

/* ------------------------------------------------------- */
const XeroConfigSchema = z.object({
  applicationUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  redirectUri: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  clientId: z.string().min(10, "Client ID looks too short"),
  clientSecret: z.string().min(10, "Client Secret looks too short"),
  scopes: z.string().min(1),
});
type XeroConfig = z.infer<typeof XeroConfigSchema>;

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>;
}
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

function buildRelativePreview() {
  return "/api/xero/connect";
}

export default function ApiKeyConnectPage() {
  const router = useRouter();
  const [reveal, setReveal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const form = useForm<XeroConfig>({
    resolver: zodResolver(XeroConfigSchema),
    defaultValues: {
      applicationUrl: "",
      redirectUri: "",
      clientId: "",
      clientSecret: "",
      scopes:
        "openid profile email offline_access accounting.contacts accounting.transactions accounting.settings",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (origin) {
      if (!form.getValues("applicationUrl"))
        form.setValue("applicationUrl", origin, { shouldDirty: true });
      if (!form.getValues("redirectUri"))
        form.setValue("redirectUri", `${origin}/api/xero/callback`, { shouldDirty: true });
    }
    const load = async () => {
      try {
        NProgress.start();
        const res = await fetch("/api/xero/settings");
        if (!res.ok) throw new Error();
        const cfg = await res.json();

        if (cfg.clientId) form.setValue("clientId", cfg.clientId, { shouldDirty: true, shouldValidate: true });
        if (cfg.clientSecret) form.setValue("clientSecret", cfg.clientSecret, { shouldDirty: true, shouldValidate: true });
        if (cfg.redirectUri) form.setValue("redirectUri", cfg.redirectUri, { shouldDirty: true, shouldValidate: true });
        if (cfg.scopes) form.setValue("scopes", cfg.scopes, { shouldDirty: true, shouldValidate: true });
      } catch {
        if (!navigator.onLine) toast.error("No internet connection");
        else toast.error("Failed to load settings");
      } finally {
        NProgress.done();
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setConnecting(true);
      NProgress.start(); // show top bar immediately

      const res = await fetch("/api/xero/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      // Give the bar a moment to paint before redirecting
      await new Promise((r) => setTimeout(r, 150));

      // Keep NProgress running; page will unload as we leave
      window.location.assign("/api/xero/connect");
    } catch {
      if (!navigator.onLine) toast.error("No internet connection");
      else toast.error("Failed to save settings");
      NProgress.done();
      setConnecting(false);
    }
    // NOTE: no NProgress.done() on success so the bar stays until navigation happens
  });

  const previewHref = useMemo(() => buildRelativePreview(), []);

  const [clientId, clientSecret, redirectUri, scopes, applicationUrl] = form.watch([
    "clientId",
    "clientSecret",
    "redirectUri",
    "scopes",
    "applicationUrl",
  ]);
  const hasAnyInput =
    [clientId, clientSecret, redirectUri, scopes, applicationUrl].some(
      (v) => (v ?? "").toString().trim().length > 0
    );
  const canContinue = form.formState.isValid && !submitting && !connecting;

  return (
    <div className="mx-auto w-full max-w-none p-4 md:p-8">
      {/* NProgress styling tweaks */}
      <style jsx global>{`
        #nprogress .bar { background: #2563eb; height: 1px; }
        #nprogress .peg { box-shadow: 0 0 10px #2563eb, 0 0 5px #2563eb; }
      `}</style>

      <Toaster position="bottom-right" />

      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={() => router.back()} title="Back" disabled={connecting}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">Secure mode</Badge>
        </div>
      </div>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle>Connect Xero — Step 1: API Credentials</CardTitle>
          <CardDescription>
            Store credentials in Supabase. Keep your Client Secret secure.
          </CardDescription>
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
              <Input id="applicationUrl" placeholder="https://yourapp.example" {...form.register("applicationUrl")} disabled={connecting}/>
              <CopyBtn value={form.watch("applicationUrl") || ""} label="Application URL" />
            </div>
            {form.formState.errors.applicationUrl && (
              <p className="text-xs text-rose-600">{form.formState.errors.applicationUrl.message}</p>
            )}
            <FieldHelp>Public base URL of your app. Add it in your Xero app’s configuration.</FieldHelp>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="redirectUri">Redirect URI</Label>
            <div className="flex items-center gap-2">
              <Input id="redirectUri" placeholder="https://yourapp.example/api/xero/callback" {...form.register("redirectUri")} disabled={connecting}/>
              <CopyBtn value={form.watch("redirectUri") || ""} label="Redirect URI" />
            </div>
            {form.formState.errors.redirectUri && (
              <p className="text-xs text-rose-600">{form.formState.errors.redirectUri.message}</p>
            )}
            <FieldHelp>Must exactly match one of your Xero app Redirect URIs.</FieldHelp>
          </div>

          <Separator />

          <div className="grid gap-1.5">
            <Label htmlFor="clientId">Client ID</Label>
            <Input id="clientId" placeholder="xxxxxxxxxxxxxxxx" {...form.register("clientId")} disabled={connecting}/>
            {form.formState.errors.clientId && (
              <p className="text-xs text-rose-600">{form.formState.errors.clientId.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <div className="flex items-center gap-2">
              <Input
                id="clientSecret"
                type={reveal ? "text" : "password"}
                placeholder="•••••••••••••••"
                {...form.register("clientSecret")}
                disabled={connecting}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setReveal((x) => !x)}
                title={reveal ? "Hide" : "Show"}
                disabled={connecting}
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.clientSecret && (
              <p className="text-xs text-rose-600">{form.formState.errors.clientSecret.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="scopes">Scopes</Label>
            <Textarea id="scopes" rows={2} {...form.register("scopes")} disabled={connecting}/>
            {form.formState.errors.scopes && (
              <p className="text-xs text-rose-600">{form.formState.errors.scopes.message}</p>
            )}
            <FieldHelp>Include <code>offline_access</code> to receive refresh tokens.</FieldHelp>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/connection-xero")} disabled={connecting}>
              Cancel
            </Button>

            {hasAnyInput ? (
              <Button onClick={onSubmit} disabled={!canContinue} className="gap-2" aria-busy={connecting || submitting}>
                {(submitting || connecting) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {(submitting || connecting) ? "Connecting…" : "Continue to Xero"}
              </Button>
            ) : (
              <div className="h-10" />
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Preview</div>
            <code className="block overflow-x-auto text-xs" suppressHydrationWarning>
              {previewHref}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
