import {
  getClientPortalBoard,
  getFormOptions,
  type DeliverableStage,
} from "@/lib/company/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { advanceDeliverableStage, deleteDeliverableRecord } from "@/lib/company/actions";
import { Button } from "@/components/ui/button";
import { DeliverableFormDialog } from "./deliverable-form-dialog";
import { DeleteButton } from "./delete-button";
import { formatDateOnly } from "@/lib/time";

const STAGES: { key: DeliverableStage; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "delivered", label: "Delivered" },
];

export async function ClientPortalBoard() {
  const [deliverables, options] = await Promise.all([getClientPortalBoard(), getFormOptions()]);

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Client Portal</CardTitle>
        <DeliverableFormDialog
          triggerLabel="+ New deliverable"
          clients={options.clients}
          projects={options.projects}
        />
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {STAGES.map((stage) => {
          const items = deliverables.filter((d) => d.stage === stage.key);
          return (
            <div key={stage.key} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stage.label} ({items.length})
              </p>
              {items.map((item) => {
                // No generated Supabase schema types yet, so the client
                // infers embeds as arrays by default; this is actually a
                // to-one relationship (client_id -> clients.id) and
                // PostgREST returns a single object at runtime.
                const client = item.clients as unknown as { name: string } | null;
                return (
                  <div
                    key={item.id}
                    className="glow-border-hover rounded-md border border-border/60 bg-kv-surface/60 p-3 text-sm transition-colors"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {client?.name ?? "No client"}
                      {item.due_date ? ` · ${formatDateOnly(item.due_date)}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {stage.key !== "delivered" ? (
                        <form action={advanceDeliverableStage.bind(null, item.id, stage.key)}>
                          <Button type="submit" size="xs" variant="ghost">
                            Advance →
                          </Button>
                        </form>
                      ) : null}
                      <DeliverableFormDialog
                        triggerLabel="Edit"
                        triggerVariant="outline"
                        triggerSize="xs"
                        deliverable={item}
                        clients={options.clients}
                        projects={options.projects}
                      />
                      <DeleteButton action={deleteDeliverableRecord.bind(null, item.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
