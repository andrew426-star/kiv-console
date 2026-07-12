"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { regenerateBrief } from "@/lib/research/actions";

export function RegenerateButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await regenerateBrief();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to regenerate brief");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "Generating…" : "Regenerate"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
