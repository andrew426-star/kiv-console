import type { createAdminClient } from "@/lib/supabase/admin";
import { STRATEGY_IDS, STRATEGY_REGISTRY } from "./index";

// Upserts every STRATEGY_REGISTRY entry into trading_strategies —
// git-versioned config synced to the DB at run time, not manually seeded,
// matching how roster.ts/alpaca-bars.ts's universes already work in this
// codebase. Kept out of strategies/index.ts itself so that file stays a
// pure, dependency-free registry — directly unit-testable without pulling
// in the Supabase client.
export async function syncStrategyRegistry(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const rows = STRATEGY_IDS.map((id) => {
    const strategy = STRATEGY_REGISTRY[id];
    return {
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      default_params: strategy.defaultParams,
    };
  });

  const { error } = await admin.from("trading_strategies").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`Failed to sync strategy registry: ${error.message}`);
}
