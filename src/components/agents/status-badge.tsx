import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityStatus } from "@/lib/agents/activity";

export function StatusBadge({ status }: { status: ActivityStatus }) {
  if (status === "error") {
    return <Badge variant="destructive">{status}</Badge>;
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "success" && "border-kv-mint/40 text-kv-mint",
        status === "warning" && "border-amber-400/40 text-amber-400",
      )}
    >
      {status}
    </Badge>
  );
}
