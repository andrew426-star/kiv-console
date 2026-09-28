import { Badge } from "@/components/ui/badge";
import { EVENT_KIND_LABELS, type EventKind } from "@/lib/calendar/organize";

const KIND_CLASSES: Record<EventKind, string> = {
  exam: "border-red-400/60 text-red-400",
  deadline: "border-amber-400/60 text-amber-400",
  sales: "border-emerald-400/60 text-emerald-400",
  class: "border-border text-muted-foreground",
  meeting: "border-sky-400/60 text-sky-400",
  event: "border-violet-400/60 text-violet-400",
};

export function EventKindBadge({ kind }: { kind: EventKind }) {
  return (
    <Badge variant="outline" className={KIND_CLASSES[kind]}>
      {EVENT_KIND_LABELS[kind]}
    </Badge>
  );
}
