// Each of the 15 agents is a distinct Slack app with its own bot identity —
// no shared "one bot fakes 15 identities" trick needed. Credentials are
// named SLACK_BOT_TOKEN_<AGENT_ID> / SLACK_SIGNING_SECRET_<AGENT_ID>.

export type SlackCredentials = {
  botToken: string;
  signingSecret: string;
};

export function getSlackCredentials(agentId: string): SlackCredentials | null {
  const suffix = agentId.toUpperCase();
  const botToken = process.env[`SLACK_BOT_TOKEN_${suffix}`];
  const signingSecret = process.env[`SLACK_SIGNING_SECRET_${suffix}`];
  if (!botToken || !signingSecret) return null;
  return { botToken, signingSecret };
}
