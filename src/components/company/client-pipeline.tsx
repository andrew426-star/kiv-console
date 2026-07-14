import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getProspects } from "@/lib/company/prospects";
import { getLeads, getClients } from "@/lib/company/queries";
import { promoteProspectToLead, promoteLeadToClient, deleteClientRecord } from "@/lib/company/actions";
import { ClientFormDialog } from "./client-form-dialog";
import { DeleteButton } from "./delete-button";

export async function ClientPipeline() {
  const [prospects, leads, clients] = await Promise.all([getProspects(), getLeads(), getClients()]);

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Client Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Prospects — live from the real ALE Sales Pitch Log spreadsheet */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prospects
            {prospects.connected && "prospects" in prospects
              ? ` (${prospects.prospects.length})`
              : ""}
          </p>

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
            prospects.prospects.map((p) => (
              <div
                key={p.companyName}
                className="glow-border-hover rounded-md border border-border/60 bg-kv-surface/60 p-3 text-sm"
              >
                <p className="font-medium">{p.companyName}</p>
                {p.docUrl ? (
                  <a
                    href={p.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View sales pitch ↗
                  </a>
                ) : null}
                <div className="mt-2">
                  <form action={promoteProspectToLead.bind(null, p.companyName, p.docUrl)}>
                    <Button type="submit" size="xs" variant="ghost">
                      Move to Leads →
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Leads — manually promoted as Andrew reaches out to a prospect */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Leads ({leads.length})
          </p>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads yet — move a prospect here once you've reached out.
            </p>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="glow-border-hover rounded-md border border-border/60 bg-kv-surface/60 p-3 text-sm"
              >
                <p className="font-medium">{lead.name}</p>
                {lead.source === "ale" && lead.ale_doc_url ? (
                  <a
                    href={lead.ale_doc_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View sales pitch ↗
                  </a>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <form action={promoteLeadToClient.bind(null, lead.id)}>
                    <Button type="submit" size="xs" variant="ghost">
                      Move to Client →
                    </Button>
                  </form>
                  <ClientFormDialog
                    triggerLabel="Edit"
                    triggerVariant="outline"
                    triggerSize="xs"
                    client={lead}
                  />
                  <DeleteButton action={deleteClientRecord.bind(null, lead.id)} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clients — already-confirmed engagements */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clients ({clients.length})
            </p>
            <ClientFormDialog triggerLabel="+ New" triggerSize="xs" defaultStatus="active" />
          </div>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No confirmed clients yet. Add one directly, or promote a lead above.
            </p>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className="glow-border-hover rounded-md border border-border/60 bg-kv-surface/60 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{client.name}</p>
                  <Badge variant="secondary">{client.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <ClientFormDialog
                    triggerLabel="Edit"
                    triggerVariant="outline"
                    triggerSize="xs"
                    client={client}
                  />
                  <DeleteButton action={deleteClientRecord.bind(null, client.id)} />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
