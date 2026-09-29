import { NextResponse, type NextRequest } from "next/server";
import { findJob } from "@/lib/agents/jobs";
import { generateAgentReply } from "@/lib/agents/respond";
import { logAgentActivity } from "@/lib/agents/log";
import { getSlackCredentials } from "@/lib/slack/credentials";
import { postSlackMessage } from "@/lib/slack/web-api";

// Runs one scheduled agent job (src/lib/agents/jobs.ts) and posts the
// result to the team channel under that agent's own bot. Triggered by
// .github/workflows/agent-jobs.yml with the same shared cron key as ALE's
// batch (ALE_BATCH_API_KEY), so no new secret is needed. Synchronous on
// purpose: the workflow waits for it and fails loudly if a job fails, and
// the run history on GitHub doubles as a record of what went out.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const apiKey = process.env.ALE_BATCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ALE_BATCH_API_KEY is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  const job = findJob(jobId);
  if (!job) return NextResponse.json({ error: `Unknown job: ${jobId}` }, { status: 404 });

  // A dedicated launch channel if one is set, otherwise the shared channel
  // Jarvis and every agent bot are already in.
  const channel = process.env.SLACK_LAUNCH_CHANNEL ?? process.env.SLACK_JARVIS_CHANNEL;
  if (!channel) {
    return NextResponse.json(
      { error: "Neither SLACK_LAUNCH_CHANNEL nor SLACK_JARVIS_CHANNEL is configured" },
      { status: 503 },
    );
  }
  const credentials = getSlackCredentials(job.agentId);
  if (!credentials) {
    return NextResponse.json({ error: `No Slack credentials for ${job.agentId}` }, { status: 503 });
  }

  try {
    const report = await generateAgentReply(job.agentId, job.prompt, [], { scheduled: true });
    await postSlackMessage(credentials.botToken, { channel, text: `*${job.title}*\n${report}` });
    await logAgentActivity({ agentId: job.agentId, action: `Scheduled: ${job.title}`, status: "success" });
    return NextResponse.json({ ok: true, job: job.id, agent: job.agentId, chars: report.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logAgentActivity({
      agentId: job.agentId,
      action: `Scheduled job failed: ${job.title}`,
      detail: message,
      status: "error",
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
