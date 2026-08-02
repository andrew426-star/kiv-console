import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { getLeads } from "@/lib/ale/queries";
import { EnrichButton } from "./enrich-button";
import { ResearchButton } from "./research-button";
import { PitchButton } from "./pitch-button";

export async function LeadsTable() {
  const result = await getLeads();

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Leads</CardTitle>
      </CardHeader>
      <CardContent>
        {!result.connected ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Not connected. Connect Google to let ALE read/write the Geolocation Lead Engine
              spreadsheet.
            </p>
            <a
              href="/api/auth/google/connect"
              className={buttonVariants({ className: "w-fit", size: "sm" })}
            >
              Connect Google
            </a>
          </div>
        ) : "fetchError" in result ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">
              Connected, but the last fetch failed: {result.fetchError}
            </p>
            <p className="text-xs text-muted-foreground">
              If this mentions insufficient scope or invalid credentials, the connection needs to
              be re-authorized for Sheets/Docs/Drive access.
            </p>
            <a
              href="/api/auth/google/connect"
              className={buttonVariants({ variant: "outline", className: "w-fit", size: "sm" })}
            >
              Reconnect Google
            </a>
          </div>
        ) : result.leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leads yet — run a discovery search above, or wait for tomorrow&apos;s 8am automatic
            run.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Research</TableHead>
                <TableHead>Sales Pitch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.leads.map((lead) => (
                <TableRow key={lead.placeId}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.state || lead.address}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs">{lead.rating || "—"}</TableCell>
                  <TableCell>
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {lead.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.contactCount > 0 ? (
                      <Badge variant="outline" className="border-kv-mint/40 text-kv-mint">
                        {lead.contactCount} found
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">None yet</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.website && lead.contactCount === 0 ? (
                      <EnrichButton placeId={lead.placeId} />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {lead.researched ? (
                      <Badge variant="outline" className="border-kv-mint/40 text-kv-mint">
                        Researched
                      </Badge>
                    ) : lead.contactCount > 0 ? (
                      <ResearchButton placeId={lead.placeId} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Enrich first</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.pitched ? (
                      <Badge variant="outline" className="border-kv-mint/40 text-kv-mint">
                        Pitched
                      </Badge>
                    ) : lead.researched ? (
                      <PitchButton placeId={lead.placeId} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Research first</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
