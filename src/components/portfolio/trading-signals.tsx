import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getKillSwitchStatus, getRecentTradingSignals, getStrategyPerformanceSummary } from "@/lib/portfolio/trading";
import { STRATEGY_REGISTRY } from "@/lib/trading/strategies";
import type { StrategyId } from "@/lib/trading/types";
import { KillSwitchToggle } from "./kill-switch-toggle";
import { RunScanButton } from "./run-scan-button";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function strategyName(strategyId: StrategyId) {
  return STRATEGY_REGISTRY[strategyId]?.name ?? strategyId;
}

export async function TradingSignals() {
  const [killSwitch, signals, performance] = await Promise.all([
    getKillSwitchStatus(),
    getRecentTradingSignals(15),
    getStrategyPerformanceSummary(),
  ]);

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CardTitle className="font-heading">Algorithmic Trading Signals</CardTitle>
          <Badge
            variant={killSwitch.enabled ? "destructive" : "outline"}
            className={killSwitch.enabled ? "" : "border-kv-mint/40 text-kv-mint"}
          >
            {killSwitch.enabled ? "Halted" : "Active"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <RunScanButton />
          <KillSwitchToggle enabled={killSwitch.enabled} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          A rule-based signal engine (momentum, mean-reversion, breakout, and a composite
          ensemble vote) scans a curated Stocks/Crypto/Metals/Futures universe daily. Every
          signal below already passed real risk evaluation — position sizing, exposure caps, a
          daily-loss circuit breaker — before landing here. This is 100% advisory: nothing here
          places a trade.
        </p>

        {killSwitch.enabled ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Trading halted{killSwitch.reason ? `: ${killSwitch.reason}` : "."} No new signals will
            be generated until this is resumed.
          </p>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent signals
          </p>
          {signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No signals yet — run a scan above, or wait for the daily scheduled run.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((s) => (
                  <Fragment key={s.id}>
                  <TableRow className="border-b-0">
                    <TableCell>
                      <div className="font-medium">{s.assetName.replace(/\s*\(.*\)$/, "")}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.symbol}
                        {/\(.*proxy\)/i.test(s.assetName) ? " · ETF proxy" : ""}
                      </div>
                    </TableCell>
                    <TableCell>{strategyName(s.strategyId)}</TableCell>
                    <TableCell>
                      <span className={s.direction === "long" ? "text-kv-mint" : "text-destructive"}>
                        {s.direction}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{(s.confidence * 100).toFixed(0)}%</TableCell>
                    <TableCell>
                      <Badge
                        variant={s.approved ? "outline" : "secondary"}
                        className={s.approved ? "border-kv-mint/40 text-kv-mint" : ""}
                        title={s.reasons.join(" ")}
                      >
                        {s.approved ? "Approved" : "Rejected"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.approved ? formatCurrency(s.positionSizeUsd) : "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} className="pt-0">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          Why
                        </summary>
                        <p className="mt-1 max-w-3xl whitespace-normal text-muted-foreground">{s.summary}</p>
                        {!s.approved && s.reasons.length > 0 ? (
                          <p className="mt-1 max-w-3xl whitespace-normal text-xs text-muted-foreground">
                            Not approved: {s.reasons.join(" ")}
                          </p>
                        ) : null}
                        <ul className="mt-1 flex flex-col gap-0.5 text-xs">
                          {s.sources.map((source) => (
                            <li key={source.url} className="whitespace-normal">
                              <a href={source.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                {source.title}
                              </a>
                              <span className="text-muted-foreground">
                                {" "}
                                · {source.publisher}
                                {source.kind === "news" ? " · news, for context" : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </TableCell>
                  </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Backtested strategy performance
          </p>
          {performance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No backtest runs yet — the weekly job runs Sundays, or trigger one via
              /api/trading/backtest.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Symbols</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Win rate</TableHead>
                  <TableHead>Sharpe</TableHead>
                  <TableHead className="text-right">Avg. return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((p) => (
                  <TableRow key={p.strategyId}>
                    <TableCell className="font-medium">{strategyName(p.strategyId)}</TableCell>
                    <TableCell className="tabular-nums">{p.symbolsCovered}</TableCell>
                    <TableCell className="tabular-nums">{p.totalTrades}</TableCell>
                    <TableCell className="tabular-nums">
                      {p.avgWinRatePct !== null ? `${p.avgWinRatePct.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {p.avgSharpeRatio !== null ? p.avgSharpeRatio.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        p.avgTotalReturnPct >= 0 ? "text-kv-mint" : "text-destructive"
                      }`}
                    >
                      {p.avgTotalReturnPct >= 0 ? "+" : ""}
                      {p.avgTotalReturnPct.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
