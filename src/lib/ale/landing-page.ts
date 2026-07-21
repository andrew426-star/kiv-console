import { randomBytes } from "node:crypto";

function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "") // strip diacritics after NFKD decomposition
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || "company";
}

// 48 bits of randomness (base64url, ~8 chars) — this is a public,
// unauthenticated page, so the slug needs to be unguessable (hedge fund
// names are well-known) even though there's no login. Same trust model as
// a Loom/Notion share link, not a security boundary in the auth sense.
export function buildLandingPageSlug(companyName: string): string {
  return `${slugifyCompanyName(companyName)}-${randomBytes(6).toString("base64url")}`;
}

const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export function buildLandingPageUrl(slug: string): string {
  return `${SITE_URL}/pitch/${slug}`;
}
