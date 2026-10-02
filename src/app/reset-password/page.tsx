"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// Set a new password, signed in by the recovery link. The link arrives
// one of two ways: through /auth/confirm, which has already set the
// session cookie, or (a reset sent from the Supabase dashboard) with the
// session in the URL's #fragment, which only the browser can read, so it
// is picked up here.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "no-session">("checking");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const signedIn =
      accessToken && refreshToken
        ? supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
            // Tokens out of the address bar, history and screenshots.
            window.history.replaceState(null, "", window.location.pathname);
            return !error;
          })
        : supabase.auth.getUser().then(({ data }) => Boolean(data.user));
    signedIn.then((ok) => setReady(ok ? "ok" : "no-session"));
  }, []);

  async function save(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setSaving(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="grid-pattern flex flex-1 items-center justify-center p-4 sm:p-16">
      <Card className="glow-border w-full max-w-sm animate-fade-up bg-kv-surface/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-bold text-gradient-green">New password</CardTitle>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">K.I.V.</p>
        </CardHeader>
        <CardContent>
          {ready === "checking" && <p className="text-sm text-muted-foreground">Checking your link…</p>}
          {ready === "no-session" && (
            <p className="text-sm text-destructive">
              This link has expired or was already used.{" "}
              <a href="/forgot-password" className="underline">
                Request a new one
              </a>
              .
            </p>
          )}
          {ready === "ok" && (
            <form action={save} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm">Confirm</Label>
                <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="mt-2" disabled={saving}>
                {saving ? "Saving…" : "Save and sign in"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
