"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quoteExists } from "@/lib/market/finnhub";

export async function addWatchlistItem(formData: FormData) {
  const symbol = (formData.get("symbol") as string | null)?.trim().toUpperCase();
  const label = (formData.get("label") as string | null)?.trim() || symbol;
  if (!symbol) throw new Error("Symbol is required");

  const exists = await quoteExists(symbol);
  if (!exists) {
    throw new Error(`Finnhub doesn't recognize symbol "${symbol}"`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("watchlist_items").insert({ symbol, label });
  if (error) throw error;
  revalidatePath("/intel");
}

export async function removeWatchlistItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/intel");
}
