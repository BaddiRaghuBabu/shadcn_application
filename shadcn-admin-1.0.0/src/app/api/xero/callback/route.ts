// src/app/api/xero/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { xero } from "@/lib/xeroService";

/**
 * OAuth2 callback:
 * - Exchanges code for tokens
 * - Finds first tenant (organisation)
 * - Upserts { tenant_id, access_token, refresh_token, expires_at, updated_at } into `xero_tokens`
 * - Redirects back to /connection-xero?connected=1
 */

function mask(t?: string | null, keep = 4) {
  if (!t) return "null";
  const k = Math.min(keep, Math.floor(t.length / 2));
  return `${t.slice(0, k)}…${t.slice(-k)}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  console.log("[/api/xero/callback] START");
  console.log("[/api/xero/callback] Path:", url.pathname);
  console.log("[/api/xero/callback] Query keys:", Array.from(url.searchParams.keys()));

  try {
    console.log("[/api/xero/callback] Exchanging auth code for tokens…");
    const tokenSet = await xero.apiCallback(req.url);
    console.log("[/api/xero/callback] TokenSet received:", {
      access_token: mask(tokenSet?.access_token),
      refresh_token: mask(tokenSet?.refresh_token),
      expires_in: tokenSet?.expires_in ?? null,
      token_type: (tokenSet as any)?.token_type ?? null,
      scope: (tokenSet as any)?.scope ?? null,
    });

    console.log("[/api/xero/callback] Setting token set on SDK…");
    xero.setTokenSet(tokenSet);

    console.log("[/api/xero/callback] Fetching tenants…");
    const tenants = await xero.updateTenants();
    console.log("[/api/xero/callback] Tenants length:", tenants?.length ?? 0);
    if (tenants?.length) {
      console.log(
        "[/api/xero/callback] Tenants summary:",
        tenants.map((t) => ({
          tenantId: t?.tenantId,
          tenantType: t?.tenantType,
          createdDateUtc: t?.createdDateUtc,
          updatedDateUtc: t?.updatedDateUtc,
        }))
      );
    }

    const tenantId =
      tenants
        ?.sort((a, b) => {
          const aDate = new Date(a.updatedDateUtc ?? a.createdDateUtc ?? 0);
          const bDate = new Date(b.updatedDateUtc ?? b.createdDateUtc ?? 0);
          return bDate.getTime() - aDate.getTime();
        })[0]
        ?.tenantId ?? null;

    console.log("[/api/xero/callback] Chosen tenantId:", tenantId);

    if (!tenantId) {
      console.warn("[/api/xero/callback] No tenant found → redirect with error");
      return NextResponse.redirect(new URL("/connection-xero?error=no_tenant_found", req.url));
    }

    const supabase = getSupabaseAdminClient();

    const expiresIn = tokenSet.expires_in ?? 1800;
    const expiresAtIso = new Date(Date.now() + expiresIn * 1000).toISOString();
    const payload = {
      tenant_id: tenantId,
      access_token: tokenSet.access_token!,
      refresh_token: tokenSet.refresh_token!,
      expires_at: expiresAtIso,
      updated_at: new Date().toISOString(),
    };

    console.log("[/api/xero/callback] Upserting xero_tokens…", {
      ...payload,
      access_token: mask(payload.access_token),
      refresh_token: mask(payload.refresh_token),
    });

    const { error } = await supabase.from("xero_tokens").upsert(payload, { onConflict: "tenant_id" });

    if (error) {
      console.error("[/api/xero/callback] Upsert FAILED:", error);
      const redirectUrl = new URL("/connection-xero?error=save_failed", req.url);
      console.log("[/api/xero/callback] Redirecting →", redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }

    const successUrl = new URL("/connection-xero?connected=1", req.url);
    console.log("[/api/xero/callback] SUCCESS. Redirecting →", successUrl.toString());
    return NextResponse.redirect(successUrl);
  } catch (err: any) {
    const detail = err instanceof Error ? err.message : "unknown_error";
    console.error("[/api/xero/callback] ERROR:", {
      message: detail,
      statusCode: err?.statusCode ?? err?.response?.statusCode ?? null,
      problem: err?.response?.body ?? null,
    });
    const errorUrl = new URL(`/connection-xero?error=${encodeURIComponent(detail)}`, req.url);
    console.log("[/api/xero/callback] Redirecting with error →", errorUrl.toString());
    return NextResponse.redirect(errorUrl);
  } finally {
    console.log("[/api/xero/callback] END");
  }
}
