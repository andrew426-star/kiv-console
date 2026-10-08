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
import { createTaskRecord, updateTaskRecord } from "@/lib/company/actions";
import type { VariantProps } from "class-variance-authority";
import { DelegationFields, type DelegationValues } from "./delegation-fields";

const STATUSES = ["todo", "in_progress", "blocked", "done"] as const;

export function TaskFormDialog({
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
  task,
  defaultProjectId,
  projects,
  profiles,
}: {
  triggerLabel: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
  task?: {
    id: string;
    title: string;
    status: string;
    project_id: string;
    assignee_id: string | null;
    due_date: string | null;
  } & Partial<DelegationValues>;
  defaultProjectId?: string;
  projects: { id: string; name: string }[];
  profiles: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (task) {
        await updateTaskRecord(task.id, formData);
      } else {
        await createTaskRecord(formData);
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size={triggerSize} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required defaultValue={task?.title} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project_id">Project</Label>
            <select
              id="project_id"
              name="project_id"
              required
              defaultValue={task?.project_id ?? defaultProjectId ?? ""}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                Select a project
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="assignee_id">Assignee</Label>
            <select
              id="assignee_id"
              name="assignee_id"
              defaultValue={task?.assignee_id ?? ""}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" name="due_date" type="date" defaultValue={task?.due_date ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={task?.status ?? "todo"}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <DelegationFields values={task && { delegate_agent_id: task.delegate_agent_id ?? null, delegate_actions: task.delegate_actions ?? null, delegation_notes: task.delegation_notes ?? null }} scope="task" />
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {task ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
