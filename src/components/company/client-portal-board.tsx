import { getClientPortalBoard, type DeliverableStage } from "@/lib/company/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { advanceDeliverableStage } from "@/lib/company/actions";
import { Button } from "@/components/ui/button";

const STAGES: { key: DeliverableStage; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "delivered", label: "Delivered" },
];

export async function ClientPortalBoard() {
  const deliverables = await getClientPortalBoard();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Portal</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {STAGES.map((stage) => {
          const items = deliverables.filter((d) => d.stage === stage.key);
          return (
            <div key={stage.key} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {stage.label} ({items.length})
              </p>
              {items.map((item) => {
                // No generated Supabase schema types yet, so the client
                // infers embeds as arrays by default; this is actually a
                // to-one relationship (client_id -> clients.id) and
                // PostgREST returns a single object at runtime.
                const client = item.clients as unknown as { name: string } | null;
                return (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {client?.name ?? "No client"}
                      {item.due_date ? ` · ${new Date(item.due_date).toLocaleDateString()}` : ""}
                    </p>
                    {stage.key !== "delivered" ? (
                      <form action={advanceDeliverableStage.bind(null, item.id, stage.key)}>
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-6 px-2 text-xs"
                        >
                          Advance →
                        </Button>
                      </form>
                    ) : null}
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
