"use client";

import { useEffect } from "react";

// Root-level backstop for routes outside (dashboard) (e.g. /login) — kept
// deliberately minimal, no shared UI components, so this itself has
// nothing left to fail on.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root route error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-heading text-xl font-bold text-gradient-green">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.digest ? `Reference: ${error.digest}` : "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
