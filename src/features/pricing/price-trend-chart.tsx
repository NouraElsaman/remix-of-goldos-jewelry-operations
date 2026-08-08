import { useMemo, useState } from "react";

import { AreaChartWidget, ChartContainer } from "@/components/shared";
import {
  extractKaratTrend,
  SUPPORTED_KARATS,
} from "@/features/pricing/pricing-engine";
import type { GoldPrice, Karat } from "@/types/domain";
import type { Locale, TranslationKey } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const KARAT_COLORS: Record<Karat, string> = {
  24: "var(--color-gold)",
  21: "var(--color-chart-3)",
  18: "var(--color-chart-4)",
};

/**
 * Karat selector tab strip — switches which karat trend is displayed.
 */
function KaratTabs({
  active,
  onChange,
}: {
  active: Karat;
  onChange: (k: Karat) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-muted p-1">
      {SUPPORTED_KARATS.map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            active === k
              ? "bg-surface text-foreground shadow-hairline"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {k}K
        </button>
      ))}
    </div>
  );
}

/**
 * Price trend chart — area chart for selected karat, karat tab switcher.
 * Uses the pricing engine's extractKaratTrend() to prepare chart data.
 * Reuses shared AreaChartWidget. No fetching.
 */
export function PriceTrendChart({
  history,
  isLoading,
  t,
  locale,
}: {
  history: GoldPrice[];
  isLoading: boolean;
  t: (key: TranslationKey) => string;
  locale: Locale;
}) {
  const [activeKarat, setActiveKarat] = useState<Karat>(24);

  const chartData = useMemo(
    () => extractKaratTrend(history, activeKarat),
    [history, activeKarat],
  );

  return (
    <ChartContainer
      title={t("goldPrices.trendChart")}
      description={t("goldPrices.trendDesc")}
      actions={<KaratTabs active={activeKarat} onChange={setActiveKarat} />}
    >
      {isLoading ? (
        <div className="h-60 w-full animate-pulse rounded-xl bg-surface-muted" />
      ) : (
        <AreaChartWidget
          data={chartData}
          height={240}
          color={KARAT_COLORS[activeKarat]}
          valueFormatter={(v) => formatMoney(v, locale)}
        />
      )}
    </ChartContainer>
  );
}
