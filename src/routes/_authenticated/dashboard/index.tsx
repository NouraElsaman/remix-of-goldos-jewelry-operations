import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/services/supabase/supabase-provider";

import { PageHeader } from "@/components/shared";
import { PageTransition } from "@/lib/motion";
import { useI18n } from "@/lib/i18n";
import { queryKeys, services } from "@/services";

// Feature components — each owns one section of the dashboard
import { KpiSection } from "@/features/dashboard/kpi-section";
import { GoldPricePanel } from "@/features/dashboard/gold-price-panel";
import { ChartSection } from "@/features/dashboard/chart-section";
import { ActivitySection } from "@/features/dashboard/activity-section";
import { AlertsSection } from "@/features/dashboard/alerts-section";
import { RecentTransactionsSection } from "@/features/dashboard/recent-transactions-section";
import { QuickActionsSection } from "@/features/dashboard/quick-actions-section";
import { SystemHealthSection } from "@/features/dashboard/system-health-section";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/dashboard")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "لوحة التحكم — جوهرة تك" },
      {
        name: "description",
        content:
          "نظرة عامة يومية على أسعار الذهب، الإيرادات، قيمة المخزون وحركة المحل.",
      },
      { property: "og:title", content: "لوحة التحكم — جوهرة تك" },
      {
        property: "og:description",
        content:
          "Daily overview of gold prices, revenue, inventory value and shop activity.",
      },
    ],
  }),
  component: DashboardPage,
});

/**
 * Dashboard route — the single orchestration layer for /dashboard.
 */
function DashboardPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabase
      .channel("invoices-dashboard-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "invoices" },
        (payload) => {
          const newInvoice = payload.new;
          const typeLabel = newInvoice["transaction_type"] === "sale" ? "بيع جديدة" : "شراء ذهب كسر";
          
          toast.info(
            locale === "ar"
              ? `🔔 تم تسجيل عملية ${typeLabel} بمبلغ ${Number(newInvoice["final_total"]).toLocaleString()} ج.م`
              : `🔔 New ${newInvoice["transaction_type"]} of ${Number(newInvoice["final_total"]).toLocaleString()} EGP registered`,
            {
              duration: 5000,
            }
          );

          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
          void queryClient.invalidateQueries({ queryKey: queryKeys.sales.invoices({ pageSize: 5 }) });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [queryClient, locale]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => services.dashboard.summary(),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: queryKeys.analytics.summary(),
    queryFn: () => services.analytics.summary(),
  });

  const { data: invoicesPage, isLoading: invoicesLoading } = useQuery({
    queryKey: queryKeys.sales.invoices({ pageSize: 5 }),
    queryFn: () => services.sales.listInvoices({ pageSize: 5 }),
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const prices = dashboard?.prices ?? [];
  const activity = dashboard?.recentActivity ?? [];
  const alerts = dashboard?.alerts ?? [];
  const invoices = invoicesPage?.items ?? [];

  return (
    <PageTransition>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.subtitle")}
      />

      {/* ── Section 1: Executive KPIs ─────────────────────────────────────── */}
      <KpiSection
        data={dashboard}
        isLoading={dashLoading}
        t={t}
        locale={locale}
      />

      {/* ── Section 2: Gold Prices ────────────────────────────────────────── */}
      <GoldPricePanel
        prices={prices}
        isLoading={dashLoading}
        isLive={false}
        lastUpdated={dashboard?.prices?.[0]?.date}
        title={t("dashboard.goldToday")}
        description={t("goldPrices.subtitle")}
        locale={locale}
      />

      {/* ── Section 3: Charts ─────────────────────────────────────────────── */}
      <ChartSection
        analytics={analytics}
        isLoading={analyticsLoading}
        t={t}
        locale={locale}
        revenueChangePct={dashboard?.revenueChangePct ?? null}
      />

      {/* ── Section 4: Activity + Alerts (side-by-side on large screens) ──── */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        {/* Activity timeline — 2/3 width */}
        <div className="min-w-0 lg:col-span-2">
          <ActivitySection
            events={activity}
            isLoading={dashLoading}
            t={t}
            locale={locale}
          />
        </div>

        {/* Alerts panel — 1/3 width */}
        <AlertsSection
          alerts={alerts}
          isLoading={dashLoading}
          t={t}
          locale={locale}
        />
      </div>

      {/* ── Section 5: Recent Transactions ───────────────────────────────── */}
      <RecentTransactionsSection
        invoices={invoices}
        isLoading={invoicesLoading}
        t={t}
        locale={locale}
        title={t("dashboard.recentTransactions")}
      />

      {/* ── Section 6: Quick Actions + System Health ─────────────────────── */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <QuickActionsSection t={t} title={t("dashboard.quickActions")} />
        <SystemHealthSection t={t} title={t("dashboard.systemHealth")} />
      </div>
    </PageTransition>
  );
}
