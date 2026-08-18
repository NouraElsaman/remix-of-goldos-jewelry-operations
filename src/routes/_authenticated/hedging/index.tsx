import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Handshake,
  Plus,
  Search,
  Trash2,
  Edit2,
  Scale,
  Coins,
  TrendingUp,
  Receipt,
  Building2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, KpiCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageTransition, StaggerGroup, StaggerItem } from "@/lib/motion";
import { useI18n } from "@/lib/i18n";
import { formatMoney, formatNumber, formatWeight } from "@/lib/format";
import { queryKeys, services } from "@/services";
import { getCurrentRole } from "@/lib/rbac";
import { canAccessRoute } from "@/lib/rbac";
import {
  fetchGoldCutsAsync,
  getGoldCuts,
  saveGoldCut,
  deleteGoldCut,
} from "@/lib/gold-cuts";
import type { GoldCut, GoldCutKarat } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/hedging/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/hedging")) {
      toast.error("غير مصرح لك بالوصول لهذه الصفحة | Unauthorized access");
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "القطع وتثبيت الأسعار — جوهرة تك" },
      {
        name: "description",
        content: "تسجيل وحساب عمليات قطع وتثبيت الذهب مع الشركات والتجار بالجرامات والأسعار.",
      },
    ],
  }),
  component: GoldCutsPage,
});

function GoldCutsPage() {
  const { locale } = useI18n();
  const queryClient = useQueryClient();

  // Queries
  const { data: goldCuts = [] } = useQuery({
    queryKey: ["goldCutsList"],
    queryFn: () => fetchGoldCutsAsync(),
    initialData: () => getGoldCuts(),
  });

  const { data: todayPrices } = useQuery({
    queryKey: queryKeys.goldPrices.today(),
    queryFn: () => services.goldPrices.today(),
  });

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [karatFilter, setKaratFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCut, setEditingCut] = useState<GoldCut | null>(null);

  // Local Datetime Helper
  const toLocalDatetimeInputValue = (dateInput?: string | Date): string => {
    const d = dateInput ? new Date(dateInput) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Form State
  const [traderName, setTraderName] = useState("");
  const [karat, setKarat] = useState<GoldCutKarat>(24);
  const [goldPrice, setGoldPrice] = useState<number | "">("");
  const [weightGrams, setWeightGrams] = useState<number | "">("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [createdAt, setCreatedAt] = useState<string>(() => toLocalDatetimeInputValue());
  const [isSaving, setIsSaving] = useState(false);

  // Suggested Traders
  const SUGGESTED_TRADERS = [
    "شركة Star",
    "شركة BTC",
    "شركة الرميزان",
    "شركة الأصالة",
    "مسبك الذهبي",
  ];

  // Helper to open modal for creation
  const handleOpenAddModal = () => {
    setEditingCut(null);
    setTraderName("");
    setKarat(24);
    
    // Auto-fill today's 24K rate
    const p24 = todayPrices?.find((p) => p.karat === 24)?.rate ?? 2350;
    setGoldPrice(p24);
    setWeightGrams("");
    setTotalAmount("");
    setNotes("");
    setCreatedAt(toLocalDatetimeInputValue());
    setIsModalOpen(true);
  };

  // Helper to open modal for editing
  const handleOpenEditModal = (cut: GoldCut) => {
    setEditingCut(cut);
    setTraderName(cut.traderName);
    setKarat(cut.karat);
    setGoldPrice(cut.goldPrice);
    setWeightGrams(cut.weightGrams);
    setTotalAmount(cut.totalAmount);
    setNotes(cut.notes || "");
    setCreatedAt(toLocalDatetimeInputValue(cut.createdAt));
    setIsModalOpen(true);
  };

  // Auto calculate total amount when price or weight changes
  const handleWeightOrPriceChange = (
    newWeight: number | "",
    newPrice: number | ""
  ) => {
    setWeightGrams(newWeight);
    setGoldPrice(newPrice);
    if (typeof newWeight === "number" && typeof newPrice === "number" && newWeight > 0 && newPrice > 0) {
      setTotalAmount(Math.round(newWeight * newPrice * 100) / 100);
    }
  };

  // Update rate when Karat changes
  const handleKaratChange = (newKarat: GoldCutKarat) => {
    setKarat(newKarat);
    const rate = todayPrices?.find((p) => p.karat === newKarat)?.rate;
    if (rate) {
      handleWeightOrPriceChange(weightGrams, rate);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traderName.trim()) {
      toast.error(locale === "ar" ? "يرجى أدخال اسم التاجر أو الشركة" : "Please enter trader name");
      return;
    }
    if (!goldPrice || Number(goldPrice) <= 0) {
      toast.error(locale === "ar" ? "يرجى أدخال سعر جرام الذهب" : "Please enter gold price");
      return;
    }
    if (!weightGrams || Number(weightGrams) <= 0) {
      toast.error(locale === "ar" ? "يرجى أدخال عدد الجرامات" : "Please enter weight in grams");
      return;
    }

    setIsSaving(true);
    try {
      await saveGoldCut({
        id: editingCut?.id,
        traderName,
        goldPrice: Number(goldPrice),
        weightGrams: Number(weightGrams),
        totalAmount: Number(totalAmount) || Number(weightGrams) * Number(goldPrice),
        karat,
        notes,
        createdAt: new Date(createdAt).toISOString(),
      });

      await queryClient.invalidateQueries({ queryKey: ["goldCutsList"] });

      toast.success(
        editingCut
          ? (locale === "ar" ? "تم تعديل عملية القطع بنجاح" : "Cut transaction updated")
          : (locale === "ar" ? "تم تسجيل عملية القطع بنجاح" : "Cut transaction saved")
      );
      setIsModalOpen(false);
    } catch (err) {
      toast.error(locale === "ar" ? "حدث خطأ أثناء حفظ التغييرات" : "Failed to save cut transaction");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string) => {
    if (!window.confirm(locale === "ar" ? "هل أنت تأكد من حذف عملية القطع هذه؟" : "Are you sure you want to delete this cut transaction?")) {
      return;
    }
    try {
      await deleteGoldCut(id);
      await queryClient.invalidateQueries({ queryKey: ["goldCutsList"] });
      toast.success(locale === "ar" ? "تم حذف عملية القطع بنجاح" : "Cut transaction deleted");
    } catch (err) {
      toast.error(locale === "ar" ? "حدث خطأ أثناء الحذف" : "Failed to delete cut transaction");
    }
  };

  // Filtered Cuts
  const filteredCuts = useMemo(() => {
    return goldCuts.filter((c) => {
      const matchesSearch =
        c.traderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesKarat = karatFilter === "all" || c.karat === Number(karatFilter);
      return matchesSearch && matchesKarat;
    });
  }, [goldCuts, searchTerm, karatFilter]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalGrams = filteredCuts.reduce((acc, c) => acc + c.weightGrams, 0);
    const totalValue = filteredCuts.reduce((acc, c) => acc + c.totalAmount, 0);
    const count = filteredCuts.length;
    return { totalGrams, totalValue, count };
  }, [filteredCuts]);

  return (
    <PageTransition>
      <PageHeader
        title={locale === "ar" ? "القطع وتثبيت أسعار الذهب" : "Gold Spot Cuts & Hedging"}
        description={
          locale === "ar"
            ? "إدارة وتسجيل صفقات تثبيت السعر والقطع المباشر بالجرامات مع الشركات والتجار"
            : "Record and manage gold spot cuts and price fixings with traders and refineries"
        }
        actions={
          <Button
            onClick={handleOpenAddModal}
            variant="gold"
            className="rounded-xl gap-2 font-semibold shadow-sm"
          >
            <Plus className="size-4" aria-hidden />
            {locale === "ar" ? "تسجيل عملية قطع جديدة" : "New Spot Cut"}
          </Button>
        }
      />

      {/* Summary KPI Section */}
      <StaggerGroup className="grid gap-4 sm:grid-cols-3 mb-6">
        <StaggerItem>
          <KpiCard
            label={locale === "ar" ? "إجمالي الجرامات المقطوعة" : "Total Grams Cut"}
            value={formatWeight(summary.totalGrams, locale)}
            icon={Scale}
            accent
          />
        </StaggerItem>

        <StaggerItem>
          <KpiCard
            label={locale === "ar" ? "إجمالي قيم القطع" : "Total Amount Cut"}
            value={formatMoney(summary.totalValue, locale)}
            icon={Coins}
          />
        </StaggerItem>

        <StaggerItem>
          <KpiCard
            label={locale === "ar" ? "عدد صفقات القطع" : "Total Spot Cut Deals"}
            value={formatNumber(summary.count, locale)}
            icon={Receipt}
          />
        </StaggerItem>
      </StaggerGroup>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 bg-surface p-4 border border-border rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={locale === "ar" ? "البحث باسم التاجر أو الشركة..." : "Search trader or company name..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-9 rounded-xl border-border/80"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {locale === "ar" ? "العيار:" : "Karat:"}
          </span>
          {(["all", "24", "21", "18"] as const).map((k) => (
            <Button
              key={k}
              variant={karatFilter === k ? "gold" : "outline"}
              size="sm"
              onClick={() => setKaratFilter(k)}
              className="rounded-xl text-xs px-3"
            >
              {k === "all" ? (locale === "ar" ? "الكل" : "All") : `${k}K`}
            </Button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-surface-muted border-b border-border text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3.5 text-start">{locale === "ar" ? "التاريخ والوقت" : "Date & Time"}</th>
                <th className="px-5 py-3.5 text-start">{locale === "ar" ? "الشركة / التاجر" : "Trader / Company"}</th>
                <th className="px-5 py-3.5 text-start">{locale === "ar" ? "العيار" : "Karat"}</th>
                <th className="px-5 py-3.5 text-start">{locale === "ar" ? "عدد الجرامات" : "Weight (Grams)"}</th>
                <th className="px-5 py-3.5 text-start">{locale === "ar" ? "سعر القطع للجرام" : "Cut Price / Gram"}</th>
                <th className="px-5 py-3.5 text-start">{locale === "ar" ? "المبلغ الإجمالي" : "Total Amount"}</th>
                <th className="px-5 py-3.5 text-end">{locale === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCuts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    {locale === "ar" ? "لا توجد صفقات قطع مسجلة حالياً" : "No spot cuts registered yet"}
                  </td>
                </tr>
              ) : (
                filteredCuts.map((cut) => (
                  <tr key={cut.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <span>
                          {new Date(cut.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-amber-500" />
                        <span>{cut.traderName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                        {cut.karat}K
                      </Badge>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono font-semibold text-foreground">
                      {formatWeight(cut.weightGrams, locale)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-muted-foreground">
                      {formatMoney(cut.goldPrice, locale)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(cut.totalAmount, locale)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-end space-x-2 space-x-reverse">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditModal(cut)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cut.id)}
                        className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Gold Cut Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">
                {editingCut
                  ? (locale === "ar" ? "تعديل عملية قطع" : "Edit Gold Spot Cut")
                  : (locale === "ar" ? "تسجيل عملية قطع جديدة مع تاجر" : "Register New Gold Spot Cut")}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Trader Name */}
              <div className="space-y-1.5">
                <Label htmlFor="trader-name">
                  {locale === "ar" ? "اسم الشركة أو التاجر" : "Trader or Company Name"} *
                </Label>
                <Input
                  id="trader-name"
                  required
                  placeholder={locale === "ar" ? "مثال: شركة Star أو تاجر الأمل" : "e.g. Star Gold Co."}
                  value={traderName}
                  onChange={(e) => setTraderName(e.target.value)}
                  className="rounded-xl"
                />
                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED_TRADERS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setTraderName(name)}
                      className="text-[11px] bg-surface-muted hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full transition-colors border border-border/50"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Karat Selection (Restricted to 24, 21, 18) */}
              <div className="space-y-1.5">
                <Label>{locale === "ar" ? "العيار المعياري" : "Standard Karat"} *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([24, 21, 18] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      variant={karat === k ? "gold" : "outline"}
                      onClick={() => handleKaratChange(k)}
                      className="rounded-xl font-bold py-2"
                    >
                      {k}K
                    </Button>
                  ))}
                </div>
              </div>

              {/* Gold Price & Weight in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gold-price">
                    {locale === "ar" ? `سعر الذهب (${karat}K)` : `Gold Price (${karat}K)`} *
                  </Label>
                  <Input
                    id="gold-price"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={goldPrice}
                    onChange={(e) =>
                      handleWeightOrPriceChange(
                        weightGrams,
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="weight-grams">
                    {locale === "ar" ? "عدد الجرامات (الوزن)" : "Weight (Grams)"} *
                  </Label>
                  <Input
                    id="weight-grams"
                    type="number"
                    step="0.01"
                    required
                    placeholder="100.00"
                    value={weightGrams}
                    onChange={(e) =>
                      handleWeightOrPriceChange(
                        e.target.value === "" ? "" : Number(e.target.value),
                        goldPrice
                      )
                    }
                    className="rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Calculated Total Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="total-amount">
                  {locale === "ar" ? "المبلغ الإجمالي (ج.م)" : "Total Amount (EGP)"} *
                </Label>
                <Input
                  id="total-amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="rounded-xl font-mono font-bold text-emerald-600 text-base"
                />
              </div>

              {/* Date & Time */}
              <div className="space-y-1.5">
                <Label htmlFor="created-at">
                  {locale === "ar" ? "تاريخ ووقت القطع" : "Date & Time"}
                </Label>
                <Input
                  id="created-at"
                  type="datetime-local"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  className="rounded-xl font-mono"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">{locale === "ar" ? "ملاحظات إضافية" : "Notes"}</Label>
                <Input
                  id="notes"
                  placeholder={locale === "ar" ? "ملاحظات حول طريقة السداد أو التسليم..." : "Optional notes..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl h-11"
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  disabled={isSaving}
                  className="rounded-xl h-11 font-bold"
                >
                  {isSaving
                    ? (locale === "ar" ? "جاري الحفظ..." : "Saving...")
                    : (locale === "ar" ? "حفظ عملية القطع" : "Save Cut")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
