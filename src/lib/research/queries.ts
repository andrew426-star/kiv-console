import { createClient } from "@/lib/supabase/server";
import type { Brief } from "./generate";

export async function getLatestBrief(): Promise<Brief | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_briefs")
    .select("content, generated_at")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to load latest research brief", error);
    return null;
  }
  if (!data) return null;
  return { content: data.content as string, generatedAt: data.generated_at as string };
}

export function isStale(generatedAt: string): boolean {
  return new Date(generatedAt).toDateString() !== new Date().toDateString();
}
