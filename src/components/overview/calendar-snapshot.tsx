import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCalendarState } from "@/lib/calendar/queries";
import { organizeCalendar } from "@/lib/calendar/organize";
import type { GoogleCalendarEvent } from "@/lib/calendar/google";
import { SourceDot } from "@/components/calendar/account-source";

// Highlights first (one-offs, exams, deadlines, sales calls), since the
// weekly class routine would otherwise fill all five rows. Times are the
// organizer's Central-time labels, not the server's UTC.
function SnapshotList({ events }: { events: GoogleCalendarEvent[] }) {
  const { highlights, agenda } = organizeCalendar(events);
  const rows = (highlights.length > 0 ? highlights : agenda.flatMap((d) => d.events)).slice(0, 5);
  return rows.map((event) => (
    <div key={event.id} className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <SourceDot source={event.source} />
        <span className="truncate font-medium">{event.summary}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {event.dayLabel.split(" · ")[0]} · {event.timeLabel.split(" – ")[0]}
      </span>
    </div>
  ));
}

export async function CalendarSnapshot() {
  const state = await getCalendarState();

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Calendar</CardTitle>
        <Link href="/calendar" className="text-xs text-muted-foreground hover:text-foreground">
          Full calendar →
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!state.connected ? (
          <p className="text-sm text-muted-foreground">Not connected.</p>
        ) : "fetchError" in state ? (
          <p className="text-sm text-destructive">Last fetch failed: {state.fetchError}</p>
        ) : state.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events in the next 14 days.</p>
        ) : (
          <SnapshotList events={state.events} />
        )}
      </CardContent>
    </Card>
  );
}
