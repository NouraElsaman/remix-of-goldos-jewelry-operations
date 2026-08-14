import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "flat";

/**
 * Standalone trend badge: arrow icon + percentage value.
 * Context-aware coloring: up=success, down=destructive, flat=muted.
 * Reusable in KPI cards, tables, price lists, chart legends.
 */
export function TrendBadge({
  direction,
  value,
  className,
}: {
  direction: TrendDirection;
  value: string;
  className?: string | undefined;
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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        direction === "up" && "border-success/25 bg-success/10 text-success",
        direction === "down" &&
          "border-destructive/25 bg-destructive/10 text-destructive",
        direction === "flat" &&
          "border-border/80 bg-surface-muted/90 text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      <span dir="ltr">{value}</span>
    </span>
  );
}
