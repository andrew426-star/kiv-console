import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCalendarState } from "@/lib/calendar/queries";

async function CalendarContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, state] = await Promise.all([searchParams, getCalendarState()]);

  if (!state.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error ? <p className="text-sm text-destructive">Connection failed: {error}</p> : null}
          <p className="text-sm text-muted-foreground">
            Not connected. Connect Google Calendar to see upcoming events here — this will also
            feed Research and Overview once those land.
          </p>
          <a href="/api/auth/google/connect" className={buttonVariants({ className: "w-fit" })}>
            Connect Google Calendar
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar — {state.calendarEmail}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {state.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events in the next 14 days.</p>
        ) : (
          state.events.map((event) => (
            <a
              key={event.id}
              href={event.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
            >
              <span className="font-medium">{event.summary}</span>
              <span className="text-xs text-muted-foreground">
                {event.start
                  ? event.allDay
                    ? new Date(event.start).toLocaleDateString()
                    : new Date(event.start).toLocaleString()
                  : ""}
              </span>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CalendarSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Calendar</h1>
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
