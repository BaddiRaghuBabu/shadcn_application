// src/app/api/xero/ping/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { getXeroClient } from "@/lib/xeroService";

type TokenRow = {
  tenant_id: string;
  access_token: string;
  refresh_token: string;
  created_at?: string | null;
  expires_at?: string | null;
  updated_at?: string | null;
};

type XeroTokenSet = {
  access_token?: string;
  refresh_token?: string;
  /** seconds since epoch (as returned by many OAuth libs) */
  expires_at?: number;
};

type XeroClientMinimal = {
  setTokenSet: (set: { access_token: string; refresh_token: string; expires_at?: number }) => void;
  readTokenSet?: () => XeroTokenSet | undefined;
  accountingApi: {
    getOrganisations: (
      tenantId: string,
    ) => Promise<{
      body?: {
        organisations?: Array<{
          name?: string | null;
          legalName?: string | null;
          organisationID?: string | null;
        }>;
      };
    }>;
  };
};

function mask(val?: string | null, keep = 4) {
  if (!val) return "null";
  const k = Math.min(keep, Math.floor(val.length / 2));
  return `${val.slice(0, k)}…${val.slice(-k)}`;
}
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
}
function getStatusCode(e: unknown): number {
  const anyRec = e as { statusCode?: number; response?: { statusCode?: number } };
  return anyRec?.statusCode ?? anyRec?.response?.statusCode ?? 500;
}
function getProblemBody(e: unknown): unknown {
  const anyRec = e as { response?: { body?: unknown } };
  return anyRec?.response?.body ?? null;
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const debug = new URL(req.url).searchParams.get("debug") === "1";
  const dbg: string[] = [];

  const supabase = getSupabaseAdminClient();

  // Load latest token (if any)
  const { data: token, error: tokenErr } = await supabase
    .from("xero_tokens")
    .select("tenant_id, access_token, refresh_token, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TokenRow>();

  if (tokenErr) dbg.push(`token query error: ${errMsg(tokenErr)}`);

  if (!token) {
    const res = NextResponse.json(
      { error: "Not connected", ...(debug ? { debug: dbg } : {}) },
      { status: 401 },
    );
    res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
    return res;
  }

  dbg.push(
    `token loaded tenant=${token.tenant_id}, access=${Boolean(token.access_token)}, refresh=${Boolean(
      token.refresh_token,
    )}`,
  );
  if (debug) {
    dbg.push(
      `created_at=${token.created_at ?? "null"}, expires_at=${token.expires_at ?? "null"}, access_token=${mask(
        token.access_token,
      )}, refresh_token=${mask(token.refresh_token)}`,
    );
  }

  // Prime SDK
  const xero = (await getXeroClient()) as unknown as XeroClientMinimal;
  xero.setTokenSet({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: token.expires_at ? Math.floor(new Date(token.expires_at).getTime() / 1000) : undefined,
  });
  dbg.push("setTokenSet OK");

  try {
    // Ping organisations
    const res = await xero.accountingApi.getOrganisations(token.tenant_id);
    const orgs = res?.body?.organisations ?? [];
    dbg.push(`organisations found=${orgs.length}`);

    const org = orgs[0];
    // Persist refreshed token if SDK rotated it
    const latest = xero.readTokenSet?.();
    if (latest?.access_token && latest.access_token !== token.access_token) {
      const { error: upErr } = await supabase
        .from("xero_tokens")
        .update({
          access_token: latest.access_token,
          refresh_token: latest.refresh_token ?? token.refresh_token,
          expires_at:
            typeof latest.expires_at === "number"
              ? new Date(latest.expires_at * 1000).toISOString()
              : token.expires_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", token.tenant_id);
      if (upErr) {
        dbg.push(`persist refreshed tokens failed: ${errMsg(upErr)}`);
      } else {
        dbg.push("persist refreshed tokens OK");
      }
    }

    const name = org?.name ?? "unknown organisation";
    const body = {
      message: `Access to ${name} successful`,
      ...(debug
        ? {
            debug: dbg,
            org_preview: org
              ? {
                  name: org.name ?? null,
                  legalName: org.legalName ?? null,
                  organisationID: org.organisationID ?? null,
                }
              : null,
          }
        : {}),
    };
    const ok = NextResponse.json(body, { status: 200 });
    ok.headers.set("x-runtime-ms", String(Date.now() - startedAt));
    return ok;
  } catch (e: unknown) {
    const statusCode = getStatusCode(e);
    const body = {
      error: errMsg(e),
      statusCode,
      problem: getProblemBody(e),
      ...(debug ? { debug: dbg } : {}),
    };
    const res = NextResponse.json(body, { status: statusCode });
    res.headers.set("x-runtime-ms", String(Date.now() - startedAt));
    return res;
  }
}
