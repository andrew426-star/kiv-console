import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Bypasses RLS entirely via the service_role key. Never expose this client
// or its results to the browser — server-only code (route handlers, server
// actions) that needs access to data no authenticated-role policy grants,
// e.g. calendar_connections' refresh tokens.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
