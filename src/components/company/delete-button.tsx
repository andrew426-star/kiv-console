"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  confirmMessage = "Delete this? This can't be undone.",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="xs"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(action);
      }}
    >
      Delete
    </Button>
  );
}
