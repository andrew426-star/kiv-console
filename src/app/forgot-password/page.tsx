import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestReset } from "./actions";

type Params = Promise<{ error?: string; sent?: string }>;

// searchParams is a dynamic API, isolated in its own Suspense boundary
// like the login page's, so the form itself still prerenders.
async function Notice({ searchParams }: { searchParams: Params }) {
  const { error, sent } = await searchParams;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (sent)
    return (
      <p className="text-sm text-muted-foreground">
        If that address has an account, a reset link is on its way. Open it in this same browser.
      </p>
    );
  return null;
}

export default function ForgotPasswordPage({ searchParams }: { searchParams: Params }) {
  return (
    <div className="grid-pattern flex flex-1 items-center justify-center p-4 sm:p-16">
      <Card className="glow-border w-full max-w-sm animate-fade-up bg-kv-surface/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-bold text-gradient-green">Reset password</CardTitle>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">K.I.V.</p>
        </CardHeader>
        <CardContent>
          <form action={requestReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <Suspense fallback={null}>
              <Notice searchParams={searchParams} />
            </Suspense>
            <Button type="submit" className="mt-2">
              Send reset link
            </Button>
            <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
              Back to sign in
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
