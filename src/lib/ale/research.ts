import Anthropic from "@anthropic-ai/sdk";
import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { ensureTabExists, appendRows, getRows } from "@/lib/google/sheets";
import {
  GLE_SPREADSHEET_ID,
  WEBSITES_TAB,
  HUNTER_TAB,
  ALE_SPREADSHEET_ID,
  COMPANIES_TAB,
  COMPANIES_HEADER,
  CONTACTS_TAB,
  CONTACTS_HEADER,
} from "./spreadsheets";

const client = new Anthropic();

async function fetchPhoneNumber(placeId: string): Promise<string> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return "";
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "internationalPhoneNumber" },
  });
  if (!res.ok) return "";
  const data = (await res.json()) as { internationalPhoneNumber?: string };
  return data.internationalPhoneNumber ?? "";
}

type ContactInput = {
  name: string;
  title: string;
  email: string;
  linkedin: string;
  twitter: string;
};

type ResearchOutput = {
  businessOverview: string;
  aum: string;
  contacts: Array<{ name: string; instagram: string | null; facebook: string | null }>;
};

async function researchWithClaude(
  companyName: string,
  website: string,
  contacts: ContactInput[],
): Promise<ResearchOutput> {
  const contactList =
    contacts.map((c) => `- ${c.name} (${c.title || "unknown title"})`).join("\n") ||
    "(no known contacts)";

  const prompt = `Research the company "${companyName}" (${website}) for Kivaro AI's lead pipeline.

1. Write a business overview covering their strategy, capital, and scale — 2-4 sentences, based on real information you find. If you can't find enough to say something substantive, say so plainly rather than inventing detail.

2. If you can find a real assets-under-management (or comparable scale) figure, report it (e.g. "$1.4B"). Otherwise use an empty string — do not estimate or guess.

3. For each contact below, try to find their Instagram and Facebook profiles via web search. Only include a handle/URL if you find one with reasonable confidence it's the same person — otherwise use null. Do not guess.

Contacts:
${contactList}

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"businessOverview": "...", "aum": "...", "contacts": [{"name": "...", "instagram": "..." or null, "facebook": "..." or null}]}`;

  // Streamed + a larger budget than a plain single-shot call — 2048 was
  // getting truncated mid-JSON on companies needing more web-search turns
  // (no closing brace ever appeared, so the regex below found nothing).
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  });
  for await (const _event of stream) {
    void _event;
  }
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to research this company");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude's research response was truncated (hit max_tokens)");
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return parseable JSON");

  try {
    return JSON.parse(jsonMatch[0]) as ResearchOutput;
  } catch {
    throw new Error("Claude's response was not valid JSON");
  }
}

export type ResearchResult = { contactsWritten: number };

// Stage 2 — manual, per-lead trigger (real cost/time per company, same
// reasoning as Hunter enrichment staying manual). Combines Stage 1's GLE
// data (website, address — from Websites tab; contacts — from Hunter tab)
// with a fresh Places Details call for phone (not captured in Stage 1,
// matching the spec's own Stage 1 field lists) and a Claude + web-search
// call for the Business Overview, AUM, and any findable Instagram/Facebook
// profiles, then writes into the real ALE spreadsheet's Companies/Contacts
// tabs — which already existed with real data before this pipeline, keyed
// by Company Name (no place_id column there).
export async function researchCompanyAndContacts(placeId: string): Promise<ResearchResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) throw new Error("Google account not connected");

  await ensureTabExists(accessToken, ALE_SPREADSHEET_ID, COMPANIES_TAB, COMPANIES_HEADER);
  await ensureTabExists(accessToken, ALE_SPREADSHEET_ID, CONTACTS_TAB, CONTACTS_HEADER);

  const [websiteRows, hunterRows, phone] = await Promise.all([
    getRows(accessToken, GLE_SPREADSHEET_ID, WEBSITES_TAB),
    getRows(accessToken, GLE_SPREADSHEET_ID, HUNTER_TAB),
    fetchPhoneNumber(placeId),
  ]);

  // Websites columns: name, website, place_id, formatted_address, user_ratings_total, rating
  const websiteRow = websiteRows.find((r) => r[2] === placeId);
  if (!websiteRow) throw new Error(`No Websites entry found for place_id ${placeId}`);
  const [name, website, , formattedAddress] = websiteRow;

  // Hunter columns: place_id, formatted_address, name, website, user_ratings_total,
  // rating, email, first_name, last_name, position, position_raw, seniority,
  // department, linkedin, twitter, phone_number
  const contactRows = hunterRows.filter((r) => r[0] === placeId);
  if (contactRows.length === 0) {
    throw new Error("No enriched contacts found for this lead — run Hunter enrichment first");
  }
  const contacts: ContactInput[] = contactRows.map((r) => ({
    name: [r[7], r[8]].filter(Boolean).join(" ") || r[6],
    title: r[9] || r[10] || "",
    email: r[6] ?? "",
    linkedin: r[13] ?? "",
    twitter: r[14] ?? "",
  }));

  const research = await researchWithClaude(name, website, contacts);

  await appendRows(accessToken, ALE_SPREADSHEET_ID, COMPANIES_TAB, [
    [name, website, formattedAddress ?? "", phone, research.businessOverview, research.aum, "TRUE"],
  ]);

  const socialByName = new Map(research.contacts.map((c) => [c.name, c]));
  const contactsRows = contacts.map((c) => {
    const social = socialByName.get(c.name);
    return [
      name,
      website,
      formattedAddress ?? "",
      phone,
      research.businessOverview,
      c.name,
      c.title,
      c.email,
      c.linkedin,
      social?.instagram ?? "",
      c.twitter,
      social?.facebook ?? "",
    ];
  });
  await appendRows(accessToken, ALE_SPREADSHEET_ID, CONTACTS_TAB, contactsRows);

  return { contactsWritten: contactsRows.length };
}
