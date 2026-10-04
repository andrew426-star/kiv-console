import type { Lead } from "./queries";

// Where a lead sits in ALE, i.e. what it needs next. Order matters: each
// stage requires the one before it (Hunter needs a website, research needs
// a Hunter search, a pitch needs research, a send needs a drafted pitch).
export const LEAD_STAGES = ["no_website", "enrich", "research", "pitch", "drafted", "sent"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  no_website: "No website",
  enrich: "To enrich",
  research: "To research",
  pitch: "To draft",
  drafted: "Drafted",
  sent: "Sent",
};

export function leadStage(lead: Lead): LeadStage {
  if (lead.pitched) return "sent";
  if (lead.pitchCreated) return "drafted";
  if (lead.researched) return "pitch";
  // Searched with nobody found still goes on: research works from the
  // company's own site and needs no contacts.
  if (lead.contactCount > 0 || lead.hunterSearched) return "research";
  if (lead.website) return "enrich";
  return "no_website";
}

export function isLeadStage(value: unknown): value is LeadStage {
  return typeof value === "string" && (LEAD_STAGES as readonly string[]).includes(value);
}

export function countByStage(leads: Lead[]): Record<LeadStage, number> {
  const counts = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0])) as Record<LeadStage, number>;
  for (const lead of leads) counts[leadStage(lead)] += 1;
  return counts;
}
