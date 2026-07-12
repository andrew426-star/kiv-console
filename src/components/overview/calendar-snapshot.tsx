import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCalendarState } from "@/lib/calendar/queries";

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
          state.events.slice(0, 5).map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{event.summary}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {event.start
                  ? event.allDay
                    ? new Date(event.start).toLocaleDateString()
                    : new Date(event.start).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                  : ""}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
