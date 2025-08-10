import { URLSearchParams } from "url"

const clientId = process.env.XERO_CLIENT_ID!
const clientSecret = process.env.XERO_CLIENT_SECRET!
const redirectUri = process.env.XERO_REDIRECT_URI!
const scopes =
  process.env.XERO_SCOPES ||
  "openid profile email offline_access accounting.contacts accounting.transactions"

interface TokenSet {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface XeroContact {
  ContactID: string
  Name: string
  EmailAddress?: string
  IsCustomer: boolean
  IsSupplier: boolean
}

export interface XeroInvoice {
  InvoiceID: string
  InvoiceNumber: string
  AmountDue: number
  Status: string

}

export const xero = {
  async buildConsentUrl(): Promise<string> {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
    })
    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`
  },

  async apiCallback(callbackUrl: string): Promise<TokenSet> {
    const url = new URL(callbackUrl)
    const code = url.searchParams.get("code")
    if (!code) throw new Error("No code in callback URL")

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    })

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    const res = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Token exchange failed: ${text}`)
    }

    return (await res.json()) as TokenSet
  },

  async getConnections(accessToken: string) {
    const res = await fetch("https://api.xero.com/connections", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch connections: ${text}`)
    }
    return (await res.json()) as Array<{ tenantId: string }>
  },

  async getContacts(
    accessToken: string,
    tenantId: string
  ): Promise<XeroContact[]> {
    const res = await fetch("https://api.xero.com/api.xro/2.0/Contacts", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch contacts: ${text}`)
    }

    const data = await res.json()
    return (data.Contacts as XeroContact[]) ?? []
  },
  
  async getInvoices(
    accessToken: string,
    tenantId: string
  ): Promise<XeroInvoice[]> {
    const res = await fetch("https://api.xero.com/api.xro/2.0/Invoices", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch invoices: ${text}`)
    }

    const data = await res.json()
    return (data.Invoices as XeroInvoice[]) ?? []
  },
}

export type { TokenSet }