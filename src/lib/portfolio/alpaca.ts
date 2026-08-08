import { connection } from "next/server";

// Defaults to Alpaca's paper-trading endpoint — paper and live API keys are
// separate key pairs that only work against their matching base URL, so
// this stays safe until ALPACA_API_BASE_URL is explicitly pointed at
// https://api.alpaca.markets with real live keys.
const DEFAULT_BASE_URL = "https://paper-api.alpaca.markets";

export type AlpacaAccount = {
  equity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  status: string;
  // Equity as of the previous trading day's close — the real baseline
  // the trading engine's daily-loss circuit breaker compares against.
  lastEquity: number;
};

export type AlpacaPosition = {
  symbol: string;
  qty: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  currentPrice: number;
};

export type AlpacaPortfolio = {
  account: AlpacaAccount;
  positions: AlpacaPosition[];
};

export type AlpacaPortfolioResult =
  | { connected: false }
  | { connected: true; portfolio: AlpacaPortfolio }
  | { connected: true; fetchError: string };

// Investment Account — read-only. K.I.V. never places orders; trading
// happens on Alpaca's own site or its TradingView broker panel.
export async function getAlpacaPortfolio(): Promise<AlpacaPortfolioResult> {
  // See the matching comment in lib/portfolio/stripe.ts — forces per-request
  // rendering so account/positions are never frozen into a static prerender.
  await connection();

  const keyId = process.env.ALPACA_API_KEY_ID;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  if (!keyId || !secretKey) return { connected: false };

  const baseUrl = process.env.ALPACA_API_BASE_URL ?? DEFAULT_BASE_URL;
  const headers = { "APCA-API-KEY-ID": keyId, "APCA-API-SECRET-KEY": secretKey };

  try {
    const [accountRes, positionsRes] = await Promise.all([
      fetch(`${baseUrl}/v2/account`, { headers }),
      fetch(`${baseUrl}/v2/positions`, { headers }),
    ]);

    if (!accountRes.ok) throw new Error(`Alpaca account fetch failed: ${await accountRes.text()}`);
    if (!positionsRes.ok) {
      throw new Error(`Alpaca positions fetch failed: ${await positionsRes.text()}`);
    }

    const accountData = (await accountRes.json()) as {
      equity: string;
      cash: string;
      buying_power: string;
      portfolio_value: string;
      status: string;
      last_equity: string;
    };
    const positionsData = (await positionsRes.json()) as Array<{
      symbol: string;
      qty: string;
      market_value: string;
      cost_basis: string;
      unrealized_pl: string;
      unrealized_plpc: string;
      current_price: string;
    }>;

    return {
      connected: true,
      portfolio: {
        account: {
          equity: Number(accountData.equity),
          cash: Number(accountData.cash),
          buyingPower: Number(accountData.buying_power),
          portfolioValue: Number(accountData.portfolio_value),
          status: accountData.status,
          lastEquity: Number(accountData.last_equity),
        },
        positions: positionsData.map((p) => ({
          symbol: p.symbol,
          qty: Number(p.qty),
          marketValue: Number(p.market_value),
          costBasis: Number(p.cost_basis),
          unrealizedPL: Number(p.unrealized_pl),
          unrealizedPLPercent: Number(p.unrealized_plpc) * 100,
          currentPrice: Number(p.current_price),
        })),
      },
    };
  } catch (err) {
    console.error("Failed to load Alpaca portfolio", err);
    return {
      connected: true,
      fetchError: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
