"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setKillSwitch } from "@/lib/portfolio/trading-actions";

export function KillSwitchToggle({ enabled }: { enabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await setKillSwitch(!enabled, enabled ? null : "Halted manually from the K.I.V. dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update the kill switch");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={enabled ? "default" : "destructive"}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Updating…" : enabled ? "Resume trading" : "Halt trading"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
