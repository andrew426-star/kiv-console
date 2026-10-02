// Who may sign in. Google sign-in proves someone holds *a* Google account,
// not that they belong in K.I.V., and Supabase creates an account for any
// Google user who completes the flow unless sign-ups are switched off. So
// the app checks for itself, against KIV_ALLOWED_EMAILS (comma-separated).
//
// Fails CLOSED: unset or empty means nobody gets in. A missing setting must
// never turn the console into one anyone with a Google account can open.
export function isAllowedEmail(
  email: string | null | undefined,
  allowed: string | undefined = process.env.KIV_ALLOWED_EMAILS,
): boolean {
  if (!email || !allowed) return false;
  const wanted = email.trim().toLowerCase();
  return allowed
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .some((entry) => entry !== "" && entry === wanted);
}
