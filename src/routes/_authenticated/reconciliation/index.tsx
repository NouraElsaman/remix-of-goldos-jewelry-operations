import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Lock, Loader2, Scale, FileText } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

import {
  DataTable,
  PageHeader,
  StatusBadge,
  TableContainer,
  EODOwnerReportModal,
  type DataTableColumn,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWeight, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import { queryKeys, services } from "@/services";
import {
  compileEODReport,
  sendEODReportEmail,
  type EODReportMetrics,
} from "@/services/eod-report";
import type { ReconciliationRow } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/reconciliation/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/reconciliation")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "مطابقة الأوزان والعهدة — جوهرة تك" },
      {
        name: "description",
        content: "مطابقة الأوزان وإغلاق اليوم الفعلي لمحلات الذهب.",
      },
      { property: "og:title", content: "مطابقة الأوزان والعهدة — جوهرة تك" },
      {
        property: "og:description",
        content:
          "Close the day by comparing expected and counted gold weight per karat.",
      },
    ],
  }),
  component: ReconciliationPage,
});

function ReconciliationPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.reconciliation.currentDay(),
    queryFn: () => services.reconciliation.currentDay(),
  });

  const { data: dashboardSummary } = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => services.dashboard.summary(),
  });

  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [eodMetrics, setEodMetrics] = useState<EODReportMetrics | null>(null);
  const [isCompilingReport, setIsCompilingReport] = useState(false);

  // Counted weight input states
  const [counted18, setCounted18] = useState("");
  const [counted21, setCounted21] = useState("");
  const [counted24, setCounted24] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [openingCash, setOpeningCash] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dateStr = new Date().toISOString().slice(0, 10);
      try {
        const stored = localStorage.getItem(`goldos_cash_drawer_${dateStr}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.opening !== undefined) setOpeningCash(String(parsed.opening));
          if (parsed.actual !== undefined) setActualCash(String(parsed.actual));
        }
      } catch (e) {
        console.warn("Failed to load cash drawer state", e);
      }
    }
  }, []);

  const submitMutation = useMutation({
    mutationFn: async (inputs: { karat: number; counted: number }[]) => {
      for (const input of inputs) {
        await services.reconciliation.submitCounted(input.karat, input.counted);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.currentDay() });
      toast.success(
        locale === "ar" ? "تم إغلاق اليوم ومطابقة الأوزان بنجاح!" : "Day closed and weights reconciled successfully!"
      );
      setIsClosingModalOpen(false);
      setCounted18("");
      setCounted21("");
      setCounted24("");

      // Compile EOD Report & automatically send email immediately upon closing
      try {
        const metrics = await compileEODReport();
        setEodMetrics(metrics);
        const emailRes = await sendEODReportEmail(metrics);
        if (emailRes.success) {
          toast.success(emailRes.message);
        }
      } catch (err) {
        console.error("Error generating/sending EOD report:", err);
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error(
        locale === "ar" ? "فشل إغلاق اليوم ومطابقة الأوزان" : "Failed to close the day and reconcile weights"
      );
    },
  });

  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [opening18, setOpening18] = useState("");
  const [opening21, setOpening21] = useState("");
  const [opening24, setOpening24] = useState("");

  const updateOpeningMutation = useMutation({
    mutationFn: async (inputs: { karat: number; weight: number }[]) => {
      await services.reconciliation.updateOpeningWeights(inputs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.currentDay() });
      toast.success(
        locale === "ar" ? "تم تعديل الأوزان الافتتاحية بنجاح!" : "Opening weights updated successfully!"
      );
      setIsOpeningModalOpen(false);
    },
    onError: (err) => {
      console.error(err);
      toast.error(
        locale === "ar" ? "فشل تعديل الأوزان الافتتاحية" : "Failed to update opening weights"
      );
    }
  });

  const handleUpdateOpeningSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const o18 = parseFloat(opening18);
    const o21 = parseFloat(opening21);
    const o24 = parseFloat(opening24);

    if (isNaN(o18) || isNaN(o21) || isNaN(o24)) {
      toast.error(
        locale === "ar" ? "يرجى إدخال الأوزان لجميع الأعيرة" : "Please enter weights for all karats"
      );
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const existingStr = localStorage.getItem(`goldos_cash_drawer_${dateStr}`);
    const existing = existingStr ? JSON.parse(existingStr) : {};
    existing.opening = parseFloat(openingCash) || 0;
    localStorage.setItem(`goldos_cash_drawer_${dateStr}`, JSON.stringify(existing));

    updateOpeningMutation.mutate([
      { karat: 18, weight: o18 },
      { karat: 21, weight: o21 },
      { karat: 24, weight: o24 },
    ]);
  };

  const reopenMutation = useMutation({
    mutationFn: () => services.reconciliation.reopenToday(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.currentDay() });
      toast.success(
        locale === "ar" ? "تم إعادة فتح اليوم لمطابقة الأوزان!" : "Day re-opened for weight reconciliation!"
      );
    },
    onError: (err) => {
      console.error(err);
      toast.error(
        locale === "ar" ? "فشل إعادة فتح اليوم" : "Failed to re-open day"
      );
    }
  });

  const handleCloseDaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c18 = parseFloat(counted18);
    const c21 = parseFloat(counted21);
    const c24 = parseFloat(counted24);

    if (isNaN(c18) || isNaN(c21) || isNaN(c24)) {
      toast.error(
        locale === "ar" ? "يرجى إدخال الأوزان الفعلية لجميع الأعيرة" : "Please enter counted weights for all karats"
      );
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const existingStr = localStorage.getItem(`goldos_cash_drawer_${dateStr}`);
    const existing = existingStr ? JSON.parse(existingStr) : {};
    existing.actual = parseFloat(actualCash) || 0;
    localStorage.setItem(`goldos_cash_drawer_${dateStr}`, JSON.stringify(existing));

    submitMutation.mutate([
      { karat: 18, counted: c18 },
      { karat: 21, counted: c21 },
      { karat: 24, counted: c24 },
    ]);
  };

  const handleOpenOwnerReportOnDemand = async () => {
    setIsCompilingReport(true);
    try {
      const metrics = await compileEODReport();
      setEodMetrics(metrics);
    } catch (err) {
      console.error(err);
      toast.error(locale === "ar" ? "فشل إعداد تقرير اليوم" : "Failed to generate report");
    } finally {
      setIsCompilingReport(false);
    }
  };

  const isAlreadyClosed = data.length > 0 && data.every((row) => row.status === "closed");

  const columns = useMemo<DataTableColumn<ReconciliationRow>[]>(
    () => [
      {
        id: "karat",
        header: t("common.karat"),
        cell: (row) => `${row.karat}K`,
      },
      {
        id: "opening",
        header: locale === "ar" ? "الوزن الافتتاحي (جم)" : "Opening (g)",
        cell: (row) => formatWeight(row.opening, locale),
        numeric: true,
      },
      {
        id: "received",
        header: locale === "ar" ? "المستلم/الشراء (جم)" : "Received (g)",
        cell: (row) => formatWeight(row.received, locale),
        numeric: true,
      },
      {
        id: "sold",
        header: locale === "ar" ? "المباع (جم)" : "Sold (g)",
        cell: (row) => formatWeight(row.sold, locale),
        numeric: true,
      },
      {
        id: "expected",
        header: locale === "ar" ? "الوزن المتوقع (جم)" : "Expected (g)",
        cell: (row) => formatWeight(row.expected, locale),
        numeric: true,
      },
      {
        id: "counted",
        header: locale === "ar" ? "الوزن الفعلي (جم)" : "Counted (g)",
        cell: (row) =>
          row.counted !== null
            ? formatWeight(row.counted, locale)
            : "—",
        numeric: true,
      },
      {
        id: "variance",
        header: locale === "ar" ? "الفرق (جم)" : "Variance (g)",
        cell: (row) => {
          if (row.variance === null) return "—";
          const sign = row.variance > 0 ? "+" : "";
          return (
            <span
              className={
                row.variance === 0
                  ? "text-emerald-600 font-bold"
                  : row.variance > 0
                    ? "text-blue-600 font-bold"
                    : "text-rose-600 font-bold"
              }
            >
              {sign}
              {formatWeight(row.variance, locale)}
            </span>
          );
        },
        numeric: true,
      },
      {
        id: "status",
        header: t("table.status"),
        cell: (row) => (
          <StatusBadge tone={row.status === "closed" ? "success" : "neutral"}>
            {row.status === "closed"
              ? locale === "ar"
                ? "مغلق ومطابق"
                : "Closed"
              : locale === "ar"
                ? "مفتوح"
                : "Open"}
          </StatusBadge>
        ),
      },
    ],
    [t, locale],
  );

  return (
    <PageTransition>
      <PageHeader
        title={t("reconciliation.title")}
        description={t("reconciliation.subtitle")}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleOpenOwnerReportOnDemand}
              disabled={isCompilingReport}
              className="h-10 gap-2 rounded-xl font-semibold border-gold/30 text-gold-deep hover:bg-gold-soft"
            >
              {isCompilingReport ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              {locale === "ar" ? "تقرير اليوم للمالك" : "Owner EOD Report"}
            </Button>

            {isAlreadyClosed && (
              <Button
                variant="outline"
                disabled={reopenMutation.isPending}
                onClick={() => reopenMutation.mutate()}
                className="h-10 gap-2 rounded-xl border-destructive/20 hover:bg-destructive/10 text-destructive font-semibold"
              >
                {reopenMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                {locale === "ar" ? "إعادة فتح اليوم" : "Re-open Day"}
              </Button>
            )}
            {!isAlreadyClosed && (
              <Button
                variant="outline"
                onClick={() => {
                  setOpening18(String(data.find((r) => r.karat === 18)?.opening ?? 0));
                  setOpening21(String(data.find((r) => r.karat === 21)?.opening ?? 0));
                  setOpening24(String(data.find((r) => r.karat === 24)?.opening ?? 0));
                  setIsOpeningModalOpen(true);
                }}
                className="h-10 gap-2 rounded-xl font-semibold border-border hover:bg-muted"
              >
                <Scale className="size-4" />
                {locale === "ar" ? "تعديل الأرصدة الافتتاحية" : "Edit Opening Balances"}
              </Button>
            )}
            <Button
              disabled={isAlreadyClosed || isLoading}
              onClick={() => setIsClosingModalOpen(true)}
              className="h-10 gap-2 rounded-xl"
            >
              <Lock className="size-4" aria-hidden />
              {isAlreadyClosed ? (locale === "ar" ? "اليوم مغلق" : "Day Closed") : t("reconciliation.closeDay")}
            </Button>
          </div>
        }
      />

      <TableContainer>
        <DataTable
          columns={columns}
          rows={data ?? []}
          isLoading={isLoading}
          getRowId={(row) => String(row.karat)}
          emptyTitle={t("common.empty")}
          emptyDescription={t("common.placeholderNote")}
        />
      </TableContainer>

      {/* ────────────────── CASH DRAWER RECONCILIATION TABLE ────────────────── */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-foreground mb-4">
          {locale === "ar" ? "مطابقة العهدة النقدية" : "Cash Drawer Reconciliation"}
        </h2>
        <div className="bg-surface border border-border shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-start">{locale === "ar" ? "البيان" : "Description"}</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-start">{locale === "ar" ? "القيمة الافتتاحية (ج.م)" : "Opening Cash"}</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-start">{locale === "ar" ? "إجمالي المبيعات (+)" : "Sales Income"}</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-start">{locale === "ar" ? "إجمالي مشتريات الكسر (-)" : "Scrap Purchases"}</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-start">{locale === "ar" ? "المبلغ المتوقع (ج.م)" : "Expected Cash"}</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-start">{locale === "ar" ? "المبلغ الفعلي (ج.م)" : "Actual Cash"}</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-start">{locale === "ar" ? "الفرق (ج.م)" : "Variance"}</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-start">{locale === "ar" ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-4 font-sans font-semibold text-foreground text-start">
                    {locale === "ar" ? "حركة النقدية" : "Cash Flow"}
                  </td>
                  <td className="py-4 px-4 font-semibold text-start">{formatMoney(parseFloat(openingCash) || 0, locale)}</td>
                  <td className="py-4 px-4 font-bold text-emerald-600 text-start">{formatMoney(dashboardSummary?.revenueToday || 0, locale)}</td>
                  <td className="py-4 px-4 font-bold text-rose-600 text-start">{formatMoney(dashboardSummary?.purchasesToday || 0, locale)}</td>
                  <td className="py-4 px-4 font-extrabold text-start">{formatMoney((parseFloat(openingCash) || 0) + (dashboardSummary?.revenueToday || 0) - (dashboardSummary?.purchasesToday || 0), locale)}</td>
                  <td className="py-4 px-4 font-extrabold text-start">{(!isNaN(parseFloat(actualCash)) && actualCash !== "") ? formatMoney(parseFloat(actualCash), locale) : "—"}</td>
                  <td className="py-4 px-4 text-start">
                    {(!isNaN(parseFloat(actualCash)) && actualCash !== "") ? (
                      (() => {
                        const variance = parseFloat(actualCash) - ((parseFloat(openingCash) || 0) + (dashboardSummary?.revenueToday || 0) - (dashboardSummary?.purchasesToday || 0));
                        return (
                          <span
                            className={
                              variance === 0
                                ? "text-emerald-600 font-bold"
                                : variance > 0
                                  ? "text-blue-600 font-bold"
                                  : "text-rose-600 font-bold"
                            }
                          >
                            {variance > 0 ? "+" : ""}
                            {formatMoney(variance, locale)}
                          </span>
                        );
                      })()
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-4 px-4 text-start">
                    {(() => {
                      const isValid = !isNaN(parseFloat(actualCash)) && actualCash !== "";
                      const variance = isValid ? parseFloat(actualCash) - ((parseFloat(openingCash) || 0) + (dashboardSummary?.revenueToday || 0) - (dashboardSummary?.purchasesToday || 0)) : null;
                      return (
                        <StatusBadge tone={variance === 0 ? "success" : variance === null ? "neutral" : "destructive"}>
                          {variance === 0 
                            ? (locale === "ar" ? "متطابق" : "Matched") 
                            : variance === null 
                              ? (locale === "ar" ? "معلق" : "Pending")
                              : (locale === "ar" ? "يوجد فرق" : "Variance")}
                        </StatusBadge>
                      );
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ────────────────── CLOSE DAY MODAL ────────────────── */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-foreground">
                {locale === "ar" ? "إغلاق اليوم ومطابقة أوزان الخزينة" : "Close Day & Reconcile Weights"}
              </h2>
              <button
                onClick={() => setIsClosingModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              {locale === "ar"
                ? "قم بإدخال الأوزان الفعلية الموجودة بالخزينة لكل عيار لإغلاق اليوم واستخراج التقرير اليومي للمالك."
                : "Enter counted weight per karat in the safe to close day and dispatch the owner report."}
            </p>

            <form onSubmit={handleCloseDaySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-21">{locale === "ar" ? "الوزن الفعلي لعيار 21 (جرام)" : "21K Counted Weight (g)"}</Label>
                <Input
                  id="c-21"
                  type="number"
                  step="0.001"
                  required
                  value={counted21}
                  onChange={(e) => setCounted21(e.target.value)}
                  placeholder={String(data.find(r => r.karat === 21)?.expected ?? "0.000")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-18">{locale === "ar" ? "الوزن الفعلي لعيار 18 (جرام)" : "18K Counted Weight (g)"}</Label>
                <Input
                  id="c-18"
                  type="number"
                  step="0.001"
                  required
                  value={counted18}
                  onChange={(e) => setCounted18(e.target.value)}
                  placeholder={String(data.find(r => r.karat === 18)?.expected ?? "0.000")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-24">{locale === "ar" ? "الوزن الفعلي لعيار 24 (جرام)" : "24K Counted Weight (g)"}</Label>
                <Input
                  id="c-24"
                  type="number"
                  step="0.001"
                  required
                  value={counted24}
                  onChange={(e) => setCounted24(e.target.value)}
                  placeholder={String(data.find(r => r.karat === 24)?.expected ?? "0.000")}
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <Label htmlFor="c-cash">{locale === "ar" ? "النقدية الفعلية بالخزينة (ج.م)" : "Actual Cash in Safe (EGP)"}</Label>
                <Input
                  id="c-cash"
                  type="number"
                  step="0.01"
                  required
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="font-mono text-emerald-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="rounded-xl h-11"
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  disabled={submitMutation.isPending}
                  className="rounded-xl h-11 font-bold"
                >
                  {submitMutation.isPending
                    ? (locale === "ar" ? "جاري الإغلاق والإرسال..." : "Closing & Sending...")
                    : (locale === "ar" ? "إغلاق اليوم وإرسال التقرير" : "Close & Send Report")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── EDIT OPENING BALANCES MODAL ────────────────── */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-foreground">
                {locale === "ar" ? "تعديل الأرصدة الافتتاحية (الأوزان والنقدية)" : "Edit Opening Safe Balances"}
              </h2>
              <button
                onClick={() => setIsOpeningModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              {locale === "ar"
                ? "أدخل أوزان الذهب الافتتاحية والمبلغ النقدي المتاح بالخزينة لبداية الشيفت."
                : "Enter the opening gold weights and available cash amount to start the shift."}
            </p>

            <form onSubmit={handleUpdateOpeningSubmit} className="space-y-5">
              {/* Section A: Gold Weights */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gold-deep border-b border-border/60 pb-1.5">
                  {locale === "ar" ? "أوزان الذهب الافتتاحية (بالجرام)" : "Opening Gold Weights (g)"}
                </h3>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="o-21" className="text-xs font-semibold">{locale === "ar" ? "عيار 21" : "21K"}</Label>
                    <Input
                      id="o-21"
                      type="number"
                      step="0.001"
                      required
                      value={opening21}
                      onChange={(e) => setOpening21(e.target.value)}
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="o-18" className="text-xs font-semibold">{locale === "ar" ? "عيار 18" : "18K"}</Label>
                    <Input
                      id="o-18"
                      type="number"
                      step="0.001"
                      required
                      value={opening18}
                      onChange={(e) => setOpening18(e.target.value)}
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="o-24" className="text-xs font-semibold">{locale === "ar" ? "عيار 24" : "24K"}</Label>
                    <Input
                      id="o-24"
                      type="number"
                      step="0.001"
                      required
                      value={opening24}
                      onChange={(e) => setOpening24(e.target.value)}
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Cash Balance */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-emerald-600 border-b border-border/60 pb-1.5">
                  {locale === "ar" ? "العهدة النقدية الافتتاحية (بالجنية)" : "Opening Cash Drawer (EGP)"}
                </h3>
                <div className="space-y-1.5">
                  <Label htmlFor="o-cash" className="text-xs font-semibold">{locale === "ar" ? "القيمة الافتتاحية للنقدية بالخزينة (ج.م)" : "Opening Cash Balance (EGP)"}</Label>
                  <Input
                    id="o-cash"
                    type="number"
                    step="0.01"
                    required
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="rounded-xl font-mono text-emerald-600 font-bold text-base"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="rounded-xl h-11"
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  disabled={updateOpeningMutation.isPending}
                  className="rounded-xl h-11 font-bold"
                >
                  {updateOpeningMutation.isPending
                    ? (locale === "ar" ? "جاري الحفظ..." : "Saving...")
                    : (locale === "ar" ? "حفظ الأرصدة الافتتاحية" : "Save Opening Balances")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── EOD OWNER REPORT MODAL ────────────────── */}
      {eodMetrics && (
        <EODOwnerReportModal
          metrics={eodMetrics}
          onClose={() => setEodMetrics(null)}
        />
      )}
    </PageTransition>
  );
}
