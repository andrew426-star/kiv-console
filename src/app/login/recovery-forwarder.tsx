"use client";

import { useEffect } from "react";

// A password reset sent from the Supabase dashboard comes back to the
// Site URL with the session in the #fragment. Unsigned, the proxy bounces
// that to /login, and browsers keep the fragment across the redirect, so
// it surfaces here: hand it on to the page that sets the new password.
export function RecoveryForwarder() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") === "recovery" && hash.get("access_token")) {
      window.location.replace(`/reset-password${window.location.hash}`);
    }
  }, []);
  return null;
}
