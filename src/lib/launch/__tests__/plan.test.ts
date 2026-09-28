import { describe, expect, it } from "vitest";
import {
  LAUNCH_DATE,
  PHASES,
  computeProgress,
  currentPhase,
  daysBetween,
  emptyCounts,
  todayInLaunchZone,
} from "../plan";

describe("launch plan", () => {
  it("phases run back to back and end on launch day", () => {
    for (let i = 1; i < PHASES.length; i++) {
      expect(daysBetween(PHASES[i - 1].end, PHASES[i].start)).toBe(1);
    }
    expect(PHASES.at(-1)?.start).toBe(LAUNCH_DATE);
  });

  it("counts calendar days across month and year boundaries", () => {
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-09-28", "2027-01-12")).toBe(106);
  });

  it("picks the phase containing today, inclusive of its end date", () => {
    expect(currentPhase("2026-09-01").id).toBe("discovery");
    expect(currentPhase("2026-10-31").id).toBe("discovery");
    expect(currentPhase("2026-11-01").id).toBe("pilots");
    expect(currentPhase("2027-01-11").id).toBe("commitments");
    expect(currentPhase(LAUNCH_DATE).id).toBe("launch");
    expect(currentPhase("2027-06-01").id).toBe("launch");
  });

  it("scores each phase's metric against its target and floors the countdown at zero", () => {
    const counts = { ...emptyCounts(), conversation: 12, pilot: 1 };
    const progress = computeProgress("2026-10-21", counts);
    expect(progress.phase.id).toBe("discovery");
    expect(progress.phase.daysLeft).toBe(10);
    expect(progress.scoreboard.map((r) => [r.metric, r.count, r.target])).toEqual([
      ["conversation", 12, 30],
      ["pilot", 1, 3],
      ["commitment", 0, 3],
    ]);
    expect(computeProgress("2027-02-01", counts).daysToLaunch).toBe(0);
  });

  it("reads today in Central time, not UTC", () => {
    // 03:00 UTC on Oct 1 is still the evening of Sep 30 in Ruston.
    expect(todayInLaunchZone(new Date("2026-10-01T03:00:00Z"))).toBe("2026-09-30");
  });
});
