"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";

// Without this, any uncaught throw inside a Suspense-wrapped async Server
// Component on a dashboard page (e.g. a revoked Google token bubbling up
// from a data-fetching function) takes down the entire page render, not
// just the section that failed — this is what makes that recoverable.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-gradient-green">Something went wrong</CardTitle>
          <CardDescription>
            This section hit an unexpected error{error.digest ? ` (ref: ${error.digest})` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
