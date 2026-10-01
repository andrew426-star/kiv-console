import type { GoogleAccountSource, GoogleCalendarEvent } from "./google";
import { TIME_ZONE } from "@/lib/time";

// Andrew's calendar lives in Ruston. The server runs in UTC on Render, so
// every time shown in K.I.V. has to be formatted in this zone explicitly —
// a bare toLocaleString() there prints UTC, five hours off.
export const CALENDAR_TIME_ZONE = TIME_ZONE;

export type EventKind = "exam" | "deadline" | "sales" | "class" | "meeting" | "event";

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  exam: "Exam",
  deadline: "Deadline",
  sales: "Sales call",
  class: "Class",
  meeting: "Meeting",
  event: "Event",
};

// Kinds worth calling out even when they're part of a routine.
const IMPORTANT_KINDS = new Set<EventKind>(["exam", "deadline", "sales"]);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Mon-first, the way a class schedule reads.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function classifyEvent(summary: string): EventKind {
  if (/\b(exam|midterm|final|quiz|test)s?\b/i.test(summary)) return "exam";
  if (/\b(due|deadline|submit|submission|application)\b/i.test(summary)) return "deadline";
  if (/^follow-up call\b/i.test(summary) || /\b(demo|pitch|discovery call|sales call)\b/i.test(summary)) {
    return "sales";
  }
  // Course codes like MATH-2403, CSC 1303, FYE-101.
  if (/^[A-Z]{2,5}[- ]?\d{3,4}\b/.test(summary)) return "class";
  if (/\b(meeting|interview|office hours|1:1|call)\b/i.test(summary)) return "meeting";
  return "event";
}

type LocalTime = { date: string; weekday: number; minutes: number };

function localTime(iso: string, allDay: boolean): LocalTime {
  if (allDay) {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return { date: iso.slice(0, 10), weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), minutes: 0 };
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CALENDAR_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatRange(start: number, end: number | null): string {
  return end === null || end === start ? formatClock(start) : `${formatClock(start)} – ${formatClock(end)}`;
}

export type OrganizedEvent = {
  id: string;
  summary: string;
  htmlLink: string;
  kind: EventKind;
  source: GoogleAccountSource;
  date: string;
  dayLabel: string;
  timeLabel: string;
  startMinutes: number;
  // Part of a repeating block (a class, a weekly meeting).
  routine: boolean;
  // Worth Andrew's attention: one-off, important kind, or a routine block
  // that isn't at its usual time.
  highlight: boolean;
  // Set when a routine instance is at an unusual time, e.g. "Usually 12:30 PM".
  note: string | null;
};

export type RoutineBlock = {
  summary: string;
  kind: EventKind;
  source: GoogleAccountSource;
  // One row per distinct time slot: MWF 12:30 and a Tuesday lab at 2:00
  // under the same course code show as two slots.
  slots: { days: string; timeLabel: string }[];
  occurrences: number;
  next: { date: string; timeLabel: string } | null;
};

export type AgendaDay = { date: string; label: string; events: OrganizedEvent[] };

export type OrganizedCalendar = {
  highlights: OrganizedEvent[];
  routines: RoutineBlock[];
  agenda: AgendaDay[];
};

function dayLabel(date: string, today: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const diff = (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000;
  const pretty = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  if (diff === 0) return `Today · ${pretty}`;
  if (diff === 1) return `Tomorrow · ${pretty}`;
  return pretty;
}

// Sort key for an event start. An all-day date ("2026-10-02") parses as UTC
// midnight, which is the evening before in Central; pin it to 05:00Z
// (Central midnight in CDT, an hour before it in CST) so it still sorts
// ahead of that day's timed events.
function startSortKey(e: GoogleCalendarEvent): number {
  if (!e.start) return Number.POSITIVE_INFINITY;
  return e.allDay ? Date.parse(`${e.start.slice(0, 10)}T05:00:00Z`) : Date.parse(e.start);
}

// Combines the Workspace and school calendars into one start-ordered list.
// School event ids get a prefix, since ids are only unique per calendar
// and React keys and organizeCalendar's lookups need them unique overall.
// The same event on both calendars (a class copied or shared into the
// Kivaro calendar, a school invite to both addresses) shows once, as
// school, matched on title and start.
export function mergeAccountEvents(
  workspace: GoogleCalendarEvent[],
  school: GoogleCalendarEvent[],
): GoogleCalendarEvent[] {
  const key = (e: GoogleCalendarEvent) => `${e.summary.trim().toLowerCase()}|${startSortKey(e)}`;
  const schoolEvents = school.map((e) => ({ ...e, id: `school:${e.id}`, source: "school" as const }));
  const schoolKeys = new Set(schoolEvents.map(key));
  return [
    ...workspace.filter((e) => !schoolKeys.has(key(e))),
    ...schoolEvents,
  ].sort((a, b) => startSortKey(a) - startSortKey(b));
}

export function todayInCalendarZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CALENDAR_TIME_ZONE }).format(now);
}

export function organizeCalendar(
  events: GoogleCalendarEvent[],
  today: string = todayInCalendarZone(),
): OrganizedCalendar {
  const base = events
    .filter((e) => e.start)
    .map((e) => {
      const start = localTime(e.start!, e.allDay);
      const end = e.end && !e.allDay ? localTime(e.end, false) : null;
      // An end on a later day (overnight event) just shows the start.
      const endMinutes = end && end.date === start.date ? end.minutes : null;
      return {
        event: e,
        kind: classifyEvent(e.summary),
        start,
        endMinutes,
        timeLabel: e.allDay ? "All day" : formatRange(start.minutes, endMinutes),
        // Per account, so a same-named block on each calendar stays two
        // differently colored routines rather than one mixed one.
        groupKey: `${e.source ?? "workspace"}|${e.summary.trim().toLowerCase()}`,
      };
    });

  // Group by title rather than recurringEventId alone: a class is often
  // entered as several series (one per weekday) under the same name.
  const groups = new Map<string, typeof base>();
  for (const item of base) {
    const list = groups.get(item.groupKey) ?? [];
    list.push(item);
    groups.set(item.groupKey, list);
  }

  const isRoutine = (list: typeof base) =>
    list.some((i) => i.event.recurringEventId) || list.length >= 3;

  const organized = new Map<string, OrganizedEvent>();
  const routines: RoutineBlock[] = [];

  for (const list of groups.values()) {
    const routine = isRoutine(list);
    const minuteCounts = new Map<number, number>();
    for (const i of list) minuteCounts.set(i.start.minutes, (minuteCounts.get(i.start.minutes) ?? 0) + 1);
    const usualMinutes = [...minuteCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

    for (const i of list) {
      // A one-time time in a block of 3+ is a moved or extra session.
      const offSchedule =
        routine && !i.event.allDay && list.length >= 3 && minuteCounts.get(i.start.minutes) === 1;
      organized.set(i.event.id, {
        id: i.event.id,
        summary: i.event.summary,
        htmlLink: i.event.htmlLink,
        kind: i.kind,
        source: i.event.source ?? "workspace",
        date: i.start.date,
        dayLabel: dayLabel(i.start.date, today),
        timeLabel: i.timeLabel,
        startMinutes: i.start.minutes,
        routine,
        highlight: !routine || offSchedule || IMPORTANT_KINDS.has(i.kind),
        note: offSchedule ? `Usually ${formatClock(usualMinutes)}` : null,
      });
    }

    if (!routine) continue;

    const slots = new Map<string, { weekdays: Set<number>; timeLabel: string; minutes: number }>();
    for (const i of list) {
      if (organized.get(i.event.id)?.note) continue; // off-schedule sessions aren't the pattern
      const key = `${i.start.minutes}-${i.endMinutes}-${i.event.allDay}`;
      const slot = slots.get(key) ?? { weekdays: new Set<number>(), timeLabel: i.timeLabel, minutes: i.start.minutes };
      slot.weekdays.add(i.start.weekday);
      slots.set(key, slot);
    }
    const first = list[0];
    routines.push({
      summary: first.event.summary,
      kind: first.kind,
      source: first.event.source ?? "workspace",
      slots: [...slots.values()]
        .sort((a, b) => a.minutes - b.minutes)
        .map((s) => ({
          days: WEEKDAY_ORDER.filter((d) => s.weekdays.has(d)).map((d) => WEEKDAYS[d]).join(" "),
          timeLabel: s.timeLabel,
        })),
      occurrences: list.length,
      next: { date: first.start.date, timeLabel: first.timeLabel },
    });
  }

  // Classes first, then by title — a stable weekly reference, not a feed.
  const kindRank = (k: EventKind) => (k === "class" ? 0 : 1);
  routines.sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.summary.localeCompare(b.summary));

  // `events` arrives sorted by start time, and Map keeps insertion order
  // per group, so re-sort the flattened list by the original order.
  const ordered = events.filter((e) => organized.has(e.id)).map((e) => organized.get(e.id)!);

  const agenda: AgendaDay[] = [];
  for (const e of ordered) {
    const last = agenda.at(-1);
    if (last && last.date === e.date) last.events.push(e);
    else agenda.push({ date: e.date, label: e.dayLabel, events: [e] });
  }

  return {
    highlights: ordered.filter((e) => e.highlight),
    routines,
    agenda,
  };
}
