import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCalendarState } from "@/lib/calendar/queries";
import { getMarketQuotes, type Quote } from "@/lib/market/finnhub";
import { getWatchlist } from "@/lib/intel/queries";
import { getNewsFeed } from "@/lib/news/newsapi";
import { getWeatherSnapshot } from "./weather";

const MOVER_THRESHOLD_PERCENT = 3;

export type Brief = {
  content: string;
  generatedAt: string;
};

function formatQuoteLine(q: Quote): string {
  const mover = Math.abs(q.changePercent) >= MOVER_THRESHOLD_PERCENT ? " [MOVER]" : "";
  const sign = q.change >= 0 ? "+" : "";
  return `${q.label} ${q.price.toFixed(2)} (${sign}${q.changePercent.toFixed(2)}%)${mover}`;
}

async function buildPromptContext(): Promise<string> {
  const [calendarState, watchlist, marketQuotes, news, weather] = await Promise.all([
    getCalendarState(),
    getWatchlist().catch(() => []),
    getMarketQuotes(),
    getNewsFeed(),
    getWeatherSnapshot(),
  ]);

  const sections: string[] = [`Today: ${new Date().toDateString()}`];

  if (calendarState.connected && "events" in calendarState) {
    const lines = calendarState.events.slice(0, 12).map((e) => {
      const when = e.start
        ? e.allDay
          ? new Date(e.start).toLocaleDateString()
          : new Date(e.start).toLocaleString()
        : "";
      return `- ${when} — ${e.summary}`;
    });
    sections.push(
      `Calendar (next 14 days):\n${lines.length > 0 ? lines.join("\n") : "No upcoming events."}`,
    );
  } else {
    sections.push("Calendar: not connected.");
  }

  sections.push(`Market snapshot:\n${marketQuotes.map(formatQuoteLine).join("\n")}`);

  if (watchlist.length > 0) {
    sections.push(`Watchlist:\n${watchlist.map(formatQuoteLine).join("\n")}`);
  }

  if (news.length > 0) {
    sections.push(
      `Recent news:\n${news
        .slice(0, 8)
        .map((a) => `- ${a.title} (${a.source})`)
        .join("\n")}`,
    );
  }

  if (weather) {
    sections.push(
      `Weather in ${weather.location}: ${weather.tempF.toFixed(0)}°F (feels ${weather.feelsLikeF.toFixed(0)}°F), ${weather.description}. ` +
        `High ${weather.highF.toFixed(0)}° / Low ${weather.lowF.toFixed(0)}°. ${weather.chanceOfRainPercent.toFixed(0)}% chance of rain.`,
    );
  }

  return sections.join("\n\n");
}

const SYSTEM_PROMPT = `You are the Research module inside K.I.V. (Kivaro Intelligence Vectoring), an internal operations console for Kivaro AI. Write a concise morning brief for the person running the company, synthesizing the calendar, market, news, and weather context you're given into a short, well-organized narrative — not a bare recap of every input.

Call out what actually matters: schedule conflicts or a packed day, notable market moves (especially anything flagged [MOVER] or on the watchlist), and news genuinely relevant to a fintech/AI/alternative-investments company. Skip sections with nothing worth saying instead of noting their absence.

Write in plain text: no markdown headers, no asterisks, no "#". Use a blank line between sections and a leading "-" for bullet points where useful. Keep it under 300 words.`;

export async function generateBrief(): Promise<Brief> {
  const context = await buildPromptContext();

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: context }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to generate a brief for this context");
  }

  const content = response.content.find((block) => block.type === "text")?.text;
  if (!content) throw new Error("Claude returned no text content");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_briefs")
    .insert({ content })
    .select("content, generated_at")
    .single();
  if (error) throw error;

  return { content: data.content as string, generatedAt: data.generated_at as string };
}
