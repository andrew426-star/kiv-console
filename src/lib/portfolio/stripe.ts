import { connection } from "next/server";

const STRIPE_BASE = "https://api.stripe.com/v1";

export type StripeActivity = {
  id: string;
  type: string;
  description: string | null;
  amount: number;
  currency: string;
  createdAt: string;
};

export type StripeFinancials = {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  recentActivity: StripeActivity[];
};

export type StripeFinancialsResult =
  | { connected: false }
  | { connected: true; financials: StripeFinancials }
  | { connected: true; fetchError: string };

// Company Financials — Kivaro AI's own Stripe account (revenue/balance/
// payout activity), not a client-facing feature. Use a Restricted API Key
// scoped read-only to Balance + Balance Transactions, not the full secret
// key — this only ever reads.
export async function getStripeFinancials(): Promise<StripeFinancialsResult> {
  // No cookies/session dependency here to signal per-request rendering to
  // Cache Components on its own — without this, balance/activity would get
  // frozen into the static prerender at build/deploy time instead of
  // fetched fresh on every load.
  await connection();

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) return { connected: false };

  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    const [balanceRes, activityRes] = await Promise.all([
      fetch(`${STRIPE_BASE}/balance`, { headers }),
      fetch(`${STRIPE_BASE}/balance_transactions?limit=10`, { headers }),
    ]);

    if (!balanceRes.ok) throw new Error(`Stripe balance fetch failed: ${await balanceRes.text()}`);
    if (!activityRes.ok) {
      throw new Error(`Stripe activity fetch failed: ${await activityRes.text()}`);
    }

    const balanceData = (await balanceRes.json()) as {
      available: Array<{ amount: number; currency: string }>;
      pending: Array<{ amount: number; currency: string }>;
    };
    const activityData = (await activityRes.json()) as {
      data: Array<{
        id: string;
        type: string;
        description: string | null;
        amount: number;
        currency: string;
        created: number;
      }>;
    };

    const available = balanceData.available[0];
    const pending = balanceData.pending[0];

    return {
      connected: true,
      financials: {
        availableBalance: (available?.amount ?? 0) / 100,
        pendingBalance: (pending?.amount ?? 0) / 100,
        currency: (available?.currency ?? "usd").toUpperCase(),
        recentActivity: activityData.data.map((tx) => ({
          id: tx.id,
          type: tx.type,
          description: tx.description,
          amount: tx.amount / 100,
          currency: tx.currency.toUpperCase(),
          createdAt: new Date(tx.created * 1000).toISOString(),
        })),
      },
    };
  } catch (err) {
    console.error("Failed to load Stripe financials", err);
    return {
      connected: true,
      fetchError: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
