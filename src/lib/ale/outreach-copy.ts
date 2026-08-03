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

  // Matches the site's own /process CTA ("Begin Discovery") rather than a
  // generic "quick call" — Phase 1 (Discovery & Systems Audit) is the real
  // low-commitment entry point; the $5k/month retainer only comes up after
  // that audit actually delivers something concrete, never in cold outreach.
  lines.push(
    "Worth a quick discovery call to map where this fits into your workflow?",
    "",
    "Andrew",
    "Kivaro AI",
  );
  return lines.join("\n");
}

const CANONICAL_SEND_SIGNATURE = "Andrew Thomas, Kivaro AI";

// Splits a stored draft (buildOutreachEmail's output, used verbatim for
// the actual send) into Zoho's separate subject/content fields, and
// normalizes the trailing signature to the full "Andrew Thomas, Kivaro
// AI" for anything that actually goes out — deliberately doesn't touch
// buildOutreachEmail() itself, since the stored draft (also used for
// manual copy-paste from the Doc) keeps its shorter "Andrew\nKivaro AI"
// ending. Never throws: falls back to a template subject if the leading
// "Subject: ..." line is ever missing or hand-edited away.
export function parseOutreachEmailForSend(
  companyName: string,
  rawDraft: string,
): { subject: string; body: string } {
  const lines = rawDraft.replace(/\r\n/g, "\n").split("\n");

  let subject = `A quick idea for ${companyName}`;
  let bodyLines = lines;
  if (lines[0]?.trim().toLowerCase().startsWith("subject:")) {
    subject = lines[0].slice(lines[0].indexOf(":") + 1).trim() || subject;
    bodyLines = lines.slice(1);
  }

  const trimBlankEdges = (ls: string[]) => {
    const out = [...ls];
    while (out[0]?.trim() === "") out.shift();
    while (out.length && out[out.length - 1].trim() === "") out.pop();
    return out;
  };

  bodyLines = trimBlankEdges(bodyLines);

  // Strip whatever signature is already there (idempotent against both
  // the current template's two-line form and the canonical one, so this
  // can't double up if the template's own ending ever changes).
  const last = bodyLines[bodyLines.length - 1]?.trim().toLowerCase();
  const secondLast = bodyLines[bodyLines.length - 2]?.trim().toLowerCase();
  if (last === "kivaro ai" && secondLast === "andrew") {
    bodyLines = bodyLines.slice(0, -2);
  } else if (last === CANONICAL_SEND_SIGNATURE.toLowerCase()) {
    bodyLines = bodyLines.slice(0, -1);
  }
  bodyLines = trimBlankEdges(bodyLines);

  return { subject, body: [...bodyLines, "", CANONICAL_SEND_SIGNATURE].join("\n") };
}
