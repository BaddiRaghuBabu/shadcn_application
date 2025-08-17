// /app/api/quickbooks/accounts/route.ts
/* eslint-disable no-await-in-loop, @typescript-eslint/no-explicit-any, no-console */
import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseClient"
import { getQuickBooksApiBase } from "@/lib/quickbooksApi"


export async function GET() {
  const reqId = Math.random().toString(36).slice(2)
  const now = new Date().toISOString()
  console.log(`[QBO][${reqId}] GET /api/quickbooks/accounts started @ ${now}`)

  try {
    const supabase = getSupabaseAdminClient()
    console.log(`[QBO][${reqId}] Supabase admin client created`)

    const { data: token, error: tokenErr } = await supabase
      .from("quickbooks_tokens")
      .select("realm_id, access_token")
      .single()

    if (tokenErr) {
      console.log(`[QBO][${reqId}] ERROR fetching token from DB:`, tokenErr)
    }

    if (!token) {
      console.log(`[QBO][${reqId}] No token found → Not connected`)
      return NextResponse.json({ error: "Not connected" }, { status: 400 })
    }

    const realmId = token.realm_id
    const accessToken = token.access_token
    const maskedToken =
      typeof accessToken === "string" && accessToken.length > 12
        ? `${accessToken.slice(0, 6)}...${accessToken.slice(-6)}`
        : "(short/invalid)"

    console.log(`[QBO][${reqId}] realmId=${realmId}`)
    console.log(`[QBO][${reqId}] accessToken(masked)=${maskedToken}`)

    const apiBase = getQuickBooksApiBase()
    const baseUrl = `${apiBase}/v3/company/${realmId}/query`
    const query = encodeURIComponent("select * from Account")
    const url = `${baseUrl}?query=${query}`
    console.log(`[QBO][${reqId}] Fetching Accounts: ${url}`)

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const intuitTid = res.headers.get("intuit_tid")
    console.log(
      `[QBO][${reqId}] HTTP ${res.status} ${res.statusText} intuit_tid=${intuitTid ?? "n/a"}`
    )
        if (res.status === 401 || res.status === 403) {
      const txt = await res.text()
      console.log(`[QBO][${reqId}] Authorization error:`, txt)
      return NextResponse.json(
        { error: "ApplicationAuthorizationFailed" },
        { status: 401 }
      )
    }

    if (!res.ok) {
      const txt = await res.text()
      console.log(`[QBO][${reqId}] ERROR response body:`, txt)
      return NextResponse.json({ error: txt }, { status: 500 })
    }

    const json = await res.json()
    const accounts = Array.isArray(json?.QueryResponse?.Account)
      ? json.QueryResponse.Account
      : []

    console.log(`[QBO][${reqId}] Accounts fetched: count=${accounts.length}`)
    
    if (accounts.length > 0) {
      console.log(
        `[QBO][${reqId}] First 3 accounts (sample):`,
        accounts.slice(0, 3).map((a: any) => ({
          Id: a.Id,
          Name: a.Name,
          Type: a.AccountType,
          SubType: a.AccountSubType,
        }))
      );
    }

    // Upsert each account
    for (const acct of accounts as any[]) {
      const payload = {
        account_id: acct.Id,
        realm_id: realmId,
        name: acct.Name ?? null,
        account_type: acct.AccountType ?? null,
        account_sub_type: acct.AccountSubType ?? null,
        current_balance: acct.CurrentBalance ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("quickbooks_accounts")
        .upsert(payload)

      if (upsertErr) {
        console.log(
          `[QBO][${reqId}] UPSERT ERROR for account_id=${acct.Id}:`,
          upsertErr
        )
      } else {
        console.log(
          `[QBO][${reqId}] Upsert OK account_id=${acct.Id} name="${acct.Name}"`
        )
      }
    }

    const simplified = (accounts as any[]).map((a) => ({
      account_id: a.Id,
      name: a.Name ?? null,
      account_type: a.AccountType ?? null,
    }))

    console.log(
      `[QBO][${reqId}] Returning simplified list count=${simplified.length}`
    )
    console.log(`[QBO][${reqId}] DONE`)
    return NextResponse.json({ accounts: simplified })
  } catch (err: any) {
    console.log(`[QBO][${reqId}] UNHANDLED ERROR:`, {
      message: err?.message ?? String(err),
      stack: err?.stack ?? "(no stack)",
    });
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
