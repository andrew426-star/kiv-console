const SEARCH_CONSOLE_BASE = "https://www.googleapis.com/webmasters/v3";
// The real, already-verified property — matches the Search Console URL
// Andrew provided (resource_id=sc-domain:kivaroai.com).
const SITE_URL = "sc-domain:kivaroai.com";

export type SearchConsoleRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Search Console data typically lags 2-3 days, so the window ends 3 days
// back rather than "today" (today/yesterday usually return empty rows).
export async function getSearchAnalytics(
  accessToken: string,
  { days = 28, dimensions = ["query"] }: { days?: number; dimensions?: string[] } = {},
): Promise<SearchConsoleRow[]> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const res = await fetch(
    `${SEARCH_CONSOLE_BASE}/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: isoDate(startDate),
        endDate: isoDate(endDate),
        dimensions,
        rowLimit: 10,
      }),
    },
  );
  if (!res.ok) throw new Error(`Search Console fetch failed: ${await res.text()}`);

  const data = (await res.json()) as { rows?: SearchConsoleRow[] };
  return data.rows ?? [];
}
