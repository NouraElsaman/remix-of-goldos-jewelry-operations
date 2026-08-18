import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { cardHover } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type KpiTrend = { value: string; direction: "up" | "down" | "flat" };

/**
 * Primary KPI tile. Used across Dashboard, Analytics, and any summary view.
 *
 * Props:
 * - `label`    — metric name
 * - `value`    — primary formatted value (caller formats with locale)
 * - `hint`     — secondary label (e.g. "vs yesterday")
 * - `icon`     — LucideIcon
 * - `trend`    — direction + percentage string
 * - `badge`    — optional ReactNode slot (status chip, alert count, etc.)
 * - `accent`   — gold tint variant (highlight most-important KPI)
 * - `loading`  — shows skeleton instead of values
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  badge,
  accent = false,
  loading = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  icon?: LucideIcon | undefined;
  trend?: KpiTrend | undefined;
  badge?: ReactNode | undefined;
  accent?: boolean | undefined;
  loading?: boolean | undefined;
  className?: string | undefined;
}) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex flex-col justify-between gap-3.5 rounded-2xl border border-border bg-surface p-5.5 shadow-soft",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-9.5 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    );
  }

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
        ? TrendingDown
        : Minus;

  return (
    <motion.article
      {...cardHover}
      className={cn(
        "h-full min-h-[120px] group relative flex flex-col justify-between gap-3.5 rounded-2xl border border-border bg-surface p-5.5 shadow-sm transition-all duration-300 hover:border-gold/30 hover:shadow-md",
        accent && "border-gold/40 bg-gradient-to-br from-surface to-gold-soft/40 hover:border-gold/60",
        className,
      )}
    >
      {/* Header row: label + icon */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </p>
        <div className="flex items-center gap-2">
          {badge ? badge : null}
          {Icon ? (
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-xl border border-border/50 bg-surface-muted/50 text-muted-foreground transition-all duration-300 group-hover:border-gold/40 group-hover:bg-gold-soft/50 group-hover:text-gold-deep backdrop-blur-sm",
                accent && "border-gold/40 bg-gold/10 text-gold-deep shadow-inner",
              )}
            >
              <Icon className="size-4.5" aria-hidden />
            </span>
          ) : null}
        </div>
      </div>

      {/* Primary value */}
      <p
        data-numeric
        className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.6rem] leading-none"
      >
        {value}
      </p>

      {/* Trend + hint row */}
      <div className="flex items-center gap-2 text-xs">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              trend.direction === "up" && "text-success",
              trend.direction === "down" && "text-destructive",
              trend.direction === "flat" && "text-muted-foreground",
            )}
          >
            <TrendIcon className="size-3.5" aria-hidden />
            {trend.value}
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground/80">{hint}</span> : null}
      </div>
    </motion.article>
  );
}
