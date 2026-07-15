import { generateWithToolLoop } from "@/lib/ai/gemini";
import { WEB_SEARCH_DECL, dispatchWebSearch } from "@/lib/ai/web-search";
import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { ensureTabExists, appendRows, getRows } from "@/lib/google/sheets";
import { findFolderIdByName, moveFileToFolder } from "@/lib/google/drive";
import { createDoc } from "@/lib/google/docs";
import { generateShowcase } from "./showcase";
import {
  GLE_SPREADSHEET_ID,
  WEBSITES_TAB,
  ALE_SPREADSHEET_ID,
  COMPANIES_TAB,
  SALES_PITCH_LOG_SPREADSHEET_ID,
  HISTORY_TAB,
  HISTORY_HEADER,
  PROBLEMS_TAB,
  PROBLEMS_HEADER,
  NEW_ERA_TAB,
  NEW_ERA_HEADER,
  SALES_PITCH_LOG_TAB,
  SALES_PITCH_LOG_HEADER,
  SALES_PITCH_DRIVE_FOLDER_NAME,
} from "./spreadsheets";

type ProblemOutput = {
  sourceUrl: string;
  date: string;
  operationalPainPoint: string;
  proposedSolution: string;
};

type NewEraOutput = {
  strategicOpportunity: string;
  useCase: string;
  architecture: string;
  components: string;
  demoSetup: string;
  liveDemoScript: string;
  prebuiltVsLive: string;
  benefit: string;
};

type PitchOutput = {
  companyHistory: string;
  keyAchievements: string;
  hook: string;
  problem: ProblemOutput | null;
  newEra: NewEraOutput | null;
  initialPitch: string;
  emailVariation: string;
  followUpCallVariation: string;
  demoSetup: string;
};

async function generatePitchContent(
  companyName: string,
  website: string,
  businessOverview: string,
): Promise<PitchOutput> {
  const prompt = `You're building a sales pitch for Kivaro AI (an AI automation company for hedge funds/investment firms) to send to "${companyName}" (${website}).

Known business overview: ${businessOverview}

You have a limited number of searches (at most 5-6 total across everything below) — once you've used them, or found what you need sooner, stop searching and write the final JSON. An incomplete or best-effort field beats never finishing.

Do the following, using web search for anything you state as fact:

1. Company History: a short history of the company, its key achievements, and a "hook" — an attention-grabbing opening line referencing something specific and real about them.

2. Search for a real, concrete operational problem this company has that's solvable with AI or automation — sourced from public records or news from the LAST 12 MONTHS. Only report one if you find a real, citable source (include its exact URL and publish date). If you cannot find a real, dated, citable source for a specific problem, do not invent one — instead produce a "New Era" proposition: a forward-looking AI-integration opportunity (not tied to a specific reported problem), covering: the strategic opportunity, a concrete use case, a proposed architecture, key components, how a demo would be set up, a live demo script, whether it's better pre-built or built live in the meeting, and the benefit to them.

3. Using whichever of the above you produced (problem+solution, or New Era), write the final pitch materials — these four go into the actual sales pitch document Andrew sends, so they must stand on their own without repeating the History/Problem/New-Era detail above verbatim:
   - initialPitch: an initial pitch (a few paragraphs) that opens with the hook and makes the case using whichever problem/opportunity you found.
   - emailVariation: a short, ready-to-send email (with subject line).
   - followUpCallVariation: talking points for a follow-up call if they don't respond within 3 days.
   - demoSetup: a concrete plan for a live product demo in a follow-up meeting with this company — what to show, in what order, using which data/module — grounded in the problem/opportunity you identified.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{
  "companyHistory": "...", "keyAchievements": "...", "hook": "...",
  "problem": {"sourceUrl": "...", "date": "...", "operationalPainPoint": "...", "proposedSolution": "..."} or null,
  "newEra": {"strategicOpportunity": "...", "useCase": "...", "architecture": "...", "components": "...", "demoSetup": "...", "liveDemoScript": "...", "prebuiltVsLive": "...", "benefit": "..."} or null,
  "initialPitch": "...", "emailVariation": "...", "followUpCallVariation": "...", "demoSetup": "..."
}
Exactly one of "problem"/"newEra" must be non-null — never both, never neither. The top-level "demoSetup" is separate from newEra.demoSetup (that one's just for the New Era tab) — always fill in the top-level one, in both branches.`;

  const text = await generateWithToolLoop({
    initialPrompt: prompt,
    tools: [{ functionDeclarations: [WEB_SEARCH_DECL] }],
    dispatch: (name, args) => {
      if (name !== "web_search") throw new Error(`Unknown tool: ${name}`);
      return dispatchWebSearch(args);
    },
    // This call produces more fields (History + Problem-or-New-Era + 4
    // pitch pieces) than Stage 2's research call — 8000 was still getting
    // truncated mid-JSON on companies needing more web-search turns.
    maxOutputTokens: 16000,
    maxIterations: 8,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini did not return parseable JSON");

  try {
    return JSON.parse(jsonMatch[0]) as PitchOutput;
  } catch {
    throw new Error("Gemini's response was not valid JSON");
  }
}

// Deliberately just the four send-ready pieces — the History/Problem/New-Era
// research behind them already lives in this spreadsheet's other tabs, so
// this doc doesn't repeat it (per Andrew: doc holds the pitch, not the
// research it's based on).
function buildDocText(companyName: string, pitch: PitchOutput): string {
  return [
    `${companyName} — Sales Pitch`,
    "",
    "INITIAL PITCH",
    pitch.initialPitch,
    "",
    "EMAIL VARIATION",
    pitch.emailVariation,
    "",
    "FOLLOW-UP CALL VARIATION (if no response within 3 days)",
    pitch.followUpCallVariation,
    "",
    "DEMO SETUP",
    pitch.demoSetup,
  ].join("\n");
}

export type SalesPitchResult = { docUrl: string; folderFound: boolean };

// Stage 3 — manual, per-lead trigger. Requires Stage 2 (a Companies tab
// entry) to already exist for this lead. Writes History + (Problems or
// New Era) into the real Sales Pitch Log spreadsheet, then a Google Doc
// into the "Sales Pitches: Investment Institutions" Drive folder.
export async function generateSalesPitch(placeId: string): Promise<SalesPitchResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) throw new Error("Google account not connected");

  const websiteRows = await getRows(accessToken, GLE_SPREADSHEET_ID, WEBSITES_TAB);
  const websiteRow = websiteRows.find((r) => r[2] === placeId);
  if (!websiteRow) throw new Error(`No Websites entry found for place_id ${placeId}`);
  const [name, website] = websiteRow;

  const companiesRows = await getRows(accessToken, ALE_SPREADSHEET_ID, COMPANIES_TAB);
  const companyRow = companiesRows.find((r) => r[0] === name);
  if (!companyRow) {
    throw new Error(`No Companies entry for "${name}" — run Research & Extract first`);
  }
  const businessOverview = companyRow[4] ?? "";

  await Promise.all([
    ensureTabExists(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, HISTORY_TAB, HISTORY_HEADER),
    ensureTabExists(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, PROBLEMS_TAB, PROBLEMS_HEADER),
    ensureTabExists(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, NEW_ERA_TAB, NEW_ERA_HEADER),
    ensureTabExists(
      accessToken,
      SALES_PITCH_LOG_SPREADSHEET_ID,
      SALES_PITCH_LOG_TAB,
      SALES_PITCH_LOG_HEADER,
    ),
  ]);

  const pitch = await generatePitchContent(name, website, businessOverview);

  await appendRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, HISTORY_TAB, [
    [name, pitch.companyHistory, pitch.keyAchievements, pitch.hook],
  ]);

  if (pitch.problem) {
    await appendRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, PROBLEMS_TAB, [
      [
        name,
        pitch.problem.sourceUrl,
        pitch.problem.date,
        pitch.problem.operationalPainPoint,
        pitch.problem.proposedSolution,
      ],
    ]);
  } else if (pitch.newEra) {
    await appendRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, NEW_ERA_TAB, [
      [
        name,
        pitch.newEra.strategicOpportunity,
        pitch.newEra.useCase,
        pitch.newEra.architecture,
        pitch.newEra.components,
        pitch.newEra.demoSetup,
        pitch.newEra.liveDemoScript,
        pitch.newEra.prebuiltVsLive,
        pitch.newEra.benefit,
      ],
    ]);
  }

  const docId = await createDoc(accessToken, `${name} Sales Pitch`, buildDocText(name, pitch));
  const folderId = await findFolderIdByName(accessToken, SALES_PITCH_DRIVE_FOLDER_NAME);
  if (folderId) {
    await moveFileToFolder(accessToken, docId, folderId);
  }
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

  // Blueprint fires here automatically — a mock showcase for sales calls/
  // audits, built from this same pitch's Demo Setup. A showcase failure
  // shouldn't fail the sales pitch itself (that's the more important
  // artifact), so this is caught and logged as a missing URL, not thrown.
  const showcaseUrl = await generateShowcase(accessToken, name, pitch.demoSetup)
    .then((r) => r.docUrl)
    .catch((err) => {
      console.error(`Showcase generation failed for "${name}"`, err);
      return "";
    });

  await appendRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB, [
    [
      name,
      docUrl,
      pitch.initialPitch,
      pitch.emailVariation,
      pitch.followUpCallVariation,
      pitch.demoSetup,
      new Date().toISOString(),
      showcaseUrl,
    ],
  ]);

  return { docUrl, folderFound: Boolean(folderId) };
}
