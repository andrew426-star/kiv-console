import { describe, expect, it } from "vitest";
import type { Lead } from "../queries";
import { countByStage, isLeadStage, leadStage } from "../stage";

function lead(overrides: Partial<Lead>): Lead {
  return {
    placeId: "p",
    name: "Fund",
    types: "",
    rating: "",
    address: "",
    state: "",
    website: null,
    contactCount: 0,
    hunterSearched: false,
    researched: false,
    pitchCreated: false,
    pitched: false,
    pitchSentAt: null,
    ...overrides,
  };
}

describe("leadStage", () => {
  it("names the next step each lead needs", () => {
    expect(leadStage(lead({}))).toBe("no_website");
    expect(leadStage(lead({ website: "https://a.com" }))).toBe("enrich");
    expect(leadStage(lead({ website: "https://a.com", contactCount: 2 }))).toBe("research");
    // Searched on Hunter, nobody found: on to research, not stuck at enrich.
    expect(leadStage(lead({ website: "https://a.com", hunterSearched: true }))).toBe("research");
    expect(leadStage(lead({ contactCount: 2, researched: true }))).toBe("pitch");
    expect(leadStage(lead({ researched: true, pitchCreated: true }))).toBe("drafted");
    expect(leadStage(lead({ pitchCreated: true, pitched: true }))).toBe("sent");
  });

  it("counts every lead exactly once", () => {
    const counts = countByStage([lead({}), lead({ website: "x" }), lead({ pitched: true })]);
    expect(counts).toEqual({ no_website: 1, enrich: 1, research: 0, pitch: 0, drafted: 0, sent: 1 });
  });

  it("only accepts known stages from the URL", () => {
    expect(isLeadStage("drafted")).toBe(true);
    expect(isLeadStage("bogus")).toBe(false);
    expect(isLeadStage(undefined)).toBe(false);
  });
});
