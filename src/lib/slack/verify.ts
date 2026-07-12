import { createHmac, timingSafeEqual } from "crypto";

const MAX_REQUEST_AGE_SECONDS = 5 * 60;

// https://api.slack.com/authentication/verifying-requests-from-slack
export function verifySlackSignature({
  signingSecret,
  timestampHeader,
  signatureHeader,
  rawBody,
}: {
  signingSecret: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  rawBody: string;
}): boolean {
  if (!timestampHeader || !signatureHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > MAX_REQUEST_AGE_SECONDS) return false;

  const baseString = `v0:${timestampHeader}:${rawBody}`;
  const expectedSignature = `v0=${createHmac("sha256", signingSecret).update(baseString).digest("hex")}`;

  const expected = Buffer.from(expectedSignature, "utf8");
  const actual = Buffer.from(signatureHeader, "utf8");
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}
