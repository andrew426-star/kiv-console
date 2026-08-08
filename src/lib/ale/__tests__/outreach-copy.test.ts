import { describe, expect, it } from "vitest";
import { buildOutreachEmail, parseOutreachEmailForSend } from "../outreach-copy";

const LONG_VARIATION = [
  "Subject: Stabilising assets at the speed of your data",
  "",
  "In 2018, a lean Dallas team bought the Weinstein library.",
  "",
  "That same instinct is what makes the current cycle expensive: the diligence",
  "window has compressed, but the reporting stack hasn't.",
  "",
  "Worth a short discovery call to map where this fits into your workflow?",
  "",
  "Best regards,",
  "Andrew",
].join("\n");

describe("buildOutreachEmail", () => {
  it("renders the long Email Variation, not a short template", () => {
    const draft = buildOutreachEmail({
      companyName: "Lantern Asset Management",
      emailVariation: LONG_VARIATION,
    });

    expect(draft).toContain("Subject: Stabilising assets at the speed of your data");
    expect(draft).toContain("the diligence");
    // The short "quick idea" template this replaced is gone for good.
    expect(draft).not.toContain("A quick idea for");
    expect(draft.trim().endsWith("Andrew\nKivaro AI")).toBe(true);
  });

  it("strips the model's own sign-off so the signature isn't doubled up", () => {
    const draft = buildOutreachEmail({
      companyName: "Acme Capital",
      emailVariation: LONG_VARIATION,
    });

    expect(draft).not.toContain("Best regards,");
    expect(draft.split("Andrew").length - 1).toBe(1);
  });

  it("strips model placeholders left in place of a signature", () => {
    const draft = buildOutreachEmail({
      companyName: "Acme Capital",
      emailVariation: ["Subject: Hi", "", "Real body text.", "", "Sincerely,", "[Your Name]"].join(
        "\n",
      ),
    });

    expect(draft).not.toContain("[Your Name]");
    expect(draft).not.toContain("Sincerely,");
    expect(draft).toContain("Real body text.");
  });

  it("adds the video line only when a video actually exists", () => {
    const withVideo = buildOutreachEmail({
      companyName: "Acme Capital",
      emailVariation: LONG_VARIATION,
      videoLink: "https://drive.google.com/file/d/abc/view",
    });
    const withoutVideo = buildOutreachEmail({
      companyName: "Acme Capital",
      emailVariation: LONG_VARIATION,
    });

    expect(withVideo).toContain("https://drive.google.com/file/d/abc/view");
    expect(withoutVideo).not.toContain("video breakdown");
  });

  it("falls back to a plain subject when the variation lost its Subject line", () => {
    const draft = buildOutreachEmail({
      companyName: "Acme Capital",
      emailVariation: "Just a body with no subject line.",
    });

    expect(draft.split("\n")[0]).toBe("Subject: Kivaro AI — Acme Capital");
  });
});

describe("parseOutreachEmailForSend", () => {
  it("splits the Subject line out and normalizes the signature", () => {
    const draft = buildOutreachEmail({
      companyName: "Lantern Asset Management",
      emailVariation: LONG_VARIATION,
    });

    const { subject, body } = parseOutreachEmailForSend("Lantern Asset Management", draft);

    expect(subject).toBe("Stabilising assets at the speed of your data");
    expect(body).not.toContain("Subject:");
    expect(body).toContain("In 2018, a lean Dallas team bought the Weinstein library.");
    expect(body.trim().endsWith("Andrew Thomas, Kivaro AI")).toBe(true);
    expect(body).not.toMatch(/\nAndrew\nKivaro AI/);
  });

  it("falls back to a template subject when the Subject line is missing", () => {
    const draft = ["Just a hook sentence.", "", "Andrew", "Kivaro AI"].join("\n");
    const { subject, body } = parseOutreachEmailForSend("Acme Capital", draft);

    expect(subject).toBe("Kivaro AI — Acme Capital");
    expect(body.trim().endsWith("Andrew Thomas, Kivaro AI")).toBe(true);
  });

  it("is idempotent if the canonical signature is already present", () => {
    const draft = ["Subject: Hi", "", "Some pitch text.", "", "Andrew Thomas, Kivaro AI"].join("\n");
    const { body } = parseOutreachEmailForSend("Acme Capital", draft);

    const occurrences = body.split("Andrew Thomas, Kivaro AI").length - 1;
    expect(occurrences).toBe(1);
  });

  it("still sends a legacy row's stored draft unchanged apart from the signature", () => {
    // Rows drafted before the long variation became the send source keep
    // their old stored text; the parse path must not mangle it.
    const legacy = ["Subject: A quick idea for Acme Capital", "", "Hook line.", "", "Andrew", "Kivaro AI"].join(
      "\n",
    );
    const { subject, body } = parseOutreachEmailForSend("Acme Capital", legacy);

    expect(subject).toBe("A quick idea for Acme Capital");
    expect(body).toContain("Hook line.");
  });
});
