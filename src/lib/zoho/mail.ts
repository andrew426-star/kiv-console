const zohoApiDomain = () => process.env.ZOHO_API_DOMAIN ?? "mail.zoho.com";

// Pipeline's real outreach-send capability. mailFormat is always passed
// explicitly as "plaintext" — Zoho's API defaults to "html", which would
// silently collapse the draft's real \n line breaks into a run-on
// paragraph if left unset.
export async function sendZohoEmail(
  accessToken: string,
  accountId: string,
  { fromAddress, toAddress, subject, content }: {
    fromAddress: string;
    toAddress: string;
    subject: string;
    content: string;
  },
): Promise<void> {
  const res = await fetch(`https://${zohoApiDomain()}/api/accounts/${accountId}/messages`, {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fromAddress, toAddress, subject, content, mailFormat: "plaintext" }),
  });
  if (!res.ok) throw new Error(`Zoho Mail send failed: ${await res.text()}`);
}
