import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInboxPreview } from "@/lib/gmail/queries";
import { SchoolBadge, SourceDot } from "@/components/calendar/account-source";

function senderName(from: string): string {
  // "Jane Doe <jane@example.com>" -> "Jane Doe"; falls back to the raw
  // value for a bare address with no display name.
  return from.replace(/\s*<.*>\s*/, "").trim() || from;
}

export async function InboxSnapshot() {
  const state = await getInboxPreview();

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Inbox</CardTitle>
        <a
          href="https://mail.google.com/mail/u/0/#inbox"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Open Gmail →
        </a>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!state.connected ? (
          <p className="text-sm text-muted-foreground">Not connected.</p>
        ) : "fetchError" in state ? (
          <p className="text-sm text-destructive">Last fetch failed: {state.fetchError}</p>
        ) : state.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inbox is empty.</p>
        ) : (
          state.messages.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <SourceDot source={m.source ?? "workspace"} />
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate ${m.unread ? "font-semibold" : "font-medium text-muted-foreground"}`}
                >
                  {senderName(m.from)}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.subject}</p>
              </div>
              {m.source === "school" ? <SchoolBadge /> : null}
              {m.unread ? (
                <Badge variant="outline" className="shrink-0 border-kv-mint/40 text-kv-mint">
                  New
                </Badge>
              ) : null}
            </div>
          ))
        )}
        {state.connected && "fetchError" in state.school ? (
          <p className="text-xs text-destructive">
            LA Tech inbox failed: {state.school.fetchError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
