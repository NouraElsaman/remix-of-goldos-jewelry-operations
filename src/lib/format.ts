import { appConfig } from "@/config/app";
import type { Locale } from "@/lib/i18n";

const localeTag: Record<Locale, string> = { ar: "ar-EG", en: "en-US" };

function withNumberIsolation(value: string, locale: Locale): string {
  if (locale === "ar") {
    return `\u2066${value}\u2069`;
  }
  return value;
}

/** Money formatting — always 2 decimals, currency-aware, locale-aware. */
export function formatMoney(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: "currency",
    currency: appConfig.currency,
    minimumFractionDigits: appConfig.moneyPrecision,
    maximumFractionDigits: appConfig.moneyPrecision,
  }).format(value);
}

/** Compact currency formatting (e.g., 110K ج.م) */
export function formatCurrencyCompact(value: number, locale: Locale = "en"): string {
  const safeValue = Math.max(0, value);
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(safeValue);

  const numericText = withNumberIsolation(compact, locale);
  const suffix = locale === "ar" ? "ج.م" : "EGP";
  return locale === "ar" ? `${numericText} ${suffix}` : `${numericText} ${suffix}`;
}

/** Weight formatting — always 3 decimals, grams. */
export function formatWeight(value: number, locale: Locale = "en"): string {
  const n = new Intl.NumberFormat(localeTag[locale], {
    minimumFractionDigits: appConfig.weightPrecision,
    maximumFractionDigits: appConfig.weightPrecision,
  }).format(value);
  const numericText = withNumberIsolation(n, locale);
  return locale === "ar" ? `${numericText} جم` : `${numericText} g`;
}

export function formatNumber(value: number, locale: Locale = "en"): string {
  const n = new Intl.NumberFormat(localeTag[locale]).format(value);
  return withNumberIsolation(n, locale);
}

export function formatPercent(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(
  value: Date | string,
  locale: Locale = "en",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: "medium",
  }).format(date);
}

export function formatTime(
  value: Date | string,
  locale: Locale = "en",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(localeTag[locale], {
    timeStyle: "short",
  }).format(date);
}
