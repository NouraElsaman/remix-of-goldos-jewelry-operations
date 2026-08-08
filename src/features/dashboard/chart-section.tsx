import { ArrowUpRight } from "lucide-react";

import {
  AreaChartWidget,
  BarChartWidget,
  ChartContainer,
  DonutChartWidget,
} from "@/components/shared";
import type { AnalyticsSummary } from "@/services/contracts";
import type { TranslationKey } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

/**
 * Dashboard chart section: revenue area chart + karat distribution donut.
 * Reuses shared AreaChartWidget and DonutChartWidget primitives.
 * No fetching — receives analytics data from the route.
 */
export function ChartSection({
  analytics,
  isLoading,
  t,
  locale,
  revenueChangePct,
}: {
  analytics: AnalyticsSummary | undefined;
  isLoading: boolean;
  t: (key: TranslationKey) => string;
  locale: Locale;
  revenueChangePct?: number | null;
}) {
  const revenueData = analytics?.revenueTrend ?? [];
  const karatData = (analytics?.weightByKarat ?? []).map((d, i) => ({
    label: d.label,
    value: d.value,
    color: [
      "var(--color-gold)",
      "var(--color-chart-2)",
      "var(--color-chart-3)",
      "var(--color-chart-4)",
    ][i % 4],
  }));

  const showGrowth = revenueChangePct !== undefined && revenueChangePct !== null;
  const isPositive = showGrowth && revenueChangePct > 0;
  const isNegative = showGrowth && revenueChangePct < 0;
  const colorClass = isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Revenue trend — spans 2 cols */}
      <ChartContainer
        title={t("analytics.revenueTrend")}
        description={t("dashboard.vsYesterday")}
        className="lg:col-span-2"
        actions={
          showGrowth ? (
            <span className={`flex items-center gap-1 text-xs ${colorClass}`}>
              {!isNegative && <ArrowUpRight className="size-3.5" aria-hidden />}
              {revenueChangePct >= 0 ? "+" : ""}{revenueChangePct}%
            </span>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="h-60 w-full animate-pulse rounded-xl bg-surface-muted" />
        ) : (
          <AreaChartWidget
            data={revenueData}
            height={240}
            valueFormatter={(v) => formatMoney(v, locale)}
          />
        )}
      </ChartContainer>

      {/* Karat distribution donut */}
      <ChartContainer
        title={t("analytics.weightByKarat")}
        description={t("common.grams")}
      >
        {isLoading ? (
          <div className="h-60 w-full animate-pulse rounded-xl bg-surface-muted" />
        ) : (
          <DonutChartWidget
            data={karatData}
            height={240}
            valueFormatter={(v) => `${v.toFixed(1)} جم`}
          />
        )}
      </ChartContainer>
    </div>
  );
}
