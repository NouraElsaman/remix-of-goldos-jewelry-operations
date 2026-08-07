import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DataTable,
  PageHeader,
  StatusBadge,
  TableContainer,
  type DataTableColumn,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWeight } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import { queryKeys, services } from "@/services";
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
  
  // Counted weight input states
  const [counted18, setCounted18] = useState("");
  const [counted21, setCounted21] = useState("");
  const [counted22, setCounted22] = useState("");
  const [counted24, setCounted24] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (inputs: { karat: number; counted: number }[]) => {
      for (const input of inputs) {
        await services.reconciliation.submitCounted(input.karat, input.counted);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.currentDay() });
      toast.success(
        locale === "ar" ? "تم إغلاق اليوم ومطابقة الأوزان بنجاح!" : "Day closed and weights reconciled successfully!"
      );
      setIsClosingModalOpen(false);
      setCounted18("");
      setCounted21("");
      setCounted22("");
      setCounted24("");
    },
    onError: (err) => {
      console.error(err);
      toast.error(
        locale === "ar" ? "فشل إغلاق اليوم ومطابقة الأوزان" : "Failed to close the day and reconcile weights"
      );
    },
  });

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
    const c22 = parseFloat(counted22);
    const c24 = parseFloat(counted24);

    if (isNaN(c18) || isNaN(c21) || isNaN(c22) || isNaN(c24)) {
      toast.error(
        locale === "ar" ? "يرجى إدخال الأوزان الفعلية لجميع الأعيرة" : "Please enter counted weights for all karats"
      );
      return;
    }

    submitMutation.mutate([
      { karat: 18, counted: c18 },
      { karat: 21, counted: c21 },
      { karat: 22, counted: c22 },
      { karat: 24, counted: c24 },
    ]);
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
        header: locale === "ar" ? "الوزن الافتتاحي (جم)" : "Opening Weight (g)",
        cell: (row) => formatWeight(row.opening, locale),
        numeric: true,
      },
      {
        id: "received",
        header: locale === "ar" ? "الوزن المستلم / شراء (جم)" : "Received / Purchases (g)",
        cell: (row) => formatWeight(row.received, locale),
        numeric: true,
      },
      {
        id: "sold",
        header: locale === "ar" ? "الوزن المباع (جم)" : "Sold Weight (g)",
        cell: (row) => formatWeight(row.sold, locale),
        numeric: true,
      },
      {
        id: "expected",
        header: t("reconciliation.expected"),
        cell: (row) => formatWeight(row.expected, locale),
        numeric: true,
      },
      {
        id: "counted",
        header: t("reconciliation.actual"),
        cell: (row) =>
          row.counted === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-semibold text-foreground">{formatWeight(row.counted, locale)}</span>
          ),
        numeric: true,
      },
      {
        id: "variance",
        header: t("reconciliation.variance"),
        cell: (row) => {
          if (row.variance === null) return <span className="text-muted-foreground">—</span>;
          const tone = row.variance < 0 ? "text-destructive font-bold" : row.variance > 0 ? "text-emerald-600 font-bold" : "text-muted-foreground font-medium";
          const sign = row.variance > 0 ? "+" : "";
          return <span className={tone}>{sign}{formatWeight(row.variance, locale)}</span>;
        },
        numeric: true,
      },
      {
        id: "status",
        header: t("table.status"),
        cell: (row) => (
          <StatusBadge tone={row.status === "open" ? "gold" : "neutral"}>
            {row.status === "open" ? t("status.pending") : t("status.locked")}
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
          <div className="flex gap-3">
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
          <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-foreground">
                {locale === "ar" ? "مطابقة الأوزان وإغلاق اليوم" : "Reconcile Weights & Close Day"}
              </h2>
              <button
                onClick={() => setIsClosingModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>

            <form onSubmit={handleCloseDaySubmit} className="space-y-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {locale === "ar"
                  ? "يرجى وزن الذهب الموجود في المحل فعلياً لكل عيار وإدخاله أدناه. سيقوم النظام بحساب العجز أو الزيادة تلقائياً وإغلاق الحسابات لليوم."
                  : "Please weigh the physical gold currently in the shop for each karat and enter it below. The system will calculate variance and lock today's values."}
              </p>

              <div className="space-y-4">
                {/* 24K */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <Label htmlFor="c-24">عيار 24 (24K Gold)</Label>
                    <span>
                      {locale === "ar" ? "المتوقع:" : "Expected:"}{" "}
                      {formatWeight(data.find((r) => r.karat === 24)?.expected || 0, locale)}
                    </span>
                  </div>
                  <Input
                    id="c-24"
                    type="number"
                    step="0.001"
                    required
                    value={counted24}
                    onChange={(e) => setCounted24(e.target.value)}
                    placeholder="0.000 جم"
                  />
                </div>

                {/* 22K */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <Label htmlFor="c-22">عيار 22 (22K Gold)</Label>
                    <span>
                      {locale === "ar" ? "المتوقع:" : "Expected:"}{" "}
                      {formatWeight(data.find((r) => r.karat === 22)?.expected || 0, locale)}
                    </span>
                  </div>
                  <Input
                    id="c-22"
                    type="number"
                    step="0.001"
                    required
                    value={counted22}
                    onChange={(e) => setCounted22(e.target.value)}
                    placeholder="0.000 جم"
                  />
                </div>

                {/* 21K */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <Label htmlFor="c-21">عيار 21 (21K Gold)</Label>
                    <span>
                      {locale === "ar" ? "المتوقع:" : "Expected:"}{" "}
                      {formatWeight(data.find((r) => r.karat === 21)?.expected || 0, locale)}
                    </span>
                  </div>
                  <Input
                    id="c-21"
                    type="number"
                    step="0.001"
                    required
                    value={counted21}
                    onChange={(e) => setCounted21(e.target.value)}
                    placeholder="0.000 جم"
                  />
                </div>

                {/* 18K */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <Label htmlFor="c-18">عيار 18 (18K Gold)</Label>
                    <span>
                      {locale === "ar" ? "المتوقع:" : "Expected:"}{" "}
                      {formatWeight(data.find((r) => r.karat === 18)?.expected || 0, locale)}
                    </span>
                  </div>
                  <Input
                    id="c-18"
                    type="number"
                    step="0.001"
                    required
                    value={counted18}
                    onChange={(e) => setCounted18(e.target.value)}
                    placeholder="0.000 جم"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
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
                  disabled={submitMutation.isPending}
                  variant="gold"
                  className="rounded-xl h-11 gap-2"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  {locale === "ar" ? "تأكيد الإغلاق" : "Confirm Close"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
