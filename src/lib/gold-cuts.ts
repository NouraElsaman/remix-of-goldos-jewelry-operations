import { supabase } from "@/services/supabase/supabase-provider";
import type { GoldCut, GoldCutKarat } from "@/types/domain";

export const DEFAULT_GOLD_CUTS: GoldCut[] = [];

/**
 * Syncs and retrieves gold cuts from Supabase + local cache.
 */
export async function fetchGoldCutsAsync(): Promise<GoldCut[]> {
  try {
    const { data, error } = await supabase
      .from("gold_cuts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const cuts: GoldCut[] = data.map((item) => ({
        id: item.id,
        traderName: item.trader_name,
        goldPrice: Number(item.gold_price),
        weightGrams: Number(item.weight_grams),
        totalAmount: Number(item.total_amount),
        karat: (Number(item.karat) as GoldCutKarat) || 24,
        createdAt: item.created_at,
        notes: item.notes ?? "",
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem("goldos_gold_cuts", JSON.stringify(cuts));
      }
      return cuts;
    }
  } catch (e) {
    // console.warn("Supabase fetch gold cuts fallback to local cache:", e);
  }

  return getGoldCuts();
}

/**
 * Synchronous local storage retrieval helper
 */
export function getGoldCuts(): GoldCut[] {
  if (typeof window === "undefined") return DEFAULT_GOLD_CUTS;

  const saved = localStorage.getItem("goldos_gold_cuts");
  if (!saved) {
    localStorage.setItem("goldos_gold_cuts", JSON.stringify(DEFAULT_GOLD_CUTS));
    return DEFAULT_GOLD_CUTS;
  }

  try {
    return JSON.parse(saved);
  } catch (e) {
    localStorage.setItem("goldos_gold_cuts", JSON.stringify(DEFAULT_GOLD_CUTS));
    return DEFAULT_GOLD_CUTS;
  }
}

/**
 * Save or update a gold cut in local storage and Supabase table
 */
export async function saveGoldCut(cutInput: Partial<GoldCut> & { traderName: string; goldPrice: number; weightGrams: number; karat: GoldCutKarat }): Promise<GoldCut> {
  const current = getGoldCuts();
  const id = cutInput.id || `cut_${Date.now()}`;
  const totalAmount = cutInput.totalAmount ?? (cutInput.weightGrams * cutInput.goldPrice);
  const createdAt = cutInput.createdAt || new Date().toISOString();

  const newCut: GoldCut = {
    id,
    traderName: cutInput.traderName.trim(),
    goldPrice: Number(cutInput.goldPrice),
    weightGrams: Number(cutInput.weightGrams),
    totalAmount: Number(totalAmount),
    karat: cutInput.karat || 24,
    createdAt,
    notes: cutInput.notes?.trim() || "",
  };

  const nextCuts = [newCut, ...current.filter((c) => c.id !== newCut.id)];

  if (typeof window !== "undefined") {
    localStorage.setItem("goldos_gold_cuts", JSON.stringify(nextCuts));
  }

  // Sync with Supabase table
  try {
    await supabase.from("gold_cuts").upsert({
      id: newCut.id,
      trader_name: newCut.traderName,
      gold_price: newCut.goldPrice,
      weight_grams: newCut.weightGrams,
      total_amount: newCut.totalAmount,
      karat: newCut.karat,
      created_at: newCut.createdAt,
      notes: newCut.notes,
    });
  } catch (err) {
    // console.error("Failed to sync gold cut to Supabase:", err);
  }

  return newCut;
}

/**
 * Deletes a gold cut from local storage and Supabase
 */
export async function deleteGoldCut(id: string): Promise<void> {
  const current = getGoldCuts();
  const next = current.filter((c) => c.id !== id);

  if (typeof window !== "undefined") {
    localStorage.setItem("goldos_gold_cuts", JSON.stringify(next));
  }

  try {
    await supabase.from("gold_cuts").delete().eq("id", id);
  } catch (err) {
    // console.error("Failed to delete gold cut from Supabase:", err);
  }
}
