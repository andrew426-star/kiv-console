import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { listRecentInboxMessages, type InboxMessage } from "@/lib/google/gmail";

export type InboxState =
  | { connected: false }
  | { connected: true; messages: InboxMessage[] }
  | { connected: true; fetchError: string };

export async function getInboxPreview(): Promise<InboxState> {
  try {
    const accessToken = await getWorkspaceAccessToken();
    if (!accessToken) return { connected: false };

    const messages = await listRecentInboxMessages(accessToken, 8);
    return { connected: true, messages };
  } catch (err) {
    console.error("Failed to load Gmail inbox preview", err);
    return {
      connected: true,
      fetchError: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
