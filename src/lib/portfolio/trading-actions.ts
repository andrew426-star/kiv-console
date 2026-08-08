"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateSignalsForUniverse } from "@/lib/trading/signals/generate";
import { logAgentActivity } from "@/lib/agents/log";

// Real, direct control over the same trading_kill_switch row
// risk/kill-switch.ts checks first on every scan — flipping this from the
// dashboard is the intended alternative to needing raw SQL access.
export async function setKillSwitch(enabled: boolean, reason: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("trading_kill_switch")
    .update({ enabled, reason, updated_by: user?.id ?? null })
    .eq("id", "default");
  if (error) throw error;

  await logAgentActivity({
    agentId: "trading-engine",
    action: enabled ? "Trading halted from K.I.V. dashboard" : "Trading resumed from K.I.V. dashboard",
    detail: reason ?? undefined,
    status: enabled ? "warning" : "info",
  }).catch(() => {});

  revalidatePath("/portfolio");
}

// Manual out-of-turn trigger for the same scan the daily GitHub Actions
// cron runs — calls the engine in-process rather than round-tripping
// through the bearer-token-gated /api/trading/scan route.
export async function runSignalScanNow() {
  const result = await generateSignalsForUniverse();
  revalidatePath("/portfolio");
  return result;
}
