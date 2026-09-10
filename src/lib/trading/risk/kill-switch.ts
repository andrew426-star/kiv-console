import { createAdminClient } from "@/lib/supabase/admin";

export interface KillSwitchStatus {
  halted: boolean;
  reason: string;
}

// Fail-closed: any path that can't positively confirm "not halted" returns
// halted:true — a DB read error, a missing row, and a thrown exception all
// halt, exactly the same as an explicit enable. This is the first thing
// generateSignalsForUniverse() checks. Two independent halt paths on
// purpose: the env var can be flipped without prod DB access, the DB row
// can be flipped without a deploy.
export async function isTradingHalted(): Promise<KillSwitchStatus> {
  if (process.env.TRADING_KILL_SWITCH === "true") {
    return { halted: true, reason: "TRADING_KILL_SWITCH environment variable is set to true." };
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("trading_kill_switch")
      .select("enabled, reason")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      return { halted: true, reason: `Kill switch DB read failed, fail-closed: ${error.message}` };
    }
    if (!data) {
      return { halted: true, reason: "No trading_kill_switch row found, fail-closed." };
    }
    if (data.enabled) {
      return { halted: true, reason: data.reason ?? "Kill switch enabled via the trading_kill_switch DB row." };
    }
    return { halted: false, reason: "Not halted." };
  } catch (err) {
    return {
      halted: true,
      reason: `Kill switch check threw, fail-closed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}
