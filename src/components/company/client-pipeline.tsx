import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getProspects } from "@/lib/company/prospects";
import { getLeads, getClients } from "@/lib/company/queries";
import { promoteProspectToLead, promoteLeadToClient, deleteClientRecord } from "@/lib/company/actions";
import { ClientFormDialog } from "./client-form-dialog";
import { DeleteButton } from "./delete-button";

const ROW = "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60";
const HEADING = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function PitchLink({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-primary hover:underline">
      Pitch ↗
    </a>
  );
}

// One line per company: 64 ALE prospects used to be 64 tall cards.
// Prospects get the wide, scrollable column; leads and clients (the ones
// that matter most, and the short lists) stack beside it.
export async function ClientPipeline() {
  const [prospects, leads, clients] = await Promise.all([getProspects(), getLeads(), getClients()]);
  const prospectCount = prospects.connected && "prospects" in prospects ? prospects.prospects.length : null;

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="font-heading">Client Pipeline</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">Prospects {prospectCount ?? "—"}</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline">Leads {leads.length}</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline">Clients {clients.length}</Badge>
          <ClientFormDialog triggerLabel="+ New client" triggerSize="xs" defaultStatus="active" />
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Prospects — live from the real ALE Sales Pitch Log spreadsheet */}
        <div className="flex flex-col gap-2 lg:col-span-2">
          <p className={HEADING}>Prospects · from ALE</p>
          {!prospects.connected ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Not connected. Connect Google to pull confirmed sales pitches as prospects.
              </p>
              <a
                href="/api/auth/google/connect"
                className={buttonVariants({ className: "w-fit", size: "sm" })}
              >
                Connect Google
              </a>
            </div>
          ) : "fetchError" in prospects ? (
            <p className="text-sm text-destructive">
              Connected, but the last fetch failed: {prospects.fetchError}
            </p>
          ) : prospects.prospects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prospects ready — they show up here once ALE finishes a sales pitch.
            </p>
          ) : (
            <div className="grid max-h-96 grid-cols-1 gap-x-4 overflow-y-auto rounded-md border border-border/60 p-1 md:grid-cols-2">
              {prospects.prospects.map((p) => (
                <div key={p.companyName} className={ROW}>
                  <span className="min-w-0 truncate">{p.companyName}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <PitchLink href={p.docUrl || null} />
                    <form action={promoteProspectToLead.bind(null, p.companyName, p.docUrl)}>
                      <Button type="submit" size="xs" variant="ghost" title="Move to Leads once you've reached out">
                        → Lead
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Leads — manually promoted as Andrew reaches out to a prospect */}
          <div className="flex flex-col gap-1">
            <p className={HEADING}>Leads · reached out</p>
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None yet. Use → Lead on a prospect once you&apos;ve reached out.
              </p>
            ) : (
              leads.map((lead) => (
                <div key={lead.id} className={ROW}>
                  <span className="min-w-0 truncate font-medium">{lead.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <PitchLink href={lead.source === "ale" ? lead.ale_doc_url : null} />
                    <form action={promoteLeadToClient.bind(null, lead.id)}>
                      <Button type="submit" size="xs" variant="ghost">
                        → Client
                      </Button>
                    </form>
                    <ClientFormDialog triggerLabel="Edit" triggerVariant="outline" triggerSize="xs" client={lead} />
                    <DeleteButton action={deleteClientRecord.bind(null, lead.id)} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Clients — already-confirmed engagements */}
          <div className="flex flex-col gap-1">
            <p className={HEADING}>Clients · confirmed</p>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None yet. Add one with + New client, or promote a lead.
              </p>
            ) : (
              clients.map((client) => (
                <div key={client.id} className={ROW}>
                  <span className="min-w-0 truncate font-medium">{client.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="secondary">{client.status}</Badge>
                    <ClientFormDialog triggerLabel="Edit" triggerVariant="outline" triggerSize="xs" client={client} />
                    <DeleteButton action={deleteClientRecord.bind(null, client.id)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
