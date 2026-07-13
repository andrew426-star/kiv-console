// Send-only (gmail.send scope) — used for the ALE daily-run completion
// notification to Andrew's own address. No inbox read access.
export async function sendGmail(
  accessToken: string,
  { to, subject, body }: { to: string; subject: string; body: string },
): Promise<void> {
  const message = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join(
    "\r\n",
  );
  const raw = Buffer.from(message).toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
}
