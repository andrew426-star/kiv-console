import { describe, expect, it } from "vitest";
import { parseOutreachEmailForSend } from "../outreach-copy";

describe("parseOutreachEmailForSend", () => {
  it("splits the Subject line out and normalizes the signature", () => {
    const draft = [
      "Subject: A quick idea for Lantern Asset Management",
      "",
      "In 2018, a lean Dallas team bought the Weinstein library.",
      "",
      "Worth a quick call if it's useful?",
      "",
      "Andrew",
      "Kivaro AI",
    ].join("\n");

    const { subject, body } = parseOutreachEmailForSend("Lantern Asset Management", draft);

    expect(subject).toBe("A quick idea for Lantern Asset Management");
    expect(body).not.toContain("Subject:");
    expect(body).toContain("In 2018, a lean Dallas team bought the Weinstein library.");
    expect(body.trim().endsWith("Andrew Thomas, Kivaro AI")).toBe(true);
    expect(body).not.toMatch(/\nAndrew\nKivaro AI/);
  });

  it("falls back to a template subject when the Subject line is missing", () => {
    const draft = ["Just a hook sentence.", "", "Andrew", "Kivaro AI"].join("\n");
    const { subject, body } = parseOutreachEmailForSend("Acme Capital", draft);

    expect(subject).toBe("A quick idea for Acme Capital");
    expect(body.trim().endsWith("Andrew Thomas, Kivaro AI")).toBe(true);
  });

  it("is idempotent if the canonical signature is already present", () => {
    const draft = ["Subject: Hi", "", "Some pitch text.", "", "Andrew Thomas, Kivaro AI"].join("\n");
    const { body } = parseOutreachEmailForSend("Acme Capital", draft);

    const occurrences = body.split("Andrew Thomas, Kivaro AI").length - 1;
    expect(occurrences).toBe(1);
  });
});
