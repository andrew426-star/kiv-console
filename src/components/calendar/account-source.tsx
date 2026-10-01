import { Badge } from "@/components/ui/badge";
import type { GoogleAccountSource } from "@/lib/calendar/google";

// Kivaro events keep the console's green; Louisiana Tech events and mail
// are Tech blue, so the two accounts read apart at a glance.
export const SOURCE_BORDER: Record<GoogleAccountSource, string> = {
  workspace: "border-l-primary",
  school: "border-l-blue-500",
};

export const SOURCE_DOT: Record<GoogleAccountSource, string> = {
  workspace: "bg-primary",
  school: "bg-blue-500",
};

export function SourceDot({ source }: { source: GoogleAccountSource }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 shrink-0 rounded-full ${SOURCE_DOT[source]}`}
    />
  );
}

export function SchoolBadge() {
  return (
    <Badge variant="outline" className="shrink-0 border-blue-500/60 text-blue-400">
      LA Tech
    </Badge>
  );
}

// "● Kivaro  ● LA Tech" key, shown once the school account is connected.
export function SourceLegend() {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5">
        <SourceDot source="workspace" /> Kivaro
      </span>
      <span className="inline-flex items-center gap-1.5">
        <SourceDot source="school" /> LA Tech
      </span>
    </span>
  );
}
