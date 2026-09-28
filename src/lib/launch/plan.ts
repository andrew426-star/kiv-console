// Kivaro AI's launch plan: the one place the launch date, phases, targets
// and target segments live. The /launch page, the Slack agents'
// get_launch_status tool and the home-page snapshot all read from here.
// Jarvis keeps a copy in app/tools/launch_tracker.py (jarvis repo), so
// change both together.

export const LAUNCH_DATE = "2027-01-12";

// Dates are Andrew's local calendar days in Ruston, not UTC instants.
export const LAUNCH_TIME_ZONE = "America/Chicago";

export const ACTIVITY_KINDS = ["conversation", "pilot", "commitment", "publicity", "content"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  conversation: "Conversation",
  pilot: "Pilot",
  commitment: "Commitment",
  publicity: "Publicity",
  content: "Content",
};

export const SEGMENTS = [
  "hedge_fund",
  "research_analytics",
  "investor_relations",
  "quant",
  "venture_capital",
  "private_equity",
] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  hedge_fund: "Hedge fund partners & PMs",
  research_analytics: "Research & analytics teams",
  investor_relations: "Investor relations & reporting",
  quant: "Quant & hybrid discretionary funds",
  venture_capital: "Venture capital managers",
  private_equity: "Private equity firms",
};

export type Phase = {
  id: "discovery" | "pilots" | "commitments" | "launch";
  label: string;
  goal: string;
  start: string;
  end: string;
  // The count this phase is judged on. Launch has none; it is the date.
  metric: ActivityKind | null;
  target: number;
};

export const PHASES: Phase[] = [
  {
    id: "discovery",
    label: "Discovery",
    goal: "30 real conversations with people in the target segments. Capture their exact words.",
    start: "2026-09-28",
    end: "2026-10-31",
    metric: "conversation",
    target: 30,
  },
  {
    id: "pilots",
    label: "Pilots",
    goal: "Turn the best conversations into 3 free or cheap pilots, and get a case study out of each.",
    start: "2026-11-01",
    end: "2026-11-30",
    metric: "pilot",
    target: 3,
  },
  {
    id: "commitments",
    label: "Commitments",
    goal: "3 paid commitments or letters of intent, a waitlist, and launch assets ready.",
    start: "2026-12-01",
    end: "2027-01-11",
    metric: "commitment",
    target: 3,
  },
  {
    id: "launch",
    label: "Launch",
    goal: "Public launch: Product Hunt, build-in-public thread, pilot case studies, local press.",
    start: LAUNCH_DATE,
    end: LAUNCH_DATE,
    metric: null,
    target: 0,
  },
];

export function todayInLaunchZone(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: LAUNCH_TIME_ZONE }).format(now);
}

function dayNumber(isoDate: string): number {
  return Date.UTC(
    Number(isoDate.slice(0, 4)),
    Number(isoDate.slice(5, 7)) - 1,
    Number(isoDate.slice(8, 10)),
  ) / 86_400_000;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return dayNumber(toIso) - dayNumber(fromIso);
}

// Before the plan starts this is Discovery; on or after launch day it is Launch.
export function currentPhase(today: string): Phase {
  for (const phase of PHASES) {
    if (today <= phase.end) return phase;
  }
  return PHASES[PHASES.length - 1];
}

export type ActivityCounts = Record<ActivityKind, number>;

export function emptyCounts(): ActivityCounts {
  return { conversation: 0, pilot: 0, commitment: 0, publicity: 0, content: 0 };
}

export type LaunchProgress = {
  today: string;
  launchDate: string;
  daysToLaunch: number;
  phase: Phase & { daysLeft: number };
  // Each phase's metric against its target, counted over the whole plan:
  // a conversation logged in November still counts toward the 30.
  scoreboard: { phase: Phase["id"]; label: string; metric: ActivityKind; count: number; target: number }[];
  counts: ActivityCounts;
};

export function computeProgress(today: string, counts: ActivityCounts): LaunchProgress {
  const phase = currentPhase(today);
  return {
    today,
    launchDate: LAUNCH_DATE,
    daysToLaunch: Math.max(0, daysBetween(today, LAUNCH_DATE)),
    phase: { ...phase, daysLeft: Math.max(0, daysBetween(today, phase.end)) },
    scoreboard: PHASES.filter((p) => p.metric !== null).map((p) => ({
      phase: p.id,
      label: p.label,
      metric: p.metric as ActivityKind,
      count: counts[p.metric as ActivityKind],
      target: p.target,
    })),
    counts,
  };
}

export function isActivityKind(value: unknown): value is ActivityKind {
  return typeof value === "string" && (ACTIVITY_KINDS as readonly string[]).includes(value);
}

export function isSegment(value: unknown): value is Segment {
  return typeof value === "string" && (SEGMENTS as readonly string[]).includes(value);
}
