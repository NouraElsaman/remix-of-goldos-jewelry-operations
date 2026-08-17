import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/supabase-provider";
import { Bell, Coins, LogOut, Search, Settings, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { LOCALES, localeMeta } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { queryKeys, services } from "@/services";
import { getCurrentRole } from "@/lib/rbac";
import { getInitials, getCurrentUser } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import type { UserRole } from "@/types/domain";

function RoleBadge({ role }: { role: UserRole | null }) {
  if (!role) return null;
  const config = {
    owner: {
      label: "مالك",
      icon: "👑",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    cashier: {
      label: "كاشير",
      icon: "💰",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    inventory_manager: {
      label: "مسؤول المخزون",
      icon: "📦",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
  };
  const b = config[role];
  return (
    <div
      className={cn(
        "hidden md:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        b.className,
      )}
    >
      <span>{b.icon}</span>
      <span>{b.label}</span>
    </div>
  );
}

/** Global top bar: shop identity, live gold chip, search, alerts, locale, profile. */
export function Topbar({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette: () => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("goldos_auth_token");
    localStorage.removeItem("goldos_user_role");
    navigate({ to: "/login" });
  };

  const { data: prices } = useQuery({
    queryKey: queryKeys.goldPrices.today(),
    queryFn: () => services.goldPrices.today(),
  });
  const { data: user } = useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: () => services.auth.currentUser(),
  });
  const currentUser = user || getCurrentUser();
  const { data: shopSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => services.settings.get(),
  });
  const storeName =
    (locale === "ar" ? shopSettings?.shopNameAr : shopSettings?.shopName) ?? "";

  const headline = prices?.find((price) => price.karat === 22) ?? prices?.[0];
  const role = getCurrentRole();

  const { data: invoicesPage } = useQuery({
    queryKey: queryKeys.sales.invoices({ pageSize: 5 }),
    queryFn: () => services.sales.listInvoices({ pageSize: 5 }),
  });
  const recentInvoices = invoicesPage?.items ?? [];

  const [hasUnread, setHasUnread] = useState(true);

  useEffect(() => {
    const subscription = supabase
      .channel("invoices-topbar-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "invoices" },
        () => {
          setHasUnread(true);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-6">
      <SidebarTrigger className="size-9 rounded-xl" />
      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      {storeName ? (
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            {storeName}
          </p>
        </div>
      ) : null}

      {headline ? (
        <span className="ms-1 inline-flex shrink-0 items-center gap-2 rounded-full border border-gold/40 bg-gold-soft px-2.5 py-1.5 text-xs font-medium text-gold-foreground">
          <Coins className="size-3.5 text-gold-deep" aria-hidden />
          <span data-numeric dir="ltr">
            {headline.karat}K · {formatMoney(headline.rate, locale)}
          </span>
        </span>
      ) : null}

      <div className="ms-auto flex min-w-0 items-center gap-1 sm:gap-1.5">
        <Button
          variant="outline"
          onClick={onOpenCommandPalette}
          className="h-9 gap-2 rounded-xl border-border bg-surface px-3 text-muted-foreground shadow-hairline hover:text-foreground"
        >
          <Search className="size-4" aria-hidden />
          <span className="hidden text-xs md:inline">{t("topbar.search")}</span>
        </Button>

        <DropdownMenu onOpenChange={(open) => { if (open) setHasUnread(false); }}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("topbar.notifications")}
              className="relative size-9 rounded-xl focus-visible:ring-0"
            >
              <Bell className="size-4" aria-hidden />
              {hasUnread && (
                <span className="absolute end-2 top-2 size-1.5 rounded-full bg-gold" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl p-2 shadow-lg border-border bg-popover">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-xs font-bold text-foreground">
                {locale === "ar" ? "الإشعارات" : "Notifications"}
              </span>
              {hasUnread && (
                <span className="text-[9px] bg-gold-soft text-gold-deep px-1.5 py-0.5 rounded-full font-bold">
                  {locale === "ar" ? "جديد" : "New"}
                </span>
              )}
            </div>
            <div className="py-1 max-h-[300px] overflow-y-auto">
              {recentInvoices.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {locale === "ar" ? "لا توجد إشعارات حالية" : "No new notifications"}
                </div>
              ) : (
                recentInvoices.map((inv) => (
                  <DropdownMenuItem
                    key={inv.id}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-lg focus:bg-accent/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-foreground">
                        {inv.transactionType === "sale" 
                          ? (locale === "ar" ? "عملية بيع جديدة" : "New Sale")
                          : (locale === "ar" ? "شراء ذهب كسر" : "Old Gold Purchase")}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        #{inv.number.slice(-6)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {locale === "ar" 
                        ? `تم تسجيل عملية بمبلغ ${Number(inv.total).toLocaleString()} ج.م`
                        : `Registered transaction of ${Number(inv.total).toLocaleString()} EGP`}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          aria-label={t("topbar.language")}
          className="h-9 rounded-xl px-3 text-xs font-medium"
        >
          {LOCALES.filter((item) => item !== locale).map(
            (item) => localeMeta[item].label,
          )}
        </Button>

        <Separator
          orientation="vertical"
          className="mx-1 h-5 hidden md:block"
        />
        <RoleBadge role={role} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("topbar.profile")}
              className="size-9 rounded-xl"
            >
              <Avatar className="size-8 border border-border">
                <AvatarFallback className="bg-surface-muted text-xs font-semibold text-foreground">
                  {getInitials(currentUser?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="text-sm font-medium">{currentUser?.name || "—"}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {currentUser?.email || "—"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings", search: { tab: "security" } })}>
              <User className="size-4" aria-hidden />
              {t("topbar.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/settings", search: { tab: "store" } })}>
              <Settings className="size-4" aria-hidden />
              {t("nav.settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="size-4" aria-hidden />
              {t("topbar.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
