"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logLaunchActivity } from "@/lib/launch/actions";
import { ACTIVITY_KINDS, ACTIVITY_KIND_LABELS, SEGMENTS, SEGMENT_LABELS } from "@/lib/launch/plan";

const SELECT_CLASS = "rounded-md border border-input bg-background px-2 py-1.5 text-sm";

export function LogActivityForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await logLaunchActivity(formData);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not log that activity.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kind">What happened</Label>
        <select id="kind" name="kind" defaultValue="conversation" className={SELECT_CLASS}>
          {ACTIVITY_KINDS.map((k) => (
            <option key={k} value={k}>
              {ACTIVITY_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="segment">Segment</Label>
        <select id="segment" name="segment" defaultValue="" className={SELECT_CLASS}>
          <option value="">None</option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {SEGMENT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company">Firm or outlet</Label>
        <Input id="company" name="company" placeholder="e.g. a fund, podcast, or newsletter" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact">Person</Label>
        <Input id="contact" name="contact" placeholder="Name, title" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Their pain points in their own words, next step, price discussed"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occurred_on">Date</Label>
        <Input id="occurred_on" name="occurred_on" type="date" defaultValue={today} />
      </div>
      <div className="flex items-end justify-end gap-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Logging…" : "Log it"}
        </Button>
      </div>
    </form>
  );
}
