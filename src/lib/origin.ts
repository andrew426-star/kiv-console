import type { NextRequest } from "next/server";

// request.url / request.nextUrl.origin reflect the platform's internal
// listen address on some hosts (Railway included — it showed up as
// https://localhost:8080), not the public host the browser actually hit.
// Reverse proxies set x-forwarded-* to the real thing, so prefer those.
export function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}
