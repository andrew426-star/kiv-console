"use client";

import { useTransition } from "react";
import { updateRole } from "@/lib/company/actions";

const ROLES = ["owner", "admin", "contractor", "viewer"] as const;

export function RoleSelect({ profileId, role }: { profileId: string; role: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="rounded-md border bg-background px-2 py-1 text-sm disabled:opacity-50"
      defaultValue={role}
      disabled={isPending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(() => {
          updateRole(profileId, value);
        });
      }}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
