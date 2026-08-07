/**
 * GoldOS Pricing Engine
 *
 * All gold price calculation logic lives here.
 * NO UI imports. NO React imports. NO service calls.
 *
 * This module is the single source of truth for:
 *   - Deriving karat rates from 24K base price
 *   - Computing final item prices (gold value + fees + VAT)
 *   - Validating rate inputs
 *   - Formatting price change signals
 *
 * Consumed by: Cashier, Inventory, Reports, Analytics, Reconciliation, AI.
 * Strategy pattern: PriceProvider interface allows swapping data source.
 */

import type { GoldPrice, Karat } from "@/types/domain";
import type { ComputedItemPrice, PricingConfig } from "@/services/contracts";

// ── Karat purity ratios (fineness / 24) ───────────────────────────────────

export const KARAT_PURITY: Record<Karat, number> = {
  24: 1.0,
  22: 22 / 24,
  21: 21 / 24,
  18: 18 / 24,
  14: 14 / 24,
} as const;

/** All karats this shop supports, in display order. */
export const SUPPORTED_KARATS: Karat[] = [24, 22, 21, 18, 14];

// ── Default pricing configuration ─────────────────────────────────────────

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  vatRate: 0.15,
  stampingFee: 2.5,
  shopMargin: 0,
};

// ── Derivation helpers ─────────────────────────────────────────────────────

/**
 * Derives a karat rate from the 24K base rate using purity ratio.
 * Used when only the 24K price is available (e.g. external API).
 */
export function deriveKaratRate(base24KRate: number, karat: Karat): number {
  return parseFloat((base24KRate * KARAT_PURITY[karat]).toFixed(2));
}

/**
 * Derives all karat rates from a single 24K base rate.
 */
export function deriveAllRates(base24KRate: number): Record<Karat, number> {
  return Object.fromEntries(
    SUPPORTED_KARATS.map((k) => [k, deriveKaratRate(base24KRate, k)]),
  ) as Record<Karat, number>;
}

// ── Price change helpers ───────────────────────────────────────────────────

export type PriceDirection = "up" | "down" | "flat";

export function getPriceDirection(
  changePct: number | undefined,
): PriceDirection {
  if (changePct == null || changePct === 0) return "flat";
  return changePct > 0 ? "up" : "down";
}

export function formatChangePct(changePct: number | undefined): string {
  if (changePct == null) return "—";
  const sign = changePct > 0 ? "+" : "";
  return `${sign}${changePct.toFixed(2)}%`;
}

// ── Item price computation ────────────────────────────────────────────────

/**
 * Computes the full sale price breakdown for a single inventory item.
 *
 * Formula:
 *   goldValue       = netWeight × karatRate
 *   subtotal        = goldValue + manufacturingCost + stampingFee + shopMargin
 *   vatAmount       = subtotal × vatRate
 *   total           = subtotal + vatAmount
 */
export function computeItemPrice(params: {
  netWeight: number;
  karatRate: number;
  manufacturingCost: number;
  config: PricingConfig;
}): ComputedItemPrice {
  const { netWeight, karatRate, manufacturingCost, config } = params;

  const goldValue = parseFloat((netWeight * karatRate).toFixed(2));
  const stampingFee = parseFloat((config.stampingFee * netWeight).toFixed(2));
  const shopMarginAmount = parseFloat(
    (config.shopMargin * netWeight).toFixed(2),
  );
  const subtotal = parseFloat(
    (goldValue + manufacturingCost + stampingFee + shopMarginAmount).toFixed(2),
  );
  const vatAmount = parseFloat((subtotal * config.vatRate).toFixed(2));
  const total = parseFloat((subtotal + vatAmount).toFixed(2));

  return {
    goldValue,
    manufacturingCost,
    stampingFee,
    subtotal,
    vatAmount,
    total,
  };
}

// ── Validation ────────────────────────────────────────────────────────────

export type PriceValidationResult =
  { valid: true } | { valid: false; reason: string };

/** Validates a proposed gold rate (SAR/g). */
export function validateGoldRate(rate: number): PriceValidationResult {
  if (!isFinite(rate) || isNaN(rate)) {
    return { valid: false, reason: "price.error.notANumber" };
  }
  if (rate <= 0) {
    return { valid: false, reason: "price.error.mustBePositive" };
  }
  if (rate > 10_000) {
    return { valid: false, reason: "price.error.tooHigh" };
  }
  return { valid: true };
}

// ── History helpers ───────────────────────────────────────────────────────

/**
 * Groups a flat GoldPrice[] by date, returning one row per date
 * with a map of karat → rate. Used by the history table.
 */
export type PriceHistoryRow = {
  date: string;
  rates: Partial<Record<Karat, number>>;
  changePcts: Partial<Record<Karat, number>>;
  source?: string | undefined;
};

export function groupPricesByDate(prices: GoldPrice[]): PriceHistoryRow[] {
  const map = new Map<string, PriceHistoryRow>();

  for (const p of prices) {
    const existing: PriceHistoryRow = map.get(p.date) ?? {
      date: p.date,
      rates: {} as Partial<Record<Karat, number>>,
      changePcts: {} as Partial<Record<Karat, number>>,
      source: p.source,
    };
    existing.rates[p.karat] = p.rate;
    if (p.changePct !== undefined) existing.changePcts[p.karat] = p.changePct;
    map.set(p.date, existing);
  }

  // Return sorted newest-first
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Extracts a karat's trend series from history for a line/area chart.
 * Returns { label: date, value: rate }[]
 */
export function extractKaratTrend(
  prices: GoldPrice[],
  karat: Karat,
): Array<{ label: string; value: number }> {
  return prices
    .filter((p) => p.karat === karat)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => {
      let label = p.date.slice(5, 10);
      try {
        const d = new Date(p.date);
        if (!isNaN(d.getTime()) && p.date.includes("T")) {
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const hours = String(d.getHours()).padStart(2, "0");
          const minutes = String(d.getMinutes()).padStart(2, "0");
          label = `${month}-${day} ${hours}:${minutes}`;
        }
      } catch {}
      return { label, value: p.rate };
    });
}
