import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { searchFiles, type DriveSearchResult } from "@/lib/google/drive";

export type CompanyDriveSearch =
  | { connected: false }
  | { connected: true; files: DriveSearchResult[] };

// Admin-scoped (no session in a Slack webhook context) read-only Drive
// search for the BPT division (Nexus/Accord/Chronicle) — same Google
// Workspace connection ALE already uses.
export async function searchCompanyDriveForAgent(query: string): Promise<CompanyDriveSearch> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };
  const files = await searchFiles(accessToken, query);
  return { connected: true, files };
}
