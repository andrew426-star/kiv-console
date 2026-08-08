import type { OHLCVBar, StrategyParams, StrategySignal } from "../types";
import { donchianChannel, sma, clampConfidence } from "../math/stats";

export const BREAKOUT_DEFAULT_PARAMS: StrategyParams = {
  channelPeriod: 20,
  volumeAvgPeriod: 20,
  volumeConfirmMultiple: 1.2,
  targetRiskMultiple: 2,
};

// Long when price closes above its own prior N-day high (a genuine
// breakout — donchianChannel excludes the current bar from the channel
// it's measured against) AND volume confirms real participation, not a
// thin/illiquid poke through the level. Short is the mirror against the
// lower channel. Stop = the OTHER side of the channel (a real, visible
// level a trader would actually use), target = a fixed risk-multiple of
// the resulting stop distance.
export function runBreakout(
  bars: OHLCVBar[],
  params: StrategyParams = BREAKOUT_DEFAULT_PARAMS,
): StrategySignal | null {
  const channelPeriod = params.channelPeriod ?? BREAKOUT_DEFAULT_PARAMS.channelPeriod;
  const volumeAvgPeriod = params.volumeAvgPeriod ?? BREAKOUT_DEFAULT_PARAMS.volumeAvgPeriod;
  const volumeConfirmMultiple = params.volumeConfirmMultiple ?? BREAKOUT_DEFAULT_PARAMS.volumeConfirmMultiple;
  const targetRiskMultiple = params.targetRiskMultiple ?? BREAKOUT_DEFAULT_PARAMS.targetRiskMultiple;

  if (bars.length < Math.max(channelPeriod, volumeAvgPeriod) + 2) return null;

  const { upper, lower } = donchianChannel(bars, channelPeriod);
  const volumes = bars.map((b) => b.volume);
  const avgVolume = sma(volumes, volumeAvgPeriod);

  const i = bars.length - 1;
  const upperNow = upper[i];
  const lowerNow = lower[i];
  const avgVolNow = avgVolume[i];
  const close = bars[i].close;
  const volumeNow = bars[i].volume;

  if (upperNow === null || lowerNow === null || avgVolNow === null || avgVolNow <= 0) return null;

  const volumeConfirmed = volumeNow >= avgVolNow * volumeConfirmMultiple;
  const brokeUp = close > upperNow;
  const brokeDown = close < lowerNow;

  if (brokeUp && volumeConfirmed) {
    const stop = lowerNow;
    const riskDistance = close - stop;
    if (riskDistance <= 0) return null;
    return {
      direction: "long",
      confidence: clampConfidence([
        Math.min(1, ((close - upperNow) / upperNow) * 50),
        Math.min(1, volumeNow / avgVolNow / 2),
      ]),
      entry: close,
      stop,
      target: close + targetRiskMultiple * riskDistance,
      rationale: [
        `close (${close.toFixed(2)}) broke above the prior ${channelPeriod}-day high (${upperNow.toFixed(2)})`,
        `volume ${(volumeNow / avgVolNow).toFixed(2)}x the ${volumeAvgPeriod}-day average`,
      ],
    };
  }

  if (brokeDown && volumeConfirmed) {
    const stop = upperNow;
    const riskDistance = stop - close;
    if (riskDistance <= 0) return null;
    return {
      direction: "short",
      confidence: clampConfidence([
        Math.min(1, ((lowerNow - close) / lowerNow) * 50),
        Math.min(1, volumeNow / avgVolNow / 2),
      ]),
      entry: close,
      stop,
      target: close - targetRiskMultiple * riskDistance,
      rationale: [
        `close (${close.toFixed(2)}) broke below the prior ${channelPeriod}-day low (${lowerNow.toFixed(2)})`,
        `volume ${(volumeNow / avgVolNow).toFixed(2)}x the ${volumeAvgPeriod}-day average`,
      ],
    };
  }

  return null;
}
