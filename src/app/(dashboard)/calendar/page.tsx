import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCalendarState } from "@/lib/calendar/queries";
import { organizeCalendar } from "@/lib/calendar/organize";
import { EventKindBadge } from "@/components/calendar/event-kind-badge";
import {
  SOURCE_BORDER,
  SchoolBadge,
  SourceDot,
  SourceLegend,
} from "@/components/calendar/account-source";
import type { SchoolConnectionStatus } from "@/lib/google/school-access-token";

// Connect / connected / failing line for the read-only Louisiana Tech
// account. Shown on every connected state, so a broken school connection
// is visible even when the Kivaro calendar is fine.
function SchoolAccountLine({
  school,
  error,
}: {
  school: SchoolConnectionStatus;
  error?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {!school.connected ? (
        <a
          href="/api/auth/google/connect?account=school"
          className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
        >
          Connect Louisiana Tech account
        </a>
      ) : "fetchError" in school ? (
        <span className="text-destructive">
          LA Tech{school.email ? ` (${school.email})` : ""} connected, but the last fetch failed:{" "}
          {school.fetchError}.{" "}
          <a href="/api/auth/google/connect?account=school" className="underline">
            Reconnect
          </a>
        </span>
      ) : (
        <SourceLegend />
      )}
      {error ? <span className="text-destructive">Connection failed: {error}</span> : null}
    </div>
  );
}

async function CalendarContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, state] = await Promise.all([searchParams, getCalendarState()]);

  if (!state.connected) {
    return (
      <Card className="glow-border-hover">
        <CardHeader>
          <CardTitle className="font-heading">Calendar</CardTitle>
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

  if ("fetchError" in state) {
    return (
      <Card className="glow-border-hover">
        <CardHeader>
          <CardTitle className="font-heading">Calendar — {state.calendarEmail}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SchoolAccountLine school={state.school} error={error} />
          <p className="text-sm text-destructive">
            Connected, but the last fetch failed: {state.fetchError}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state.events.length === 0) {
    return (
      <Card className="glow-border-hover">
        <CardHeader>
          <CardTitle className="font-heading">Calendar — {state.calendarEmail}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SchoolAccountLine school={state.school} error={error} />
          <p className="text-sm text-muted-foreground">No events in the next 14 days.</p>
        </CardContent>
      </Card>
    );
  }

  const { highlights, routines, agenda } = organizeCalendar(state.events);

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {state.calendarEmail}
          {state.school.connected && state.school.email ? ` + ${state.school.email}` : ""} · next
          14 days · times in Central
        </p>
        <SchoolAccountLine school={state.school} error={error} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="glow-border-hover lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading">Highlights</CardTitle>
            <p className="text-xs text-muted-foreground">
              One-off events, exams, deadlines, sales calls, and classes that moved. Routine
              blocks are left out.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {highlights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing out of the ordinary. Just the weekly routine.
              </p>
            ) : (
              highlights.map((event) => (
                <a
                  key={event.id}
                  href={event.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-start justify-between gap-3 rounded-md border border-l-4 ${SOURCE_BORDER[event.source]} p-3 text-sm hover:bg-muted`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{event.summary}</span>
                      <EventKindBadge kind={event.kind} />
                      {event.source === "school" ? <SchoolBadge /> : null}
                    </div>
                    {event.note ? (
                      <p className="mt-1 text-xs text-amber-400">{event.note}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>{event.dayLabel}</p>
                    <p>{event.timeLabel}</p>
                  </div>
                </a>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glow-border-hover">
          <CardHeader>
            <CardTitle className="font-heading">Weekly rhythm</CardTitle>
            <p className="text-xs text-muted-foreground">Repeating blocks, folded into one row each.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {routines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repeating events found.</p>
            ) : (
              routines.map((block) => (
                <div key={`${block.source}|${block.summary}`} className="flex flex-col gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceDot source={block.source} />
                    <span className="font-medium">{block.summary}</span>
                    <EventKindBadge kind={block.kind} />
                  </div>
                  {block.slots.map((slot) => (
                    <p key={slot.days + slot.timeLabel} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{slot.days}</span> ·{" "}
                      {slot.timeLabel}
                    </p>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glow-border-hover">
        <CardHeader>
          <CardTitle className="font-heading">Agenda</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {agenda.map((day) => (
            <div key={day.date} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {day.label}
              </h3>
              {day.events.map((event) => (
                <a
                  key={event.id}
                  href={event.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className={
                    event.highlight
                      ? `flex items-center gap-3 rounded-md border border-l-4 ${SOURCE_BORDER[event.source]} px-3 py-2 text-sm hover:bg-muted`
                      : "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                  }
                >
                  <SourceDot source={event.source} />
                  <span className="w-36 shrink-0 text-xs tabular-nums">{event.timeLabel}</span>
                  <span className={event.highlight ? "font-medium" : ""}>{event.summary}</span>
                  {event.highlight ? <EventKindBadge kind={event.kind} /> : null}
                  {event.note ? <span className="text-xs text-amber-400">{event.note}</span> : null}
                </a>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
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
      <h1 className="font-heading text-2xl font-bold text-gradient-green">Calendar</h1>
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
