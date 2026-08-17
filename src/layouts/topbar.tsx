import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase/supabase-provider";
import { Bell, Coins, LogOut, Search, Settings, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getInitials, updateUserProfile } from "@/lib/auth";
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
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem("goldos_auth_token");
    localStorage.removeItem("goldos_user_role");
    localStorage.removeItem("goldos_current_user");
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

  // Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleOpenProfileModal = () => {
    if (user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
      setProfilePassword("");
      setProfileConfirmPassword("");
    }
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      toast.error(
        locale === "ar"
          ? "يرجى تعبئة الاسم والبريد الإلكتروني"
          : "Please fill in name and email",
      );
      return;
    }

    if (profilePassword && profilePassword !== profileConfirmPassword) {
      toast.error(
        locale === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
      );
      return;
    }

    if (profilePassword && profilePassword.length < 4) {
      toast.error(
        locale === "ar"
          ? "كلمة المرور يجب أن تكون 4 خانات على الأقل"
          : "Password must be at least 4 characters",
      );
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateUserProfile({
        name: profileName,
        email: profileEmail,
        ...(profilePassword ? { password: profilePassword } : {}),
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.currentUser(),
      });

      toast.success(
        locale === "ar"
          ? "تم تحديث بيانات الحساب بنجاح!"
          : "Account details updated successfully!",
      );
      setIsProfileModalOpen(false);
    } catch (err) {
      toast.error(
        locale === "ar" ? "حدث خطأ أثناء حفظ البيانات" : "Failed to update profile",
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    const subscription = supabase
      .channel("invoices-topbar-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "invoices" },
        () => setHasUnread(true),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {storeName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {headline ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                <Coins className="size-3.5 text-amber-500" aria-hidden />
                <span>22K:</span>
                <span className="font-mono">{formatMoney(headline.rate)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {locale === "ar"
                ? `سعر جرام الذهب عيار 22 اليوم (${headline.source ?? "محدث"})`
                : `Gold 22K rate per gram today (${headline.source ?? "updated"})`}
            </TooltipContent>
          </Tooltip>
        ) : null}

        <Button
          variant="outline"
          onClick={onOpenCommandPalette}
          className="h-9 w-9 p-0 md:w-auto md:px-3 text-muted-foreground rounded-xl gap-2 justify-start"
          aria-label={t("topbar.search")}
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="hidden text-xs md:inline">{t("topbar.search")}</span>
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("topbar.notifications")}
              className="relative size-9 rounded-xl"
              onClick={() => setHasUnread(false)}
            >
              <Bell className="size-4" aria-hidden />
              {hasUnread ? (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
              {locale === "ar" ? "أحدث التنبيهات والفواتير" : "Recent Invoices & Alerts"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentInvoices.length > 0 ? (
              recentInvoices.map((inv) => (
                <DropdownMenuItem
                  key={inv.id}
                  className="flex flex-col items-start gap-1 p-2 cursor-pointer"
                  onClick={() => navigate({ to: "/cashier" })}
                >
                  <div className="flex w-full items-center justify-between text-xs font-semibold">
                    <span>{inv.invoiceNumber}</span>
                    <span className="text-emerald-600">{formatMoney(inv.finalTotal)}</span>
                  </div>
                  <div className="flex w-full items-center justify-between text-[10px] text-muted-foreground">
                    <span>{inv.customerName || (locale === "ar" ? "عميل نقدي" : "Cash Customer")}</span>
                    <span>{new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {locale === "ar" ? "لا توجد إشعارات جديدة" : "No new notifications"}
              </div>
            )}
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
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="text-sm font-medium">{user?.name ?? "—"}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {user?.email ?? "—"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenProfileModal}>
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

      {/* ────────────────── PROFILE / ACCOUNT EDIT MODAL ────────────────── */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-foreground">
                {locale === "ar" ? "تعديل بيانات الحساب" : "Edit Account Details"}
              </h2>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prof-name">{locale === "ar" ? "اسم الحساب" : "Account Name"}</Label>
                <Input
                  id="prof-name"
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-email">{locale === "ar" ? "البريد الإلكتروني" : "Email Address"}</Label>
                <Input
                  id="prof-email"
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-pass">{locale === "ar" ? "كلمة المرور الجديدة (اختياري)" : "New Password (Optional)"}</Label>
                <Input
                  id="prof-pass"
                  type="password"
                  placeholder="••••••••"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  dir="ltr"
                />
              </div>

              {profilePassword ? (
                <div className="space-y-1.5">
                  <Label htmlFor="prof-confirm">{locale === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}</Label>
                  <Input
                    id="prof-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={profileConfirmPassword}
                    onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    dir="ltr"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="rounded-xl h-11"
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  disabled={isUpdatingProfile}
                  className="rounded-xl h-11"
                >
                  {isUpdatingProfile
                    ? (locale === "ar" ? "جاري الحفظ..." : "Saving...")
                    : (locale === "ar" ? "حفظ التغييرات" : "Save Changes")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
