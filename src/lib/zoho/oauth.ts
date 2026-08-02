const zohoAccountsDomain = () => process.env.ZOHO_ACCOUNTS_DOMAIN ?? "accounts.zoho.com";
const zohoApiDomain = () => process.env.ZOHO_API_DOMAIN ?? "mail.zoho.com";

// Send-only — Pipeline never reads the inbox, only sends. Comma-separated,
// unlike Google's space-separated scope string; confirmed against Zoho's
// own OAuth docs (verified again during Jarvis's separate read-only Zoho
// Mail integration earlier this session).
const ZOHO_SCOPE = "ZohoMail.accounts.READ,ZohoMail.messages.CREATE";

export function buildZohoAuthUrl(redirectUri: string, state: string) {
  if (!process.env.ZOHO_CLIENT_ID) {
    throw new Error("Zoho Mail isn't configured yet — ZOHO_CLIENT_ID is unset.");
  }
  const params = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ZOHO_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://${zohoAccountsDomain()}/oauth/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(`https://${zohoAccountsDomain()}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Zoho token exchange failed: ${await res.text()}`);
  // Zoho's response includes its own "api_domain" field (e.g.
  // https://www.zohoapis.com) — deliberately never read: that's a
  // different, generic cross-product host, not Mail's own
  // mail.zoho.<tld> API host. ZOHO_API_DOMAIN below is the single source
  // of truth for all Mail API calls instead.
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(`https://${zohoAccountsDomain()}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Zoho token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

// Called once, in the OAuth callback right after token exchange. Whichever
// Zoho account completes the consent screen is permanently the account
// every send uses as fromAddress — this is where "sends from
// andrew.thomas@kivaroai.com" is actually determined, nowhere else.
export async function resolveZohoAccount(
  accessToken: string,
): Promise<{ accountId: string; emailAddress: string }> {
  const res = await fetch(`https://${zohoApiDomain()}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Zoho accounts fetch failed: ${await res.text()}`);
  const data = (await res.json()) as {
    data?: Array<{ accountId: string; emailAddress?: Array<{ mailId: string; isPrimary?: boolean }> }>;
  };
  const account = data.data?.[0];
  if (!account) throw new Error("Zoho returned no mail accounts for this login");
  const addresses = account.emailAddress ?? [];
  const primary = addresses.find((a) => a.isPrimary) ?? addresses[0];
  if (!primary) throw new Error("Zoho account has no email address on file");
  return { accountId: account.accountId, emailAddress: primary.mailId };
}
