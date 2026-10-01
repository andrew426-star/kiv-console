import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { listRecentInboxMessages, type InboxMessage } from "@/lib/google/gmail";
import { withSchoolAccount, type SchoolConnectionStatus } from "@/lib/google/school-access-token";

const PREVIEW_SIZE = 8;

export type InboxState =
  | { connected: false }
  | { connected: true; messages: InboxMessage[]; school: SchoolConnectionStatus }
  | { connected: true; fetchError: string; school: SchoolConnectionStatus };

// Kivaro and Louisiana Tech inboxes in one newest-first list. The school
// side fails on its own (reported in `school`) without hiding Kivaro mail.
export async function getInboxPreview(): Promise<InboxState> {
  const schoolPromise = withSchoolAccount(async (token) =>
    (await listRecentInboxMessages(token, PREVIEW_SIZE)).map((m) => ({
      ...m,
      id: `school:${m.id}`,
      source: "school" as const,
    })),
  );

  try {
    const accessToken = await getWorkspaceAccessToken();
    if (!accessToken) return { connected: false };

    const [workspaceMessages, { status: school, items: schoolMessages }] = await Promise.all([
      listRecentInboxMessages(accessToken, PREVIEW_SIZE),
      schoolPromise,
    ]);
    const messages = [...workspaceMessages, ...schoolMessages]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, PREVIEW_SIZE);
    return { connected: true, messages, school };
  } catch (err) {
    console.error("Failed to load Gmail inbox preview", err);
    return {
      connected: true,
      fetchError: err instanceof Error ? err.message : "Unknown error",
      school: (await schoolPromise).status,
    };
  }
}
