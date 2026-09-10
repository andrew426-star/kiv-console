import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";

// Bypasses RLS entirely via the service_role key. Never expose this client
// or its results to the browser — server-only code (route handlers, server
// actions) that needs access to data no authenticated-role policy grants,
// e.g. calendar_connections' refresh tokens.
//
// The await connection() is what keeps every caller out of the static
// prerender, and it is why this is async. The service-role env vars only
// exist on the deployed service, so during `next build` the non-null
// assertions below throw "supabaseUrl is required" — and a throw at
// prerender time is a hard build error, not a dynamic-rendering bailout.
// That broke CI on every run from 2026-07-13 (when ALE first pulled this
// into a page render) until this change; Render kept building because its
// service has the vars set. Suspense alone was not enough: /autonomy
// already wrapped its card in one, but the fetch still ran at prerender.
// Per Next's connection() docs, calling it here excludes every component
// that reaches this client from prerendering, along with its output.
export async function createAdminClient() {
  await connection();

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
