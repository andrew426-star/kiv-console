import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn } from "./actions";

// searchParams is a dynamic API — isolated in its own Suspense boundary so
// the rest of the login form still prerenders statically.
async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return <p className="text-sm text-destructive">{error}</p>;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="grid-pattern flex flex-1 items-center justify-center p-16">
      <Card className="glow-border w-full max-w-sm animate-fade-up bg-kv-surface/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-bold text-gradient-green">
            K.I.V.
          </CardTitle>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Kivaro Intelligence Vectoring
          </p>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Suspense fallback={null}>
              <LoginError searchParams={searchParams} />
            </Suspense>
            <Button type="submit" className="mt-2">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
