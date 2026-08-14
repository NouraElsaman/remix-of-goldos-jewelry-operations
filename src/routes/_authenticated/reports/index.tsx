import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Download, FileText, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, SectionCard, EODOwnerReportModal } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { PageTransition, StaggerGroup, StaggerItem } from "@/lib/motion";
import { queryKeys, services } from "@/services";
import { supabase } from "@/services/supabase/supabase-provider";
import { compileEODReport, type EODReportMetrics } from "@/services/eod-report";

export const Route = createFileRoute("/_authenticated/reports/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/reports")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "التقارير — جوهرة تك" },
      {
        name: "description",
        content: "التقارير المالية والضريبية لمحلات الذهب.",
      },
      { property: "og:title", content: "التقارير — جوهرة تك" },
      {
        property: "og:description",
        content:
          "Printable and exportable operational reports for sales, stock and tax.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { t, locale } = useI18n();
  const { data } = useQuery({
    queryKey: queryKeys.reports.available(),
    queryFn: () => services.reports.available(),
  });

  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [eodMetrics, setEodMetrics] = useState<EODReportMetrics | null>(null);
  const [isCompilingEOD, setIsCompilingEOD] = useState(false);

  const handleOpenEODReport = async () => {
    setIsCompilingEOD(true);
    try {
      const metrics = await compileEODReport();
      setEodMetrics(metrics);
    } catch (err) {
      console.error(err);
      toast.error(locale === "ar" ? "فشل إعداد تقرير المالك" : "Failed to compile owner report");
    } finally {
      setIsCompilingEOD(false);
    }
  };

  const downloadCsv = (headers: string[], rows: (string | number)[][], filename: string) => {
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (reportId: string) => {
    setIsExporting(reportId);
    try {
      if (reportId === "daily-sales") {
        const { data: invoices, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("transaction_type", "sale")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const headers = [
          locale === "ar" ? "التاريخ والوقت" : "Date & Time",
          locale === "ar" ? "رقم الفاتورة" : "Invoice #",
          locale === "ar" ? "اسم العميل" : "Customer Name",
          locale === "ar" ? "الهاتف" : "Phone",
          locale === "ar" ? "العيار" : "Karat",
          locale === "ar" ? "الوزن (جم)" : "Weight (g)",
          locale === "ar" ? "قيمة الذهب (ج.م)" : "Gold Value (EGP)",
          locale === "ar" ? "المصنعية (ج.م)" : "Handwork (EGP)",
          locale === "ar" ? "الإجمالي النهائي (ج.م)" : "Total (EGP)",
        ];

        const rows = (invoices || []).map((row) => [
          new Date(row.created_at).toLocaleString(locale === "ar" ? "ar-EG" : "en-US"),
          row.invoice_number,
          row.customer_name || "—",
          row.customer_phone || "—",
          row.karat ? `${row.karat}K` : "—",
          row.total_weight || 0,
          row.gold_value || 0,
          row.handwork_value || 0,
          row.final_total || 0,
        ]);

        downloadCsv(headers, rows, `daily_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (reportId === "inventory-valuation") {
        const { data: prices, error: pricesError } = await supabase.from("gold_prices").select("*");
        if (pricesError) throw pricesError;

        const { data: purchases, error: purchasesError } = await supabase
          .from("invoices")
          .select("total_weight, net_weight, karat")
          .eq("transaction_type", "purchase");

        if (purchasesError) throw purchasesError;

        const { data: retailItems, error: retailError } = await supabase
          .from("inventory")
          .select("gross_weight, net_weight, karat")
          .eq("status", "in_stock");

        if (retailError) throw retailError;

        const headers = [
          locale === "ar" ? "العيار" : "Karat",
          locale === "ar" ? "إجمالي الوزن الكسر (جم)" : "Scrap Weight (g)",
          locale === "ar" ? "إجمالي وزن القطع الجاهزة (جم)" : "Retail Weight (g)",
          locale === "ar" ? "الوزن الإجمالي الكلي (جم)" : "Total Weight (g)",
          locale === "ar" ? "سعر الذهب اليوم (ج.م)" : "Today's Rate/g (EGP)",
          locale === "ar" ? "القيمة التقديرية الإجمالية (ج.م)" : "Estimated Cash Value (EGP)",
        ];

        const karats = [18, 21, 22, 24];
        const rows = karats.map((k) => {
          const scrapItems = (purchases || []).filter((item) => Math.round(Number(item.karat)) === k);
          const retailKaratItems = (retailItems || []).filter((item) => Math.round(Number(item.karat)) === k);

          const netScrap = scrapItems.reduce((sum, item) => sum + Number(item.net_weight || 0), 0);
          const netRetail = retailKaratItems.reduce((sum, item) => sum + Number(item.net_weight || 0), 0);
          const totalNetWeight = netScrap + netRetail;

          const rate24K = prices?.find((p) => p.karat === 24)?.rate || 6684;
          const rateForKarat = rate24K * (k / 24);
          const estimatedValue = totalNetWeight * rateForKarat;

          return [
            `${k}K`,
            netScrap.toFixed(3),
            netRetail.toFixed(3),
            totalNetWeight.toFixed(3),
            rateForKarat.toFixed(2),
            estimatedValue.toFixed(2),
          ];
        });

        downloadCsv(headers, rows, `stock_valuation_report_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (reportId === "vat") {
        const { data: invoices, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("transaction_type", "sale")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const headers = [
          locale === "ar" ? "التاريخ والوقت" : "Date & Time",
          locale === "ar" ? "رقم الفاتورة" : "Invoice #",
          locale === "ar" ? "الوزن (جم)" : "Weight (g)",
          locale === "ar" ? "العيار" : "Karat",
          locale === "ar" ? "المصنعية للجرام (ج.م)" : "Handwork/g (EGP)",
          locale === "ar" ? "إجمالي المصنعية (ج.م)" : "Total Handwork (EGP)",
          locale === "ar" ? "الضريبة المحتسبة (ج.م)" : "VAT (EGP)",
          locale === "ar" ? "الإجمالي الكلي (ج.م)" : "Grand Total (EGP)",
        ];

        const rows = (invoices || []).map((row) => {
          const weight = Number(row.total_weight) || 0;
          const handwork = Number(row.handwork_value) || 0;
          const laborPerGram = weight > 0 ? (handwork / weight).toFixed(2) : "0.00";
          return [
            new Date(row.created_at).toLocaleString(locale === "ar" ? "ar-EG" : "en-US"),
            row.invoice_number,
            weight,
            row.karat ? `${row.karat}K` : "—",
            laborPerGram,
            handwork,
            row.tax_value,
            row.final_total,
          ];
        });

        downloadCsv(headers, rows, `vat_report_${new Date().toISOString().slice(0, 10)}.csv`);
      }
      toast.success(
        locale === "ar" ? "تم تصدير التقرير بنجاح!" : "Report exported successfully!"
      );
    } catch (err) {
      console.error(err);
      toast.error(
        locale === "ar" ? "فشل تصدير التقرير" : "Failed to export report"
      );
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title={t("reports.title")}
        description={t("reports.subtitle")}
        actions={
          <Button
            variant="outline"
            onClick={handleOpenEODReport}
            disabled={isCompilingEOD}
            className="h-10 gap-2 rounded-xl font-semibold border-gold/30 text-gold-deep hover:bg-gold-soft"
          >
            {isCompilingEOD ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4 text-gold" />
            )}
            {locale === "ar" ? "تقرير الإغلاق اليومي للمالك" : "Owner Daily EOD Summary"}
          </Button>
        }
      />

      <StaggerGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((report) => (
          <StaggerItem key={report.id}>
            <SectionCard className="h-full">
              <div className="flex flex-col gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl border border-gold/30 bg-gold-soft text-gold-deep">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    {t(report.titleKey)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t(report.descriptionKey)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={isExporting !== null}
                  onClick={() => handleExport(report.id)}
                  className="h-9 w-fit gap-2 rounded-xl border-gold/20 hover:bg-gold-soft/10 text-gold-deep flex items-center"
                >
                  {isExporting === report.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                  {t("common.export")}
                </Button>
              </div>
            </SectionCard>
          </StaggerItem>
        ))}
      </StaggerGroup>

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
