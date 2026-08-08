"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runSignalScanNow } from "@/lib/portfolio/trading-actions";

export function RunScanButton() {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const outcome = await runSignalScanNow();
        setResult(
          outcome.halted
            ? `Halted: ${outcome.haltReason}`
            : `${outcome.signalsGenerated} signals, ${outcome.signalsApproved} approved, ${outcome.signalsRejected} rejected`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scan failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "Scanning…" : "Run scan now"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      {result ? <span className="text-xs text-muted-foreground">{result}</span> : null}
    </div>
  );
}
