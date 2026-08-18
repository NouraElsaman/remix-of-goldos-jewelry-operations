import { useState, useMemo } from "react";
import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  inferItemCategoryFromName,
  normalizeItemCategoryKey,
  ITEM_CATEGORY_LABELS,
} from "@/lib/category-inference";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ReferenceArea,
} from "recharts";

import {
  AreaChartWidget,
  ChartContainer,
  DonutChartWidget,
  PageHeader,
} from "@/components/shared";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import { queryKeys, services } from "@/services";
import { formatMoney, formatWeight, formatCurrencyCompact } from "@/lib/format";
import { KpiCard } from "@/components/shared/kpi-card";
import { Wallet, Scale, ArrowRightLeft, Coins } from "lucide-react";

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
      { name: "description", content: "تحليلات الأداء وحركة المبيعات والأوزان." },
      { property: "og:title", content: "التحليلات — جوهرة تك" },
      { property: "og:description", content: "Revenue trends, karat mix and item performance for the jewelry shop." },
    ],
  }),
  component: AnalyticsPage,
});

function niceRoundUp(max: number): number {
  if (!isFinite(max) || max <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / magnitude;
  let multiplier;
  if (normalized <= 1.5) multiplier = 2;
  else if (normalized <= 2.5) multiplier = 3;
  else if (normalized <= 4) multiplier = 5;
  else multiplier = 10;
  return multiplier * magnitude;
}

function AnalyticsPage() {
  const { t, locale } = useI18n();

  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "ytd">("7d");

  const dateFilter = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    if (period === "today") startDate.setHours(0, 0, 0, 0);
    else if (period === "7d") startDate.setDate(now.getDate() - 7);
    else if (period === "30d") startDate.setDate(now.getDate() - 30);
    else if (period === "ytd") startDate.setMonth(0, 1);
    
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    };
  }, [period]);

  const { data: invoicesPage, isLoading: isLoadingInvoices } = useQuery({
    queryKey: [...queryKeys.sales.invoices({ pageSize: 1000 }), dateFilter],
    queryFn: () => services.sales.listInvoices({ pageSize: 1000, ...dateFilter }),
  });
  
  const { data: dashboardSummary } = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => services.dashboard.summary(),
  });

  const invoices: any[] = invoicesPage?.items || (invoicesPage as any)?.data || [];

  // KPI Aggregations
  let totalRevenue = 0;
  let totalGramsSold = 0;
  let totalScrapPurchases = 0;
  let salesCount = 0;

  // Chart Aggregations
  const revenueMap = new Map<string, number>();
  const karatMap = new Map<string, number>();
  const salesVsScrapMap = new Map<string, { date: string; sales: number; scrap: number }>();
  const categoryMap = new Map<string, number>();

  invoices.forEach((inv: any) => {
    const dateStr = new Date(inv.createdAt).toLocaleDateString(locale.startsWith("ar") ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
    
    if (!salesVsScrapMap.has(dateStr)) {
      salesVsScrapMap.set(dateStr, { date: dateStr, sales: 0, scrap: 0 });
    }
    
    const row = salesVsScrapMap.get(dateStr)!;

    if (inv.transactionType === "sale") {
      totalRevenue += Number(inv.total || 0);
      totalGramsSold += Number(inv.weight || 0);
      salesCount++;
      row.sales += Number(inv.total || 0);
      
      revenueMap.set(dateStr, (revenueMap.get(dateStr) || 0) + Number(inv.total || 0));
      
      const karat = inv.karat ? `${inv.karat}K` : "غير محدد";
      karatMap.set(karat, (karatMap.get(karat) || 0) + Number(inv.weight || 0));

      const explicitCategory = normalizeItemCategoryKey(inv.itemType);
      const fallbackCategory = explicitCategory ?? inferItemCategoryFromName(inv.itemName || undefined);
      const canonicalCategory = explicitCategory ?? fallbackCategory;
      const categoryLabel = ITEM_CATEGORY_LABELS[canonicalCategory][locale.startsWith("ar") ? "ar" : "en"];
      categoryMap.set(categoryLabel, (categoryMap.get(categoryLabel) || 0) + Number(inv.weight || 0));
    } else if (inv.transactionType === "purchase") {
      totalScrapPurchases += Number(inv.total || 0);
      row.scrap += Number(inv.total || 0);
    }
  });

  // Since we traverse from newest to oldest in API response, reverse to show chronological order
  const revenueData = Array.from(revenueMap.entries()).map(([label, value]) => ({ label, value })).reverse();
  const salesVsScrapData = Array.from(salesVsScrapMap.values()).reverse();
  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const hoveredDateIndex = salesVsScrapData.length > 0 ? salesVsScrapData.length - 1 : 0;
  const hoveredDateLabel = salesVsScrapData[hoveredDateIndex]?.date ?? salesVsScrapData[0]?.date ?? null;
  const hoveredDateStart = hoveredDateLabel ? hoveredDateLabel : null;

  const karatColors: Record<string, string> = { "18K": "#E8D58B", "21K": "#D4AF37", "24K": "#A67C00" };
  const karatData = Array.from(karatMap.entries())
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([label, value]) => ({
      label,
      value,
      color: karatColors[label] || "#D4AF37"
    }));

  const avgTicketSize = salesCount > 0 ? totalRevenue / salesCount : 0;
  
  const goldPrice21k = dashboardSummary?.prices?.find(p => p.karat === 21)?.rate;

  return (
    <PageTransition>
      <PageHeader
        title={t("analytics.title")}
        description={t("analytics.subtitle")}
      />

      <div className="mb-6 flex space-x-2 space-x-reverse rounded-lg bg-surface-muted p-1 w-max shadow-sm border border-border/50">
        {(["today", "7d", "30d", "ytd"] as const).map((p) => {
          const labels: Record<string, string> = { today: "اليوم", "7d": "7 أيام", "30d": "30 يوم", ytd: "السنة" };
          const labelsEn: Record<string, string> = { today: "Today", "7d": "7 Days", "30d": "30 Days", ytd: "YTD" };
          const isActive = period === p;
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-300",
                isActive ? "bg-surface shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground hover:bg-surface/50 border border-transparent"
              )}
            >
              {locale.startsWith("ar") ? labels[p] : labelsEn[p]}
            </button>
          );
        })}
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-5 auto-rows-fr">
        <KpiCard
          label={locale.startsWith("ar") ? "إجمالي الإيرادات" : "Total Revenue"}
          value={formatMoney(totalRevenue, locale)}
          icon={Wallet}
          loading={isLoadingInvoices}
          accent
        />
        <KpiCard
          label={locale.startsWith("ar") ? "إجمالي الوزن المباع" : "Total Grams Sold"}
          value={formatWeight(totalGramsSold, locale)}
          icon={Scale}
          loading={isLoadingInvoices}
        />
        <KpiCard
          label={locale.startsWith("ar") ? "متوسط قيمة الفاتورة" : "Average Ticket Size"}
          value={formatMoney(avgTicketSize, locale)}
          icon={ArrowRightLeft}
          loading={isLoadingInvoices}
        />
        <KpiCard
          label={locale.startsWith("ar") ? "صافي مشتريات الكسر" : "Net Scrap Purchases"}
          value={formatMoney(totalScrapPurchases, locale)}
          icon={Coins}
          loading={isLoadingInvoices}
        />
        <KpiCard
          label={locale.startsWith("ar") ? "سعر الذهب الحالي (21K)" : "Current Gold Price (21K)"}
          value={goldPrice21k ? formatMoney(goldPrice21k, locale) : "—"}
          icon={Scale}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartContainer title={t("analytics.weightByKarat")} className="lg:col-span-1">
          {isLoadingInvoices ? (
            <div className="h-[320px] w-full flex flex-col justify-between animate-pulse rounded-xl bg-surface-muted" />
          ) : karatData.length === 0 ? (
            <div className="h-[320px] w-full flex flex-col items-center justify-center text-muted-foreground">
               <Scale className="size-10 mb-2 opacity-20" />
               <p>{locale.startsWith("ar") ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}</p>
            </div>
          ) : (
            <div className="relative h-[320px] w-full flex flex-col justify-between">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-[20px]">
                <span className="text-xs text-muted-foreground">{locale.startsWith("ar") ? "إجمالي الوزن" : "Total Weight"}</span>
                <span className="text-lg font-bold text-foreground">{formatWeight(totalGramsSold, locale)}</span>
              </div>
              <DonutChartWidget
                data={karatData}
                height={320}
                valueFormatter={(v) => formatWeight(v, locale)}
              />
            </div>
          )}
        </ChartContainer>

        <ChartContainer title={t("analytics.revenueTrend")} className="lg:col-span-2">
          {isLoadingInvoices ? (
            <div className="h-[320px] w-full flex flex-col justify-between animate-pulse rounded-xl bg-surface-muted" />
          ) : revenueData.length === 0 ? (
            <div className="h-[320px] w-full flex flex-col items-center justify-center text-muted-foreground">
               <Wallet className="size-10 mb-2 opacity-20" />
               <p>{locale.startsWith("ar") ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}</p>
            </div>
          ) : (
            <div className="h-[320px] w-full flex flex-col justify-between">
              <AreaChartWidget
                data={revenueData}
                height={320}
                valueFormatter={(v) => formatMoney(v, locale)}
              />
            </div>
          )}
        </ChartContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        <ChartContainer title={t("analytics.salesBreakdownByCategory")} className="lg:col-span-1">
          {isLoadingInvoices ? (
            <div className="h-[320px] w-full flex flex-col justify-between animate-pulse rounded-xl bg-surface-muted" />
          ) : categoryData.length === 0 ? (
            <div className="h-[320px] w-full flex flex-col items-center justify-center text-muted-foreground">
               <Scale className="size-10 mb-2 opacity-20" />
               <p>{locale.startsWith("ar") ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}</p>
            </div>
          ) : (
            <div className="h-[320px] w-full flex flex-col justify-between" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 80, left: 10, bottom: 20 }}>
                  <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", dy: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}g`} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", dx: -10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--color-accent)", radius: 6 }} contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", backgroundColor: "rgba(255, 255, 255, 0.95)", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", padding: "12px" }} formatter={(value: number) => [formatWeight(value, locale), locale.startsWith("ar") ? "الوزن" : "Weight"]} />
                  <Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={24}>
                    <LabelList dataKey="value" position="right" offset={10} formatter={(v: number) => formatWeight(v, locale)} style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} />
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartContainer>

        <ChartContainer title={t("analytics.salesVsScrap")} className="lg:col-span-2">
          {isLoadingInvoices ? (
            <div className="h-[320px] w-full flex flex-col justify-between animate-pulse rounded-xl bg-surface-muted" />
          ) : salesVsScrapData.length === 0 ? (
            <div className="h-[320px] w-full flex flex-col items-center justify-center text-muted-foreground">
               <ArrowRightLeft className="size-10 mb-2 opacity-20" />
               <p>{locale.startsWith("ar") ? "لا توجد بيانات لهذه الفترة" : "No data for this period"}</p>
            </div>
          ) : (
            <div className="h-[360px] w-full flex flex-col justify-between" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={salesVsScrapData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", dy: 5 }} axisLine={false} tickLine={false} padding={{ left: 10, right: 10 }} />
                  <YAxis width={70} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", dx: -6 }} axisLine={false} tickLine={false} domain={[0, (max: number) => niceRoundUp(max)]} tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + "K" : String(v)} />
                  <Tooltip cursor={false} contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", backgroundColor: "rgba(255, 255, 255, 0.95)", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", padding: "12px" }} formatter={(value: number) => formatMoney(value, locale)} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, paddingTop: "10px" }} />
                  {hoveredDateLabel ? (
                    <ReferenceArea
                      x1={hoveredDateLabel}
                      x2={hoveredDateLabel}
                      y1={0}
                      y2="dataMax + 10"
                      ifOverflow="extendDomain"
                      fill="rgba(212, 175, 55, 0.08)"
                    />
                  ) : null}
                  <Bar dataKey="sales" name={locale.startsWith("ar") ? "المبيعات" : "Sales"} fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="scrap" name={locale.startsWith("ar") ? "مشتريات كسر" : "Scrap"} fill="#1E293B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartContainer>
      </div>
    </PageTransition>
  );
}
