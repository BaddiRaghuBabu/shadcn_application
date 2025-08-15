// app/api-key-connect/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clipboard,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Shield,
  AlertTriangle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------- */
/* Schema — config-less: we only send client_id/redirect/scopes via query */
const XeroConfigSchema = z.object({
  applicationUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  redirectUri: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  clientId: z.string().min(10, "Client ID looks too short"),
  // NOTE: Client secret is NOT sent anywhere from this page (display only)
  clientSecret: z.string().optional().or(z.literal("")),
  scopes: z.string().min(1),
});
type XeroConfig = z.infer<typeof XeroConfigSchema>;

/* ------------------------------------------------------- */
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

/** Build a RELATIVE preview URL so SSR and client match exactly */
function buildRelativePreview(values: Pick<XeroConfig, "clientId" | "redirectUri" | "scopes">) {
  const params = new URLSearchParams();
  if (values.clientId) params.set("client_id", values.clientId);
  if (values.redirectUri) params.set("redirect_uri", values.redirectUri as string);
  if (values.scopes) params.set("scopes", values.scopes);
  const qs = params.toString();
  return `/api/xero/connect${qs ? `?${qs}` : ""}`;
}

export default function ApiKeyConnectPage() {
  const router = useRouter();
  const [reveal, setReveal] = useState(false);

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

  // Optional convenience: prefill from window.origin AFTER mount (inputs are fine).
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (origin) {
      if (!form.getValues("applicationUrl")) form.setValue("applicationUrl", origin, { shouldDirty: true });
      if (!form.getValues("redirectUri")) form.setValue("redirectUri", `${origin}/api/xero/callback`, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitting = form.formState.isSubmitting;

  // No POST — we just redirect with query to /api/xero/connect
  const onSubmit = form.handleSubmit(async (values) => {
    const url = new URL("/api/xero/connect", window.location.origin);
    url.searchParams.set("client_id", values.clientId);
    if (values.redirectUri) url.searchParams.set("redirect_uri", values.redirectUri);
    url.searchParams.set("scopes", values.scopes);
    window.location.href = url.toString();
  });

  // Build a RELATIVE preview string (no host/port → no hydration diff)
  const previewHref = useMemo(() => {
    const v = form.getValues();
    return buildRelativePreview({
      clientId: v.clientId,
      redirectUri: v.redirectUri,
      scopes: v.scopes,
    });
  }, [form]);

  return (
    <div className="mx-auto w-full max-w-none p-4 md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={() => router.back()} title="Back">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">Config-less mode</Badge>
        </div>
      </div>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle>Connect Xero — Step 1: API Credentials</CardTitle>
          <CardDescription>
            We’ll send <strong>only</strong> Client ID, Redirect URI, and Scopes to{" "}
            <code>/api/xero/connect</code>. Keep your Client Secret on the server as{" "}
            <code>XERO_CLIENT_SECRET</code>.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          {/* Security note */}
          <div className="flex items-start gap-2 rounded-lg border p-3">
            <Shield className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div className="text-sm">
              <strong>Security tip:</strong> Don’t send Client Secret from the browser. This page does <em>not</em> transmit it.
            </div>
          </div>

          {/* Application URL */}
          <div className="grid gap-1.5">
            <Label htmlFor="applicationUrl">Application URL</Label>
            <div className="flex items-center gap-2">
              <Input id="applicationUrl" placeholder="https://yourapp.example" {...form.register("applicationUrl")} />
              <CopyBtn value={form.watch("applicationUrl") || ""} label="Application URL" />
            </div>
            {form.formState.errors.applicationUrl && (
              <p className="text-xs text-rose-600">{form.formState.errors.applicationUrl.message}</p>
            )}
            <FieldHelp>Public base URL of your app. Add it in your Xero app’s configuration.</FieldHelp>
          </div>

          {/* Redirect URI */}
          <div className="grid gap-1.5">
            <Label htmlFor="redirectUri">Redirect URI</Label>
            <div className="flex items-center gap-2">
              <Input id="redirectUri" placeholder="https://yourapp.example/api/xero/callback" {...form.register("redirectUri")} />
              <CopyBtn value={form.watch("redirectUri") || ""} label="Redirect URI" />
            </div>
            {form.formState.errors.redirectUri && (
              <p className="text-xs text-rose-600">{form.formState.errors.redirectUri.message}</p>
            )}
            <FieldHelp>Must exactly match one of your Xero app Redirect URIs.</FieldHelp>
          </div>

          <Separator />

          {/* Client ID */}
          <div className="grid gap-1.5">
            <Label htmlFor="clientId">Client ID</Label>
            <Input id="clientId" placeholder="xxxxxxxxxxxxxxxx" {...form.register("clientId")} />
            {form.formState.errors.clientId && (
              <p className="text-xs text-rose-600">{form.formState.errors.clientId.message}</p>
            )}
          </div>

          {/* Client Secret (display only — not submitted) */}
          <div className="grid gap-1.5">
            <Label htmlFor="clientSecret">Client Secret (not sent)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="clientSecret"
                type={reveal ? "text" : "password"}
                placeholder="•••••••••••••••"
                {...form.register("clientSecret")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setReveal((x) => !x)}
                title={reveal ? "Hide" : "Show"}
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-start gap-2 text-[12px] text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
              <span>Store this on the server as <code>XERO_CLIENT_SECRET</code>. This field is for your reference only.</span>
            </div>
          </div>

          {/* Scopes */}
          <div className="grid gap-1.5">
            <Label htmlFor="scopes">Scopes</Label>
            <Textarea id="scopes" rows={2} {...form.register("scopes")} />
            {form.formState.errors.scopes && (
              <p className="text-xs text-rose-600">{form.formState.errors.scopes.message}</p>
            )}
            <FieldHelp>Include <code>offline_access</code> to receive refresh tokens.</FieldHelp>
          </div>

          {/* Actions */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/connection-xero")}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!form.formState.isValid || submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Continue to Xero
            </Button>
          </div>

          {/* RELATIVE preview (no host/port → no hydration mismatch) */}
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
