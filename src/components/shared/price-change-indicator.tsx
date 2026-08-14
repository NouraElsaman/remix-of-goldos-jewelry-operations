import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceDirection } from "@/features/pricing/pricing-engine";

/**
 * Inline price change indicator: icon + formatted percentage.
 * Larger and more prominent than TrendBadge — designed for price-focused UIs.
 * Business-agnostic: works for any numeric change value.
 */
export function PriceChangeIndicator({
  changePct,
  direction,
  className,
}: {
  changePct: string;
  direction: PriceDirection;
  className?: string;
}) {
  const Icon =
    direction === "up"
      ? TrendingUp
      : direction === "down"
        ? TrendingDown
        : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-semibold",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        direction === "flat" && "text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
      <span dir="ltr">{changePct}</span>
    </span>
  );
}
