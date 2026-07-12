"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDeliverableRecord, updateDeliverableRecord } from "@/lib/company/actions";
import type { VariantProps } from "class-variance-authority";

const STAGES = ["backlog", "in_progress", "review", "delivered"] as const;

export function DeliverableFormDialog({
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
  deliverable,
  clients,
  projects,
}: {
  triggerLabel: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
  deliverable?: {
    id: string;
    title: string;
    stage: string;
    client_id: string;
    project_id: string | null;
    due_date: string | null;
  };
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (deliverable) {
        await updateDeliverableRecord(deliverable.id, formData);
      } else {
        await createDeliverableRecord(formData);
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size={triggerSize} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deliverable ? "Edit deliverable" : "New deliverable"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required defaultValue={deliverable?.title} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="client_id">Client</Label>
            <select
              id="client_id"
              name="client_id"
              required
              defaultValue={deliverable?.client_id ?? ""}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                Select a client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project_id">Project</Label>
            <select
              id="project_id"
              name="project_id"
              defaultValue={deliverable?.project_id ?? ""}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="due_date">Due date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={deliverable?.due_date ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="stage">Stage</Label>
            <select
              id="stage"
              name="stage"
              defaultValue={deliverable?.stage ?? "backlog"}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {deliverable ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
