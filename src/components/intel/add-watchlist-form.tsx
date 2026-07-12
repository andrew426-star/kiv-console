"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addWatchlistItem } from "@/lib/intel/actions";

export function AddWatchlistForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addWatchlistItem(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add symbol");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={handleSubmit} className="flex items-center gap-2">
        <Input name="symbol" placeholder="Symbol (e.g. TSLA)" className="h-8 w-36" required />
        <Input name="label" placeholder="Label (optional)" className="h-8 w-28" />
        <Button type="submit" size="sm" disabled={isPending}>
          + Add
        </Button>
      </form>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
