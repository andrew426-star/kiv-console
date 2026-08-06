import { getLeads as getAleLeads } from "@/lib/ale/queries";
import { getClients } from "@/lib/company/queries";

// "pitch_created" = a draft exists in the ALE Sales Pitch Log but hasn't
// been sent yet. "pitched" is reserved for a confirmed send — never use it
// to describe a company that only has a draft on file.
type ProspectStage = "discovered" | "researched" | "pitch_created" | "pitched";

export type PipelineStatusForAgent = {
  prospects:
    | { connected: false }
    | { connected: true; fetchError: string }
    | {
        connected: true;
        total: number;
        researched: number;
        pitchCreated: number;
        pitched: number;
        companies: Array<{ name: string; stage: ProspectStage }>;
      };
  clients: {
    total: number;
    byStatus: Record<"active" | "paused" | "completed", number>;
    companies: Array<{ name: string; status: string }>;
  };
};

const MAX_COMPANIES_LISTED = 50;

// Combines two separate pipelines every agent should be aware of: ALE's
// automated Sheets-based prospect pipeline (discover -> research -> pitch,
// src/lib/ale/queries.ts) and the manually-tracked Client Pipeline
// (src/lib/company/queries.ts's `clients` table, status active/paused/
// completed — "lead" status there is a separate manual-entry path, not
// mixed in here, same distinction that file's own getClients() already
// draws). Errors propagate to the shared tool-dispatch try/catch
// (src/lib/ai/gemini.ts's generateWithToolLoop) rather than being caught
// here, matching the other files in this directory (e.g. company-stats.ts).
export async function getPipelineStatusForAgent(): Promise<PipelineStatusForAgent> {
  const [aleResult, clients] = await Promise.all([getAleLeads(), getClients()]);

  const prospects: PipelineStatusForAgent["prospects"] = !aleResult.connected
    ? { connected: false }
    : "fetchError" in aleResult
      ? { connected: true, fetchError: aleResult.fetchError }
      : {
          connected: true,
          total: aleResult.leads.length,
          researched: aleResult.leads.filter((l) => l.researched).length,
          pitchCreated: aleResult.leads.filter((l) => l.pitchCreated).length,
          pitched: aleResult.leads.filter((l) => l.pitched).length,
          companies: aleResult.leads.slice(0, MAX_COMPANIES_LISTED).map((l) => ({
            name: l.name,
            stage: l.pitched
              ? "pitched"
              : l.pitchCreated
                ? "pitch_created"
                : l.researched
                  ? "researched"
                  : "discovered",
          })),
        };

  const byStatus: Record<"active" | "paused" | "completed", number> = {
    active: 0,
    paused: 0,
    completed: 0,
  };
  for (const c of clients) {
    if (c.status === "active" || c.status === "paused" || c.status === "completed") {
      byStatus[c.status as "active" | "paused" | "completed"] += 1;
    }
  }

  return {
    prospects,
    clients: {
      total: clients.length,
      byStatus,
      companies: clients.slice(0, MAX_COMPANIES_LISTED).map((c) => ({ name: c.name, status: c.status })),
    },
  };
}
