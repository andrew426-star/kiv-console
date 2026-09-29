// Scheduled launch jobs for the Slack agents. Each one runs an agent with a
// fixed prompt and posts the result to the team channel under that agent's
// own bot. Triggered by .github/workflows/agent-jobs.yml through
// POST /api/agents/jobs/<id>; `cron` here is the source of truth that
// workflow mirrors (GitHub cron is UTC — the comments give US Central).
//
// Scheduled runs are report-and-draft only: respond.ts strips every tool
// that acts on the outside world (email sends, GitHub issues) and every
// launch-log write when `scheduled` is set, since nobody asked for this
// particular message and nobody is there to confirm an action.

export type AgentJob = {
  id: string;
  agentId: string;
  title: string;
  cron: string;
  prompt: string;
};

export const AGENT_JOBS: AgentJob[] = [
  {
    id: "pipeline-standup",
    agentId: "pipeline",
    title: "Outreach standup",
    cron: "0 14 * * 1-5", // weekdays 9:00am CT
    prompt:
      "Morning outreach standup for Andrew. Check get_pipeline_status and get_launch_status. Report: how many companies are drafted but unsent, anything sent or queued since yesterday, the 5 best next sends in the target segments and why each fits, and any follow-up calls due. Finish with how many discovery conversations are logged against this phase's target. Do not send anything.",
  },
  {
    id: "atlas-segment-intel",
    agentId: "atlas",
    title: "Weekly segment intel",
    cron: "0 13 * * 1", // Mondays 8:00am CT
    prompt:
      "Weekly intel brief on Kivaro's target segments (hedge funds, research and analytics teams, investor relations, quant funds, VC, PE). Use get_news_feed and web_search. Give the 3 developments from the past week that matter most for selling AI automation to these firms, each with its source link and one line on what it means for Kivaro's discovery conversations this week.",
  },
  {
    id: "atlas-publicity-radar",
    agentId: "atlas",
    title: "Publicity radar",
    cron: "0 13 * * 4", // Thursdays 8:00am CT
    prompt:
      "Publicity radar: use web_search to find up to 5 openings in the next 45 days that fit a student founder launching AI automation for investment firms in January 2027: pitch competitions (Louisiana Tech and Louisiana first), fintech or fund-operations podcasts and newsletters taking guests or pitches, conferences, and press. For each give the name, the deadline or date, the link, and the one-line angle Andrew should pitch.",
  },
  {
    id: "pulse-content-plan",
    agentId: "pulse",
    title: "Weekly content plan",
    cron: "30 13 * * 1", // Mondays 8:30am CT
    prompt:
      "Draft this week's content plan around the current launch phase (check get_launch_status): 3 LinkedIn posts, 3 X posts and 2 Instagram posts for Kivaro AI and Andrew's founder voice, written for fund partners, PMs, analysts and IR teams. For each give the day, the platform, the hook line, and a full draft. These are drafts for Andrew to edit and post himself.",
  },
  {
    id: "pulse-build-in-public",
    agentId: "pulse",
    title: "Build-in-public draft",
    cron: "0 17 * * 4", // Thursdays 12:00pm CT
    prompt:
      "Draft this week's build-in-public post for LinkedIn from what actually happened: check get_launch_status for logged conversations, pilots and content this week. One honest lesson or number, no hype, under 180 words, plus a shorter X version. If nothing was logged this week, say so and draft a post about what the discovery calls are designed to learn instead.",
  },
  {
    id: "chronicle-midweek-pace",
    agentId: "chronicle",
    title: "Midweek pace check",
    cron: "0 17 * * 3", // Wednesdays 12:00pm CT
    prompt:
      "Midweek pace check. Use get_launch_status, get_tasks_due and get_calendar_events. Is the current phase on pace to hit its target by its end date? If not, how many a day does it now need? List overdue tasks and anything due before Sunday, and name the one thing to cut or move if the week is overloaded, given Andrew's classes.",
  },
  {
    id: "chronicle-weekly-review",
    agentId: "chronicle",
    title: "Sunday weekly review",
    cron: "0 23 * * 0", // Sundays 6:00pm CT
    prompt:
      "Sunday weekly review for the launch. Use get_launch_status, get_tasks_due and get_calendar_events. Report: what was logged this week against the current phase target, whether the pace hits the phase end date, what's overdue or blocked, next week's calendar pressure points (exams, deadlines, meetings), and the three priorities for next week fitted around classes. Keep it to one Slack message.",
  },
];

export function findJob(jobId: string): AgentJob | undefined {
  return AGENT_JOBS.find((job) => job.id === jobId);
}
