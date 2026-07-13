const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

export async function findFolderIdByName(
  accessToken: string,
  name: string,
): Promise<string | null> {
  const escaped = name.replace(/'/g, "\\'");
  const q = `name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await fetch(
    `${DRIVE_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Drive folder search failed: ${await res.text()}`);
  const data = (await res.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0]?.id ?? null;
}

// A Doc created via the Docs API lands in the account's root "My Drive" —
// this moves it into the target folder afterward.
export async function moveFileToFolder(
  accessToken: string,
  fileId: string,
  folderId: string,
): Promise<void> {
  const getRes = await fetch(`${DRIVE_BASE}/files/${fileId}?fields=parents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!getRes.ok) throw new Error(`Drive get-parents failed: ${await getRes.text()}`);
  const { parents } = (await getRes.json()) as { parents?: string[] };

  const params = new URLSearchParams({ addParents: folderId });
  if (parents && parents.length > 0) params.set("removeParents", parents.join(","));

  const res = await fetch(`${DRIVE_BASE}/files/${fileId}?${params.toString()}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive move-to-folder failed: ${await res.text()}`);
}
