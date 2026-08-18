import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Consistent frame for every chart: title, controls and a fixed plot area. */
export function ChartContainer({
  title,
  description,
  actions,
  height = 280,
  children,
  className,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  height?: number | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <section
      className={cn(
        "h-full flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md overflow-hidden",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-2">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-xs text-muted-foreground/80">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="mt-4 w-full min-w-0" style={{ height }}>
        {children}
      </div>
    </section>
  );
}
