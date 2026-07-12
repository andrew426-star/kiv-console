import { cacheLife } from "next/cache";

export type WeatherSnapshot = {
  location: string;
  tempF: number;
  feelsLikeF: number;
  description: string;
  highF: number;
  lowF: number;
  chanceOfRainPercent: number;
};

type WttrHour = { time: string; chanceofrain?: string };
type WttrResponse = {
  current_condition?: Array<{
    temp_F: string;
    FeelsLikeF: string;
    weatherDesc?: Array<{ value: string }>;
  }>;
  weather?: Array<{
    maxtempF: string;
    mintempF: string;
    hourly?: WttrHour[];
  }>;
};

// wttr.in — free, keyless weather API. No WEATHER_LOCATION means the
// Research brief just omits weather rather than guessing a city.
export async function getWeatherSnapshot(): Promise<WeatherSnapshot | null> {
  "use cache";
  cacheLife("hours");

  const location = process.env.WEATHER_LOCATION;
  if (!location) return null;

  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
      // wttr.in serves plain-text ASCII art to unrecognized clients unless
      // the UA looks like curl — this is the documented way to force JSON.
      headers: { "User-Agent": "curl/8.0" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as WttrResponse;
    const current = data.current_condition?.[0];
    const today = data.weather?.[0];
    if (!current || !today) return null;

    const middayHour =
      today.hourly?.find((h) => h.time === "1200") ??
      today.hourly?.[Math.floor((today.hourly?.length ?? 1) / 2)];

    return {
      location,
      tempF: Number(current.temp_F),
      feelsLikeF: Number(current.FeelsLikeF),
      description: current.weatherDesc?.[0]?.value ?? "Unknown",
      highF: Number(today.maxtempF),
      lowF: Number(today.mintempF),
      chanceOfRainPercent: Number(middayHour?.chanceofrain ?? 0),
    };
  } catch (err) {
    console.error("Weather fetch failed", err);
    return null;
  }
}
