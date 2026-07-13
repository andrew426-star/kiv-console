"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { runDiscovery } from "@/lib/ale/actions";

export function DiscoveryForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await runDiscovery(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Discovery run failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <form action={handleSubmit} className="flex items-center gap-2">
        <Input
          name="query"
          placeholder='e.g. "hedge funds in Dallas, TX"'
          className="h-8 w-72"
          required
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Searching…" : "Run Discovery"}
        </Button>
      </form>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
