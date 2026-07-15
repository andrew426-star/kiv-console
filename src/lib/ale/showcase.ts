import { generateContent, textPart } from "@/lib/ai/gemini";
import { createDoc } from "@/lib/google/docs";
import { findFolderIdByName, moveFileToFolder } from "@/lib/google/drive";
import { SHOWCASE_DRIVE_FOLDER_NAME } from "./spreadsheets";

async function generateShowcaseContent(companyName: string, demoSetup: string): Promise<string> {
  const prompt = `You're expanding a brief "Demo Setup" plan into a full, presentation-ready mock showcase script for Kivaro AI to use live on a sales call or audit with "${companyName}".

Demo Setup plan:
${demoSetup}

Write a step-by-step showcase script Andrew can literally read from and act on during the live call. For each step include: what to say (talking points), what to show on screen (specific UI/data/module), and a rough timing cue. Open with a hook/framing line and close with a clear call-to-action for next steps.

Write in plain text: no markdown headers, no asterisks. Use numbered steps.`;

  const { parts, finishReason } = await generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    maxOutputTokens: 4000,
  });

  if (finishReason === "SAFETY" || finishReason === "RECITATION") {
    throw new Error("Gemini declined to generate a showcase script");
  }
  if (finishReason === "MAX_TOKENS") {
    throw new Error("Gemini's showcase response was truncated (hit max output tokens)");
  }

  const text = textPart(parts);
  if (!text) throw new Error("Gemini returned no text content");
  return text;
}

export type ShowcaseResult = { docUrl: string; folderFound: boolean };

// Blueprint's core capability — a mock client showcase built from an
// existing sales pitch's Demo Setup, for use live in a sales call/audit.
// Called both automatically (Stage 3's generateSalesPitch, right after a
// pitch is drafted) and manually (Blueprint's Slack tool, "when prompted").
export async function generateShowcase(
  accessToken: string,
  companyName: string,
  demoSetup: string,
): Promise<ShowcaseResult> {
  const content = await generateShowcaseContent(companyName, demoSetup);
  const docId = await createDoc(accessToken, `${companyName} Showcase Script`, content);
  const folderId = await findFolderIdByName(accessToken, SHOWCASE_DRIVE_FOLDER_NAME);
  if (folderId) {
    await moveFileToFolder(accessToken, docId, folderId);
  }
  return { docUrl: `https://docs.google.com/document/d/${docId}/edit`, folderFound: Boolean(folderId) };
}
