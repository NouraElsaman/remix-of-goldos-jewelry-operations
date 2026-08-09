import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  AreaChartWidget,
  ChartContainer,
  DonutChartWidget,
  PageHeader,
} from "@/components/shared";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import { queryKeys, services } from "@/services";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/analytics")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "التحليلات — جوهرة تك" },
      {
        name: "description",
        content: "تحليلات الأداء وحركة المبيعات والأوزان.",
      },
      { property: "og:title", content: "التحليلات — جوهرة تك" },
      {
        property: "og:description",
        content:
          "Revenue trends, karat mix and item performance for the jewelry shop.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { t, locale } = useI18n();

  const { data: analytics, isLoading } = useQuery({
    queryKey: queryKeys.analytics.summary(),
    queryFn: () => services.analytics.summary(),
  });

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

  return (
    <PageTransition>
      <PageHeader
        title={t("analytics.title")}
        description={t("analytics.subtitle")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartContainer title={t("analytics.revenueTrend")} className="lg:col-span-2">
          {isLoading ? (
            <div className="h-60 w-full animate-pulse rounded-xl bg-surface-muted" />
          ) : (
            <AreaChartWidget
              data={revenueData}
              height={260}
              valueFormatter={(v) => formatMoney(v, locale)}
            />
          )}
        </ChartContainer>

        <ChartContainer title={t("analytics.weightByKarat")}>
          {isLoading ? (
            <div className="h-60 w-full animate-pulse rounded-xl bg-surface-muted" />
          ) : (
            <DonutChartWidget
              data={karatData}
              height={260}
              valueFormatter={(v) => `${v.toFixed(1)} جم`}
            />
          )}
        </ChartContainer>
      </div>
    </PageTransition>
  );
}
