import { describe, expect, it } from "vitest";
import { rankContactTitle, UNRANKED_SENIORITY } from "../queries";

const rank = (title: string) => rankContactTitle(title).rank;

describe("rankContactTitle", () => {
  it("ranks the management ladder in order", () => {
    const ladder = [
      "Founder & Managing Partner",
      "Chief Executive Officer",
      "Chief Investment Officer",
      "Partner",
      "Managing Director",
      "Head of Operations",
      "Vice President, Investor Relations",
      "Operations Manager",
      "Research Analyst",
    ];

    const ranks = ladder.map(rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(ranks).size).toBe(ladder.length);
  });

  it("does not read 'Vice President' as 'President'", () => {
    expect(rank("Vice President")).toBeGreaterThan(rank("President"));
    expect(rank("Senior Vice President")).toBeGreaterThan(rank("President"));
  });

  it("does not read 'Associate Director' as 'Director'", () => {
    expect(rank("Associate Director")).toBeGreaterThan(rank("Director"));
  });

  it("ranks a blank or unrecognised title last", () => {
    expect(rank("")).toBe(UNRANKED_SENIORITY);
    expect(rank("Office Dog")).toBe(UNRANKED_SENIORITY);
    expect(rank("Analyst")).toBeLessThan(UNRANKED_SENIORITY);
  });

  it("beats a junior contact regardless of sheet order", () => {
    // The real selection is a sort in listContactsForCompany(); this is the
    // comparison that sort relies on.
    expect(rank("Chief Investment Officer")).toBeLessThan(rank("Executive Assistant"));
    expect(rank("Managing Partner")).toBeLessThan(rank("Investor Relations Associate"));
  });

  it("labels each rung", () => {
    expect(rankContactTitle("Co-Founder").label).toBe("Founder / Owner");
    expect(rankContactTitle("").label).toBe("No title on file");
  });
});
