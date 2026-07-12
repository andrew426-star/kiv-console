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
import { createProjectRecord, updateProjectRecord } from "@/lib/company/actions";
import type { VariantProps } from "class-variance-authority";

const STATUSES = ["planning", "active", "blocked", "completed", "archived"] as const;

export function ProjectFormDialog({
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
  project,
  clients,
  profiles,
}: {
  triggerLabel: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
  project?: { id: string; name: string; status: string; client_id: string | null; owner_id: string | null };
  clients: { id: string; name: string }[];
  profiles: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (project) {
        await updateProjectRecord(project.id, formData);
      } else {
        await createProjectRecord(formData);
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
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={project?.name} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="client_id">Client</Label>
            <select
              id="client_id"
              name="client_id"
              defaultValue={project?.client_id ?? ""}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="owner_id">Owner</Label>
            <select
              id="owner_id"
              name="owner_id"
              defaultValue={project?.owner_id ?? ""}
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
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={project?.status ?? "planning"}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {project ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
