const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export async function getSheetTabTitles(
  accessToken: string,
  spreadsheetId: string,
): Promise<string[]> {
  const res = await fetch(`${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Sheets get failed: ${await res.text()}`);
  const data = (await res.json()) as { sheets?: Array<{ properties: { title: string } }> };
  return (data.sheets ?? []).map((s) => s.properties.title);
}

export async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  rows: (string | number | null)[][],
): Promise<void> {
  if (rows.length === 0) return;
  const range = `'${tabTitle}'!A1`;
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    },
  );
  if (!res.ok) throw new Error(`Sheets append failed for "${tabTitle}": ${await res.text()}`);
}

// Creates the tab with a header row if it doesn't already exist. Safe to
// call before every write — a no-op once the tab is there.
export async function ensureTabExists(
  accessToken: string,
  spreadsheetId: string,
  title: string,
  header: string[],
): Promise<void> {
  const titles = await getSheetTabTitles(accessToken, spreadsheetId);
  if (titles.includes(title)) return;

  const res = await fetch(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
  if (!res.ok) throw new Error(`Sheets addSheet failed for "${title}": ${await res.text()}`);

  await appendRows(accessToken, spreadsheetId, title, [header]);
}

// Reads a single column (skipping the header row) — used for dedup checks,
// e.g. "which place_ids are already in the Maps Data tab."
export async function getColumnValues(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  column: string,
): Promise<string[]> {
  const range = `'${tabTitle}'!${column}2:${column}`;
  const res = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Sheets read failed for "${tabTitle}": ${await res.text()}`);
  const data = (await res.json()) as { values?: string[][] };
  return (data.values ?? []).map((row) => row[0]).filter((v): v is string => Boolean(v));
}

// Reads full rows (skipping the header row) — used to render a tab's
// contents in the K.I.V. UI.
export async function getRows(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
): Promise<string[][]> {
  const range = `'${tabTitle}'!A2:Z`;
  const res = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Sheets read failed for "${tabTitle}": ${await res.text()}`);
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}
