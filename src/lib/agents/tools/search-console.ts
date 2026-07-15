import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getSearchAnalytics, type SearchConsoleRow } from "@/lib/google/search-console";

export type SearchConsoleForAgent =
  | { connected: false }
  | { connected: true; topQueries: SearchConsoleRow[]; topPages: SearchConsoleRow[] };

// Canvas's website-tracking tool — kivaroai.com's real Search Console
// performance (last ~28 days), read-only.
export async function getSearchConsoleStatsForAgent(): Promise<SearchConsoleForAgent> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  const [topQueries, topPages] = await Promise.all([
    getSearchAnalytics(accessToken, { dimensions: ["query"] }),
    getSearchAnalytics(accessToken, { dimensions: ["page"] }),
  ]);
  return { connected: true, topQueries, topPages };
}
