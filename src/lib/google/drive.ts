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

export async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const res = await fetch(`${DRIVE_BASE}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Drive folder create failed: ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

// Loose "does the file name contain this term" match, scoped to one folder
// and to actual video files — used by the public /pitch/[slug] page to find
// a manually-filmed outreach video by company name, without Andrew having
// to paste a URL anywhere. Andrew names files like "Trive Capital -
// outreach.mp4"; this doesn't require an exact match. Most-recently-modified
// match wins if more than one file matches.
export async function findVideoByNameInFolder(
  accessToken: string,
  folderId: string,
  nameContains: string,
): Promise<{ id: string } | null> {
  const escaped = nameContains.replace(/'/g, "\\'");
  const q = `'${folderId}' in parents and name contains '${escaped}' and mimeType contains 'video/' and trashed = false`;
  const res = await fetch(
    `${DRIVE_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Drive video search failed: ${await res.text()}`);
  const data = (await res.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0] ? { id: data.files[0].id } : null;
}

export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`${DRIVE_BASE}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive delete failed: ${await res.text()}`);
}

export type DriveSearchResult = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  modifiedTime: string | null;
};

// Read-only full-text search across the connected account's Drive — used by
// the Business Processes & Taxonomy agents (Nexus/Accord/Chronicle) to find
// company documents, not to read or modify their contents.
export async function searchFiles(accessToken: string, query: string): Promise<DriveSearchResult[]> {
  const escaped = query.replace(/'/g, "\\'");
  const q = `fullText contains '${escaped}' and trashed = false`;
  const res = await fetch(
    `${DRIVE_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&pageSize=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Drive search failed: ${await res.text()}`);
  const data = (await res.json()) as {
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      webViewLink?: string;
      modifiedTime?: string;
    }>;
  };
  return (data.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink ?? null,
    modifiedTime: f.modifiedTime ?? null,
  }));
}
