import { describe, expect, it } from "vitest";
import type { GoogleCalendarEvent } from "../google";
import {
  classifyEvent,
  mergeAccountEvents,
  organizeCalendar,
  todayInCalendarZone,
} from "../organize";

let seq = 0;
function ev(
  summary: string,
  startUtc: string,
  endUtc: string | null,
  recurringEventId: string | null = null,
): GoogleCalendarEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    summary,
    start: startUtc,
    end: endUtc,
    allDay: false,
    htmlLink: `https://calendar.google.com/e${seq}`,
    recurringEventId,
  };
}

// CDT is UTC-5 through early November: 17:30Z is 12:30 PM in Ruston.
const events: GoogleCalendarEvent[] = [
  ev("MATH-2403", "2026-09-28T17:30:00Z", "2026-09-28T18:45:00Z", "math"),
  ev("Bulldog Entrepreneurs Meeting", "2026-09-28T23:00:00Z", "2026-09-29T00:00:00Z"),
  ev("CSC-1303", "2026-09-29T19:30:00Z", "2026-09-29T20:45:00Z", "csc"),
  ev("MATH-2403", "2026-09-30T17:30:00Z", "2026-09-30T18:45:00Z", "math"),
  ev("CSC-1303", "2026-10-01T19:30:00Z", "2026-10-01T20:45:00Z", "csc"),
  ev("MATH-2403", "2026-10-02T19:00:00Z", "2026-10-02T20:15:00Z", "math"), // moved
  ev("MATH-2403", "2026-10-05T17:30:00Z", "2026-10-05T18:45:00Z", "math"),
  ev("Follow-up call — Acme Capital", "2026-10-06T15:00:00Z", "2026-10-06T15:30:00Z"),
  ev("CSC-1303 Midterm Exam", "2026-10-08T19:30:00Z", "2026-10-08T21:00:00Z"),
];

describe("organizeCalendar", () => {
  const result = organizeCalendar(events, "2026-09-28");

  it("folds repeating classes into weekly blocks in Central time", () => {
    const math = result.routines.find((r) => r.summary === "MATH-2403");
    expect(math?.kind).toBe("class");
    expect(math?.occurrences).toBe(4);
    expect(math?.slots).toEqual([{ days: "Mon Wed", timeLabel: "12:30 PM – 1:45 PM" }]);
    const csc = result.routines.find((r) => r.summary === "CSC-1303");
    expect(csc?.slots).toEqual([{ days: "Tue Thu", timeLabel: "2:30 PM – 3:45 PM" }]);
  });

  it("highlights one-offs, important kinds and off-schedule sessions, not routine classes", () => {
    const highlighted = result.highlights.map((e) => [e.summary, e.kind, e.note]);
    expect(highlighted).toEqual([
      ["Bulldog Entrepreneurs Meeting", "meeting", null],
      ["MATH-2403", "class", "Usually 12:30 PM"],
      ["Follow-up call — Acme Capital", "sales", null],
      ["CSC-1303 Midterm Exam", "exam", null],
    ]);
  });

  it("builds a day-by-day agenda with relative labels", () => {
    expect(result.agenda[0].label).toBe("Today · Monday, Sep 28");
    expect(result.agenda[0].events.map((e) => e.timeLabel)).toEqual([
      "12:30 PM – 1:45 PM",
      "6:00 PM – 7:00 PM",
    ]);
    expect(result.agenda[1].label).toBe("Tomorrow · Tuesday, Sep 29");
    expect(result.agenda.flatMap((d) => d.events)).toHaveLength(events.length);
  });
});

describe("classifyEvent", () => {
  it.each([
    ["MATH-2403", "class"],
    ["FYE-101", "class"],
    ["CSC 1303", "class"],
    ["ENGL-1023 Final", "exam"],
    ["Scholarship application due", "deadline"],
    ["Follow-up call — Acme Capital", "sales"],
    ["Bulldog Entrepreneurs Meeting", "meeting"],
    ["Football game", "event"],
  ])("%s -> %s", (summary, kind) => {
    expect(classifyEvent(summary)).toBe(kind);
  });

  it("reads today in Central time", () => {
    expect(todayInCalendarZone(new Date("2026-10-01T03:00:00Z"))).toBe("2026-09-30");
  });
});

describe("mergeAccountEvents", () => {
  const workspace = [
    ev("Bulldog Entrepreneurs Meeting", "2026-09-28T23:00:00Z", "2026-09-29T00:00:00Z"),
    ev("MATH-2403", "2026-09-28T17:30:00Z", "2026-09-28T18:45:00Z", "math"),
  ];
  const school = [
    { ...ev("math-2403", "2026-09-28T17:30:00Z", "2026-09-28T18:45:00Z", "m"), id: "s1" },
    { ...ev("Advising", "2026-09-28T15:00:00Z", "2026-09-28T15:30:00Z"), id: "s2" },
    { ...ev("Fall break", "2026-09-28", null), id: "s3", allDay: true },
  ];
  const merged = mergeAccountEvents(workspace, school);

  it("orders both accounts by start, with all-day events first in the day", () => {
    expect(merged.map((e) => e.summary)).toEqual([
      "Fall break",
      "Advising",
      "math-2403",
      "Bulldog Entrepreneurs Meeting",
    ]);
  });

  it("keeps an event on both calendars once, as school", () => {
    expect(merged.filter((e) => e.summary.toLowerCase() === "math-2403")).toHaveLength(1);
    expect(merged.find((e) => e.summary === "math-2403")?.source).toBe("school");
  });

  it("tags and prefixes school ids so they can't collide with workspace ids", () => {
    expect(merged.filter((e) => e.source === "school").map((e) => e.id)).toEqual([
      "school:s3",
      "school:s2",
      "school:s1",
    ]);
    expect(merged.find((e) => e.summary === "Bulldog Entrepreneurs Meeting")?.source).toBeUndefined();
  });

  it("carries the source through organizeCalendar", () => {
    const { agenda } = organizeCalendar(merged, "2026-09-28");
    expect(agenda[0].events.map((e) => e.source)).toEqual([
      "school",
      "school",
      "school",
      "workspace",
    ]);
  });
});
