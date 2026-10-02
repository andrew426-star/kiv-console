"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/forgot-password?error=Enter your email.");

  // The public host the browser used (see lib/origin.ts for why not the
  // request URL), so the emailed link comes back to this deployment.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/auth/confirm?next=/reset-password`,
  });
  if (error) redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);

  // Same answer whether or not the address has an account.
  redirect("/forgot-password?sent=1");
}
