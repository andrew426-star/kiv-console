// Scheduled launch jobs for the Slack agents. Each one runs an agent with a
// fixed prompt and posts the result to the team channel under that agent's
// own bot. Triggered by .github/workflows/agent-jobs.yml through
// POST /api/agents/jobs/<id>. `at` is the source of truth, in US Central
// time; the workflow lists both UTC crons each job needs (one for daylight
// time, one for standard time) and the route runs only the one matching
// Central's current offset — see utcCrons() and centralUtcOffsetHours().
//
// Report jobs are report-and-draft only: respond.ts strips every tool that
// acts on the outside world (email sends, GitHub issues) and every
// launch-log write, since nobody asked for this particular message and
// nobody is there to confirm an action.
//
// Autonomous jobs (src/lib/agents/autonomy.ts) work the Company Dashboard
// tasks Andrew has delegated to that agent, with the acting tools his
// delegation approved. With nothing delegated they post nothing.

export type AgentJob = {
  id: string;
  agentId: string;
  title: string;
  // Central wall-clock time. days: 0 = Sunday … 6 = Saturday.
  at: { days: number[]; hour: number; minute: number };
  prompt: string;
  mode: "report" | "autonomous";
};

const WEEKDAYS = [1, 2, 3, 4, 5];

const AUTONOMOUS_PROMPT =
  "Work your delegated tasks now: soonest due and overdue first. For each, use your tools to make real progress, take an approved action where it moves the task forward, record it with update_my_task, then write your report.";

export const AGENT_JOBS: AgentJob[] = [
  {
    id: "pipeline-standup",
    agentId: "pipeline",
    title: "Outreach standup",
    at: { days: [1, 2, 3, 4, 5], hour: 9, minute: 0 }, // weekdays 9:00am
    mode: "report",
    prompt:
      "Morning outreach standup for Andrew. Check get_pipeline_status and get_launch_status. Report: how many companies are drafted but unsent, anything sent or queued since yesterday, the 5 best next sends in the target segments and why each fits, and any follow-up calls due. Finish with how many discovery conversations are logged against this phase's target. Do not send anything.",
  },
  {
    id: "atlas-segment-intel",
    agentId: "atlas",
    title: "Weekly segment intel",
    at: { days: [1], hour: 8, minute: 0 }, // Mondays 8:00am
    mode: "report",
    prompt:
      "Weekly intel brief on Kivaro's target segments (hedge funds, research and analytics teams, investor relations, quant funds, VC, PE). Use get_news_feed and web_search. Give the 3 developments from the past week that matter most for selling AI automation to these firms, each with its source link and one line on what it means for Kivaro's discovery conversations this week.",
  },
  {
    id: "atlas-publicity-radar",
    agentId: "atlas",
    title: "Publicity radar",
    at: { days: [4], hour: 8, minute: 0 }, // Thursdays 8:00am
    mode: "report",
    prompt:
      "Publicity radar: use web_search to find up to 5 openings in the next 45 days that fit a student founder launching AI automation for investment firms in January 2027: pitch competitions (Louisiana Tech and Louisiana first), fintech or fund-operations podcasts and newsletters taking guests or pitches, conferences, and press. For each give the name, the deadline or date, the link, and the one-line angle Andrew should pitch.",
  },
  {
    id: "pulse-content-plan",
    agentId: "pulse",
    title: "Weekly content plan",
    at: { days: [1], hour: 8, minute: 30 }, // Mondays 8:30am
    mode: "report",
    prompt:
      "Draft this week's content plan around the current launch phase (check get_launch_status), in Andrew's own founder voice: 3 posts for his personal LinkedIn and 4 for his personal X, written for fund partners, PMs, analysts and IR teams. Mark the one LinkedIn post the Kivaro AI company page should reshare. For each give the day, the platform, the hook line, and a full draft. These are drafts for Andrew to edit and post himself.",
  },
  {
    id: "pulse-build-in-public",
    agentId: "pulse",
    title: "Build-in-public draft",
    at: { days: [4], hour: 12, minute: 0 }, // Thursdays 12:00pm
    mode: "report",
    prompt:
      "Draft this week's build-in-public post for LinkedIn from what actually happened: check get_launch_status for logged conversations, pilots and content this week. One honest lesson or number, no hype, under 180 words, plus a shorter X version. If nothing was logged this week, say so and draft a post about what the discovery calls are designed to learn instead.",
  },
  {
    id: "chronicle-midweek-pace",
    agentId: "chronicle",
    title: "Midweek pace check",
    at: { days: [3], hour: 12, minute: 0 }, // Wednesdays 12:00pm
    mode: "report",
    prompt:
      "Midweek pace check. Use get_launch_status, get_tasks_due and get_calendar_events. Is the current phase on pace to hit its target by its end date? If not, how many a day does it now need? List overdue tasks and anything due before Sunday, and name the one thing to cut or move if the week is overloaded, given Andrew's classes.",
  },
  {
    id: "chronicle-weekly-review",
    agentId: "chronicle",
    title: "Sunday weekly review",
    at: { days: [0], hour: 18, minute: 0 }, // Sundays 6:00pm
    mode: "report",
    prompt:
      "Sunday weekly review for the launch. Use get_launch_status, get_tasks_due and get_calendar_events. Report: what was logged this week against the current phase target, whether the pace hits the phase end date, what's overdue or blocked, next week's calendar pressure points (exams, deadlines, meetings), and the three priorities for next week fitted around classes. Keep it to one Slack message.",
  },
  {
    id: "chronicle-autonomous",
    agentId: "chronicle",
    title: "Autonomous run",
    at: { days: WEEKDAYS, hour: 7, minute: 15 },
    mode: "autonomous",
    prompt: AUTONOMOUS_PROMPT,
  },
  {
    id: "atlas-autonomous",
    agentId: "atlas",
    title: "Autonomous run",
    at: { days: WEEKDAYS, hour: 7, minute: 30 },
    mode: "autonomous",
    prompt: AUTONOMOUS_PROMPT,
  },
  {
    id: "pulse-autonomous",
    agentId: "pulse",
    title: "Autonomous run",
    at: { days: WEEKDAYS, hour: 7, minute: 45 },
    mode: "autonomous",
    prompt: AUTONOMOUS_PROMPT,
  },
  // Twice a day: the shared limit is 5 sends an hour, so two runs are what
  // let Pipeline reach the 10-a-day autonomous cap.
  {
    id: "pipeline-autonomous-am",
    agentId: "pipeline",
    title: "Autonomous run (morning)",
    at: { days: WEEKDAYS, hour: 10, minute: 30 },
    mode: "autonomous",
    prompt: AUTONOMOUS_PROMPT,
  },
  {
    id: "pipeline-autonomous-pm",
    agentId: "pipeline",
    title: "Autonomous run (afternoon)",
    at: { days: WEEKDAYS, hour: 14, minute: 0 },
    mode: "autonomous",
    prompt: AUTONOMOUS_PROMPT,
  },
];

// US Central is UTC-5 in daylight time (CDT) and UTC-6 in standard time
// (CST). GitHub cron has no time zones, so each job is scheduled at both
// UTC times and the route keeps whichever matches the offset in effect.
export type CentralOffset = 5 | 6;

export function utcCron(job: AgentJob, offset: CentralOffset): string {
  const total = job.at.hour + offset;
  const hour = total % 24;
  // Past midnight UTC, the UTC day is the next one.
  const days = job.at.days.map((d) => (d + Math.floor(total / 24)) % 7).sort((a, b) => a - b);
  return `${job.at.minute} ${hour} * * ${days.join(",")}`;
}

export function utcCrons(job: AgentJob): { cdt: string; cst: string } {
  return { cdt: utcCron(job, 5), cst: utcCron(job, 6) };
}

export function centralUtcOffsetHours(now: Date = new Date()): CentralOffset {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "shortOffset",
  })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")?.value;
  return name === "GMT-6" ? 6 : 5;
}

export function findJob(jobId: string): AgentJob | undefined {
  return AGENT_JOBS.find((job) => job.id === jobId);
}
