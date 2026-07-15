const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export type InboxMessage = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  unread: boolean;
};

function headerValue(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// Overview's Inbox preview — metadata only (gmail.metadata scope): subject,
// sender, snippet, date, read/unread. Never fetches message bodies, even
// though this account's grant would technically allow requesting them
// (format=full needs gmail.readonly, which this deliberately doesn't ask
// for) — a preview has no reason to read actual email content.
export async function listRecentInboxMessages(
  accessToken: string,
  maxResults = 8,
): Promise<InboxMessage[]> {
  const listRes = await fetch(`${GMAIL_BASE}/messages?labelIds=INBOX&maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new Error(`Gmail list failed: ${await listRes.text()}`);
  const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
  const ids = (listData.messages ?? []).map((m) => m.id);

  return Promise.all(
    ids.map(async (id) => {
      const params = new URLSearchParams({ format: "metadata" });
      params.append("metadataHeaders", "Subject");
      params.append("metadataHeaders", "From");

      const res = await fetch(`${GMAIL_BASE}/messages/${id}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Gmail message fetch failed: ${await res.text()}`);

      const data = (await res.json()) as {
        id: string;
        snippet?: string;
        internalDate?: string;
        labelIds?: string[];
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      const headers = data.payload?.headers ?? [];

      return {
        id: data.id,
        subject: headerValue(headers, "Subject") || "(No subject)",
        from: headerValue(headers, "From"),
        snippet: data.snippet ?? "",
        date: data.internalDate ? new Date(Number(data.internalDate)).toISOString() : "",
        unread: (data.labelIds ?? []).includes("UNREAD"),
      };
    }),
  );
}

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
