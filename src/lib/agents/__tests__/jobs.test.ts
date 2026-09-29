import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_JOBS, centralUtcOffsetHours, findJob, utcCron, utcCrons } from "../jobs";
import { findAgent } from "../roster";
import { getToolsForAgent } from "../tool-definitions";

const workflow = readFileSync(join(process.cwd(), ".github/workflows/agent-jobs.yml"), "utf8");

function declaredTools(agentId: string, scheduled: boolean): string[] {
  return getToolsForAgent(agentId, { scheduled }).flatMap((t) =>
    "functionDeclarations" in t ? t.functionDeclarations.map((d) => d.name) : [],
  );
}

describe("scheduled agent jobs", () => {
  it("have unique ids and Central times, and belong to roster agents", () => {
    expect(new Set(AGENT_JOBS.map((j) => j.id)).size).toBe(AGENT_JOBS.length);
    const all = AGENT_JOBS.flatMap((j) => [utcCrons(j).cdt, utcCrons(j).cst]);
    expect(new Set(all).size).toBe(all.length);
    for (const job of AGENT_JOBS) expect(findAgent(job.agentId), job.id).not.toBeNull();
  });

  it("are wired into the workflow at both their daylight- and standard-time UTC crons", () => {
    for (const job of AGENT_JOBS) {
      for (const cron of Object.values(utcCrons(job))) {
        expect(workflow, `${job.id} ${cron}`).toContain(`- cron: "${cron}"`);
        expect(workflow, `${job.id} ${cron}`).toContain(`"${cron}") job=${job.id} ;;`);
      }
      expect(workflow, job.id).toContain(`- ${job.id}`);
    }
  });

  it("convert Central wall-clock times to UTC, including across midnight", () => {
    const standup = findJob("pipeline-standup")!;
    expect(utcCron(standup, 5)).toBe("0 14 * * 1,2,3,4,5"); // 9am CDT
    expect(utcCron(standup, 6)).toBe("0 15 * * 1,2,3,4,5"); // 9am CST
    const review = findJob("chronicle-weekly-review")!;
    expect(utcCron(review, 5)).toBe("0 23 * * 0"); // Sun 6pm CDT
    expect(utcCron(review, 6)).toBe("0 0 * * 1"); // Sun 6pm CST is Monday in UTC
  });

  it("knows which offset Central is on", () => {
    expect(centralUtcOffsetHours(new Date("2026-09-29T17:00:00Z"))).toBe(5); // CDT
    expect(centralUtcOffsetHours(new Date("2026-12-01T17:00:00Z"))).toBe(6); // CST
    // Clocks fall back at 2am CDT on 2026-11-01 (07:00 UTC).
    expect(centralUtcOffsetHours(new Date("2026-11-01T06:30:00Z"))).toBe(5);
    expect(centralUtcOffsetHours(new Date("2026-11-01T07:30:00Z"))).toBe(6);
  });

  it("never get tools that send, create or log", () => {
    const acting = [
      "send_outreach_email",
      "send_bulk_outreach_emails",
      "create_github_issue",
      "log_launch_activity",
      "generate_showcase",
    ];
    for (const agentId of ["atlas", "pipeline", "pulse", "chronicle"]) {
      const tools = declaredTools(agentId, true);
      for (const name of acting) expect(tools, `${agentId} ${name}`).not.toContain(name);
    }
    // Interactive replies keep them.
    expect(declaredTools("pipeline", false)).toContain("send_outreach_email");
    expect(declaredTools("chronicle", true)).toContain("get_tasks_due");
  });
});
