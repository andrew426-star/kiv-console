const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = "andrew426-star";
const REPO_NAME = "kiv-console";

export type CreateIssueResult = { connected: false } | { connected: true; issueUrl: string };

// Forge's real, concrete action: a genuine GitHub issue, not auto-generated
// code — see the reasoning in the commit this shipped with. Needs a
// fine-grained PAT scoped to just this repo's Issues (read/write).
export async function createGithubIssue(title: string, body: string): Promise<CreateIssueResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { connected: false };

  const res = await fetch(`${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) throw new Error(`GitHub issue creation failed: ${await res.text()}`);

  const data = (await res.json()) as { html_url: string };
  return { connected: true, issueUrl: data.html_url };
}
