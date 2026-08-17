import type { LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Coins,
  FileText,
  Handshake,
  LayoutDashboard,
  Package,
  Scale,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n";

export type NavItem = {
  /** Router path — must match an existing route file. */
  to: NonNullable<LinkProps["to"]>;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Shown in the command palette. */
  shortcut?: string;
};

export type NavGroup = {
  id: "daily" | "insights" | "admin";
  labelKey: TranslationKey;
  items: NavItem[];
};

/**
 * Navigation order mirrors the real daily workflow of the shop:
 * start of day -> the all-day screen -> stock work -> rate -> end of day,
 * then analysis, then administration.
 */
export const navigation: NavGroup[] = [
  {
    id: "daily",
    labelKey: "nav.group.daily",
    items: [
      { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      {
        to: "/cashier",
        labelKey: "nav.cashier",
        icon: ShoppingCart,
        shortcut: "N",
      },
      {
        to: "/inventory",
        labelKey: "nav.inventory",
        icon: Package,
        shortcut: "I",
      },
      { to: "/gold-prices", labelKey: "nav.goldPrices", icon: Coins },
      { to: "/reconciliation", labelKey: "nav.reconciliation", icon: Scale },
      { to: "/hedging", labelKey: "nav.hedging", icon: Handshake },
    ],
  },
  {
    id: "insights",
    labelKey: "nav.group.insights",
    items: [
      { to: "/reports", labelKey: "nav.reports", icon: FileText },
      { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
    ],
  },
  {
    id: "admin",
    labelKey: "nav.group.admin",
    items: [
      { to: "/users", labelKey: "nav.users", icon: Users },
      { to: "/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

export const flatNavigation: NavItem[] = navigation.flatMap(
  (group) => group.items,
);

export function findNavItem(pathname: string): NavItem | undefined {
  return flatNavigation.find((item) => pathname.startsWith(item.to));
}
