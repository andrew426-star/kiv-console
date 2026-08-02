// Deliberately NOT a Gemini call — this needs no new reasoning, just
// formatting, so a template is more reliable and free.

export function buildOutreachEmail(params: {
  companyName: string;
  hook: string;
  videoLink?: string;
}): string {
  const { companyName, hook, videoLink } = params;
  const lines = [`Subject: A quick idea for ${companyName}`, "", hook, ""];

  // Andrew films outreach videos per-company after the initial pitch is
  // generated — most pitches won't have one yet, so this line only appears
  // once a real video actually exists (see salespitch.ts's Drive lookup).
  if (videoLink) {
    lines.push(
      `I put together a short video breakdown of how Kivaro AI could help ${companyName} specifically — take a look here: ${videoLink}`,
      "",
    );
  }

  lines.push("Worth a quick call if it's useful?", "", "Andrew", "Kivaro AI");
  return lines.join("\n");
}
