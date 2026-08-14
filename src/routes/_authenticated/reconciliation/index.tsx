import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Lock, Loader2, Scale, FileText } from "lucide-react";
import { useMemo, useState } from "react";
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
import { formatWeight } from "@/lib/format";
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
      { title: "مطابقة الأوزان — جوهرة تك" },
      {
        name: "description",
        content: "مطابقة الأوزان وإغلاق اليوم الفعلي لمحلات الذهب.",
      },
      { property: "og:title", content: "مطابقة الأوزان — جوهرة تك" },
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

  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [eodMetrics, setEodMetrics] = useState<EODReportMetrics | null>(null);
  const [isCompilingReport, setIsCompilingReport] = useState(false);

  // Counted weight input states
  const [counted18, setCounted18] = useState("");
  const [counted21, setCounted21] = useState("");
  const [counted24, setCounted24] = useState("");

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
            : t("common.placeholderNote"),
        numeric: true,
      },
      {
        id: "variance",
        header: locale === "ar" ? "الفرق (جم)" : "Variance (g)",
        cell: (row) => {
          if (row.variance === null) return t("common.placeholderNote");
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
                {locale === "ar" ? "تعديل الأوزان الافتتاحية" : "Edit Opening Weights"}
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

              <div className="grid grid-cols-2 gap-3 pt-4">
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

      {/* ────────────────── EDIT OPENING WEIGHTS MODAL ────────────────── */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-foreground">
                {locale === "ar" ? "تعديل الأوزان الافتتاحية للخزينة" : "Edit Opening Safe Weights"}
              </h2>
              <button
                onClick={() => setIsOpeningModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>

            <form onSubmit={handleUpdateOpeningSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="o-21">{locale === "ar" ? "الوزن الافتتاحي عيار 21 (جرام)" : "21K Opening Weight (g)"}</Label>
                <Input
                  id="o-21"
                  type="number"
                  step="0.001"
                  required
                  value={opening21}
                  onChange={(e) => setOpening21(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="o-18">{locale === "ar" ? "الوزن الافتتاحي عيار 18 (جرام)" : "18K Opening Weight (g)"}</Label>
                <Input
                  id="o-18"
                  type="number"
                  step="0.001"
                  required
                  value={opening18}
                  onChange={(e) => setOpening18(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="o-24">{locale === "ar" ? "الوزن الافتتاحي عيار 24 (جرام)" : "24K Opening Weight (g)"}</Label>
                <Input
                  id="o-24"
                  type="number"
                  step="0.001"
                  required
                  value={opening24}
                  onChange={(e) => setOpening24(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
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
                    ? (locale === "ar" ? "جاري التحديث..." : "Saving...")
                    : (locale === "ar" ? "حفظ الأوزان" : "Save Weights")}
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
