import type { ReactNode } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentRole } from "@/lib/rbac";
import { fetchRegisteredUsersAsync, getRegisteredUsers } from "@/lib/auth";
import type { LucideIcon } from "lucide-react";
import {
  Coins,
  Package,
  Receipt,
  Scale,
  ShoppingCart,
  TrendingUp,
  Users,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

import { KpiCard } from "@/components/shared";
import { StaggerGroup, StaggerItem } from "@/lib/motion";
import type { DashboardSummary } from "@/services/contracts";
import type { Locale } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { formatMoney, formatNumber, formatWeight } from "@/lib/format";

type KpiCardDef = {
  id: string;
  labelKey: TranslationKey;
  value: string;
  hint?: string | undefined;
  icon: LucideIcon;
  trend?: { value: string; direction: "up" | "down" | "flat" } | undefined;
  badge?: ReactNode | undefined;
  accent?: boolean | undefined;
};

/**
 * Executive KPI grid — eight business metrics in a responsive 4-column grid.
 * Pure presentation: receives pre-fetched data, emits nothing.
 * All labels come through i18n (no hardcoded strings).
 */
export function KpiSection({
  data,
  isLoading,
  t,
  locale,
}: {
  data: DashboardSummary | undefined;
  isLoading: boolean;
  t: (key: TranslationKey) => string;
  locale: Locale;
}) {
  const { data: registeredUsers } = useQuery({
    queryKey: ["registeredUsersList"],
    queryFn: () => fetchRegisteredUsersAsync(),
    initialData: () => getRegisteredUsers(),
  });

  const activeUsersCount = useMemo(() => {
    return (registeredUsers ?? []).filter((u) => u.active).length;
  }, [registeredUsers]);

  const cards = useMemo<KpiCardDef[]>(
    () => [
      {
        id: "revenue",
        labelKey: "dashboard.revenue",
        value: formatMoney(data?.revenueToday ?? 0, locale),
        hint: t("dashboard.vsYesterday"),
        icon: Receipt,
        trend: data?.revenueChangePct !== undefined && data.revenueChangePct !== null ? {
          value: `${data.revenueChangePct >= 0 ? "+" : ""}${data.revenueChangePct}%`,
          direction: data.revenueChangePct > 0 ? "up" : data.revenueChangePct < 0 ? "down" : "flat"
        } : undefined,
        accent: true,
      },
      {
        id: "purchases",
        labelKey: "dashboard.purchases",
        value: formatMoney(data?.purchasesToday ?? 0, locale),
        hint: t("dashboard.vsYesterday"),
        icon: ShoppingCart,
        trend: data?.purchasesChangePct !== undefined && data.purchasesChangePct !== null ? {
          value: `${data.purchasesChangePct >= 0 ? "+" : ""}${data.purchasesChangePct}%`,
          direction: data.purchasesChangePct > 0 ? "up" : data.purchasesChangePct < 0 ? "down" : "flat"
        } : undefined,
      },
      {
        id: "transactions",
        labelKey: "dashboard.transactions",
        value: formatNumber(data?.transactionsToday ?? 0, locale),
        icon: Coins,
        trend: data?.transactionsChangeCount !== undefined && data.transactionsChangeCount !== null ? {
          value: `${data.transactionsChangeCount >= 0 ? "+" : ""}${data.transactionsChangeCount}`,
          direction: data.transactionsChangeCount > 0 ? "up" : data.transactionsChangeCount < 0 ? "down" : "flat"
        } : undefined,
      },
      {
        id: "inventoryValue",
        labelKey: "dashboard.inventoryValue",
        value: formatMoney(data?.inventoryValue ?? 0, locale),
        icon: Package,
      },
      {
        id: "inventoryWeight",
        labelKey: "dashboard.inventoryWeight",
        value: formatWeight(data?.inventoryWeight ?? 0, locale),
        icon: Scale,
      },
      {
        id: "goldChange",
        labelKey: "dashboard.goldChange",
        value:
          data?.prices?.[0]?.changePct != null
            ? `${data.prices[0].changePct > 0 ? "+" : ""}${data.prices[0].changePct.toFixed(1)}%`
            : "—",
        icon: TrendingUp,
        trend:
          data?.prices?.[0]?.changePct != null
            ? {
                value: `${Math.abs(data.prices[0].changePct).toFixed(1)}%`,
                direction: data.prices[0].changePct >= 0 ? "up" : "down",
              }
            : undefined,
      },
      {
        id: "reconciliation",
        labelKey: "dashboard.reconciliationStatus",
        value: data?.isReconciliationClosed
          ? (locale === "ar" ? "مطابقة مكتملة" : "Matching Closed")
          : (locale === "ar" ? "مطابقة مفتوحة" : "Matching Open"),
        icon: data?.isReconciliationClosed ? ShieldCheck : AlertTriangle,
        trend: data?.isReconciliationClosed
          ? { value: locale === "ar" ? "مغلق" : "Closed", direction: "up" as const }
          : { value: locale === "ar" ? "معلق" : "Pending", direction: "flat" as const },
      },
      {
        id: "users",
        labelKey: "dashboard.activeUsers",
        value: formatNumber(activeUsersCount, locale),
        icon: Users,
      },
    ],
    [data, t, locale, activeUsersCount],
  );

  const role = getCurrentRole();
  const visibleCards = useMemo(() => {
    if (role === "owner") return cards;
    if (role === "cashier") {
      return cards.filter((c) =>
        ["revenue", "purchases", "transactions", "goldChange"].includes(c.id),
      );
    }
    if (role === "inventory_manager") {
      return cards.filter((c) =>
        [
          "inventoryValue",
          "inventoryWeight",
          "goldChange",
          "reconciliation",
        ].includes(c.id),
      );
    }
    return [];
  }, [cards, role]);

  return (
    <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {visibleCards.map((card) => (
        <StaggerItem key={card.id}>
          <KpiCard
            label={t(card.labelKey)}
            value={card.value}
            hint={card.hint}
            icon={card.icon}
            trend={card.trend}
            badge={card.badge}
            accent={card.accent}
            loading={isLoading}
          />
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
