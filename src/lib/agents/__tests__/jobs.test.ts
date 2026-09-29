import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_JOBS } from "../jobs";
import { findAgent } from "../roster";
import { getToolsForAgent } from "../tool-definitions";

const workflow = readFileSync(join(process.cwd(), ".github/workflows/agent-jobs.yml"), "utf8");

function declaredTools(agentId: string, scheduled: boolean): string[] {
  return getToolsForAgent(agentId, { scheduled }).flatMap((t) =>
    "functionDeclarations" in t ? t.functionDeclarations.map((d) => d.name) : [],
  );
}

describe("scheduled agent jobs", () => {
  it("have unique ids and schedules, and belong to roster agents", () => {
    expect(new Set(AGENT_JOBS.map((j) => j.id)).size).toBe(AGENT_JOBS.length);
    expect(new Set(AGENT_JOBS.map((j) => j.cron)).size).toBe(AGENT_JOBS.length);
    for (const job of AGENT_JOBS) expect(findAgent(job.agentId), job.id).not.toBeNull();
  });

  it("are all wired into the GitHub workflow with matching schedules", () => {
    for (const job of AGENT_JOBS) {
      expect(workflow, job.id).toContain(`- cron: "${job.cron}"`);
      expect(workflow, job.id).toContain(`"${job.cron}") job=${job.id} ;;`);
      expect(workflow, job.id).toContain(`- ${job.id}`);
    }
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
