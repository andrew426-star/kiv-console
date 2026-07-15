const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// Despite the name, this is now K.I.V.'s general Google Workspace
// connection, not just Calendar — the Autonomous Lead Engine reuses the
// same OAuth grant for Sheets/Docs/Drive/Gmail rather than a separate
// service account, so it needs a broader scope set:
// - calendar.readonly: existing Calendar module
// - userinfo.email: so /oauth2/v2/userinfo can tell us which account
//   connected (shown in the UI) — without it, that call 401s even with an
//   otherwise-valid token
// - spreadsheets / documents: read/write ALE's existing Sheets and create
//   Sales Pitch Docs. Note these (unlike drive.file) grant access to files
//   that already exist and weren't created by this app.
// - drive: needed (not the narrower drive.file) to find the pre-existing
//   "Sales Pitches: Investment Institutions" folder by name and place new
//   Docs into it — drive.file only sees files the app itself created.
// - gmail.send: the ALE daily-run completion email. Send-only, no inbox
//   read access.
// - webmasters.readonly: Canvas's Search Console tool (kivaroai.com
//   performance) — read-only, matches "tracking," not managing the
//   property.
// - gmail.metadata: the Overview page's Inbox preview — headers/subject/
//   sender/snippet/labels only, never message bodies. Deliberately not
//   gmail.readonly (full body access), since a preview never needs that.
const CALENDAR_SCOPE = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.metadata",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");

export function buildGoogleAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function fetchGoogleUserEmail(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${await res.text()}`);
  const data = (await res.json()) as { email: string };
  return data.email;
}

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  htmlLink: string;
};

export async function fetchUpcomingEvents(
  accessToken: string,
  { days = 14 }: { days?: number } = {},
): Promise<GoogleCalendarEvent[]> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Google Calendar fetch failed: ${await res.text()}`);
  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      htmlLink: string;
      start: { date?: string; dateTime?: string };
      end: { date?: string; dateTime?: string };
    }>;
  };

  return (data.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? "(No title)",
    start: item.start.dateTime ?? item.start.date ?? null,
    end: item.end.dateTime ?? item.end.date ?? null,
    allDay: !item.start.dateTime,
    htmlLink: item.htmlLink,
  }));
}
