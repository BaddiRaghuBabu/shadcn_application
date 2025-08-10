// src/lib/xeroService.ts
import { XeroClient } from "xero-node";

const scopes =
  (process.env.XERO_SCOPES ??
    "openid profile email offline_access accounting.contacts accounting.transactions").split(
    " ",
  );

export const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID!,
  clientSecret: process.env.XERO_CLIENT_SECRET!,
  redirectUris: [process.env.XERO_REDIRECT_URI!],
  scopes,
});
