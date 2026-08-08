// Deliberately NOT a Gemini call — the email itself is already written by
// the pitch generator (PitchOutput.emailVariation); everything in here is
// mechanical formatting, so plain string work is more reliable and free.

const CANONICAL_SEND_SIGNATURE = "Andrew Thomas, Kivaro AI";
// The stored-draft ending (Doc + sheet, for manual copy-paste). Anything
// actually sent gets CANONICAL_SEND_SIGNATURE instead — see
// parseOutreachEmailForSend below.
const DRAFT_SIGNATURE = ["Andrew", "Kivaro AI"];

// Fallback only. The Email Variation is generated with its own "Subject:"
// line and that's what normally goes out; this covers a variation that was
// hand-edited in the sheet and lost its subject line. Deliberately plain —
// the old "A quick idea for ..." subject is gone along with the short
// outreach email it belonged to.
function fallbackSubject(companyName: string): string {
  return `Kivaro AI — ${companyName}`;
}

function trimBlankEdges(lines: string[]): string[] {
  const out = [...lines];
  while (out[0]?.trim() === "") out.shift();
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

// Pulls a leading "Subject: ..." line off a draft. Never throws: falls back
// to a template subject if that line is missing or hand-edited away.
function splitSubject(
  companyName: string,
  raw: string,
): { subject: string; bodyLines: string[] } {
  const lines = (raw ?? "").replace(/\r\n/g, "\n").split("\n");
  const first = lines[0]?.trim() ?? "";

  if (first.toLowerCase().startsWith("subject:")) {
    const parsed = first.slice(first.indexOf(":") + 1).trim();
    return {
      subject: parsed || fallbackSubject(companyName),
      bodyLines: trimBlankEdges(lines.slice(1)),
    };
  }
  return { subject: fallbackSubject(companyName), bodyLines: trimBlankEdges(lines) };
}

// Trailing lines that are a sign-off rather than content. Matched one line
// at a time from the bottom so any combination comes off cleanly — the
// Email Variation is model-written, so it arrives with whatever closing it
// felt like ("Best regards," / "Andrew" / "[Your Name]"), and a signature
// is appended by the caller. Keeping this strictly bottom-up and
// pattern-narrow is what stops it eating real body text.
const SIGN_OFF_PATTERNS = [
  /^andrew thomas,\s*kivaro ai$/i,
  /^kivaro ai[,.]?$/i,
  /^andrew(\s+thomas)?[,.]?$/i,
  /^\[[^\]]*\]$/, // "[Your Name]", "[Title]" — model placeholders
  /^(best|best regards|kind regards|warm regards|regards|sincerely|thanks|thank you|cheers|talk soon|all the best|looking forward)[,.!]?$/i,
];

function stripTrailingSignature(lines: string[]): string[] {
  const out = trimBlankEdges(lines);
  while (out.length) {
    const last = out[out.length - 1].trim();
    if (last === "" || SIGN_OFF_PATTERNS.some((p) => p.test(last))) {
      out.pop();
      continue;
    }
    break;
  }
  return trimBlankEdges(out);
}

// Renders the generator's full-length Email Variation into the send-ready
// draft stored in the Sales Pitch Log and shown at the top of the Doc.
//
// This replaced a separate short "A quick idea for ..." template that used
// to be generated alongside the variation and sent in its place. Per
// Andrew, the longer variation is the real pitch and the short one was
// undercutting it, so there is now exactly one outreach email and this is
// it. No CTA is appended here — the variation is prompted to close with
// its own discovery-call ask, in the register of the site's /process page,
// rather than having a second one bolted on underneath.
export function buildOutreachEmail(params: {
  companyName: string;
  emailVariation: string;
  videoLink?: string;
}): string {
  const { companyName, emailVariation, videoLink } = params;
  const { subject, bodyLines } = splitSubject(companyName, emailVariation);

  const lines = [`Subject: ${subject}`, "", ...stripTrailingSignature(bodyLines), ""];

  // Andrew films outreach videos per-company after the initial pitch is
  // generated — most pitches won't have one yet, so this line only appears
  // once a real video actually exists (see salespitch.ts's Drive lookup).
  if (videoLink) {
    lines.push(
      `I put together a short video breakdown of how Kivaro AI could help ${companyName} specifically — take a look here: ${videoLink}`,
      "",
    );
  }

  lines.push(...DRAFT_SIGNATURE);
  return lines.join("\n");
}

// Splits a stored draft (buildOutreachEmail's output, used verbatim for
// the actual send) into Zoho's separate subject/content fields, and
// normalizes the trailing signature to the full "Andrew Thomas, Kivaro
// AI" for anything that actually goes out — deliberately doesn't touch
// buildOutreachEmail() itself, since the stored draft (also used for
// manual copy-paste from the Doc) keeps its shorter "Andrew\nKivaro AI"
// ending. Idempotent: safe to run over its own output.
export function parseOutreachEmailForSend(
  companyName: string,
  rawDraft: string,
): { subject: string; body: string } {
  const { subject, bodyLines } = splitSubject(companyName, rawDraft);
  return {
    subject,
    body: [...stripTrailingSignature(bodyLines), "", CANONICAL_SEND_SIGNATURE].join("\n"),
  };
}
