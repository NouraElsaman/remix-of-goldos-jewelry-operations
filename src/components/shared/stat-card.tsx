import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Compact inline statistic — used inside cards, headers and summaries. */
export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  sublabel?: string | undefined;
  icon?: LucideIcon | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-surface-muted/60 px-4 py-3",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-8 items-center justify-center rounded-lg bg-surface text-gold-deep shadow-hairline">
          <Icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p
          data-numeric
          className="text-sm font-semibold text-foreground"
        >
          {value}
        </p>
        {sublabel ? (
          <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
        ) : null}
      </div>
    </div>
  );
}
