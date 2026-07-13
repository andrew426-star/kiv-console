const DOCS_BASE = "https://docs.googleapis.com/v1/documents";

// Creates a new Google Doc with the given title and plain-text body, and
// returns its document ID (== its Drive file ID). Lands in root "My Drive" —
// callers that need it in a specific folder should follow up with
// moveFileToFolder() from src/lib/google/drive.ts.
export async function createDoc(
  accessToken: string,
  title: string,
  bodyText: string,
): Promise<string> {
  const createRes = await fetch(DOCS_BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!createRes.ok) throw new Error(`Docs create failed: ${await createRes.text()}`);
  const { documentId } = (await createRes.json()) as { documentId: string };

  const updateRes = await fetch(`${DOCS_BASE}/${documentId}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ insertText: { location: { index: 1 }, text: bodyText } }],
    }),
  });
  if (!updateRes.ok) throw new Error(`Docs insertText failed: ${await updateRes.text()}`);

  return documentId;
}
