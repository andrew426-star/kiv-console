"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runEnrichment } from "@/lib/ale/actions";

export function EnrichButton({ placeId }: { placeId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setNote(null);
    startTransition(async () => {
      try {
        const outcome = await runEnrichment(placeId);
        if (!outcome.ok) setError(outcome.error);
        // Found contacts move the lead on and the row re-renders; nobody
        // found also moves it on, so say why it has no contacts.
        else if (outcome.contactsFound === 0) setNote(`Hunter has no contacts at ${outcome.domain}`);
      } catch {
        setError("Enrichment failed. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="xs" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "Enriching…" : "Enrich with Hunter"}
      </Button>
      {error ? <span className="max-w-64 text-right text-xs text-destructive">{error}</span> : null}
      {note ? <span className="max-w-64 text-right text-xs text-muted-foreground">{note}</span> : null}
    </div>
  );
}
