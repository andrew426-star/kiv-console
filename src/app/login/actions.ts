"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Off to Google, by way of Supabase, and back to /auth/callback. The PKCE
// verifier is set as a cookie here, so the round trip has to finish in the
// browser that started it.
export async function signInWithGoogle() {
  // The public host the browser used (see lib/origin.ts for why not the
  // request URL), so Google sends the user back to this deployment.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${proto}://${host}/auth/callback`,
      // Shows the account chooser every time rather than silently reusing
      // whichever Google account the browser is signed in to.
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in is unavailable.")}`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
