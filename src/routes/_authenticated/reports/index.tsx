import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { PageTransition, StaggerGroup, StaggerItem } from "@/lib/motion";
import { queryKeys, services } from "@/services";
import { supabase } from "@/services/supabase/supabase-provider";

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

  const downloadCsv = (headers: string[], rows: (string | number)[][], filename: string) => {
    // Add UTF-8 BOM so Excel opens Arabic correctly
    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

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
          .order("created_at", { ascending: false });

        if (error) throw error;

        const headers = [
          locale === "ar" ? "التاريخ" : "Date",
          locale === "ar" ? "رقم الفاتورة" : "Invoice Number",
          locale === "ar" ? "النوع" : "Type",
          locale === "ar" ? "اسم العميل" : "Customer Name",
          locale === "ar" ? "الهاتف" : "Phone",
          locale === "ar" ? "الوزن الإجمالي (جم)" : "Gross Weight (g)",
          locale === "ar" ? "نسبة الخصم (%)" : "Deduction %",
          locale === "ar" ? "الوزن الصافي (جم)" : "Net Weight (g)",
          locale === "ar" ? "العيار" : "Karat",
          locale === "ar" ? "المصنعية (ج.م)" : "Labor Value (EGP)",
          locale === "ar" ? "الضريبة (ج.م)" : "VAT Tax (EGP)",
          locale === "ar" ? "الإجمالي النهائي (ج.م)" : "Final Total (EGP)",
          locale === "ar" ? "طريقة الدفع" : "Payment Method",
        ];

        const rows = (invoices || []).map((row) => [
          new Date(row.created_at).toLocaleString(locale === "ar" ? "ar-EG" : "en-US"),
          row.invoice_number,
          row.transaction_type === "sale" 
            ? (locale === "ar" ? "بيع" : "Sale") 
            : (locale === "ar" ? "شراء" : "Purchase"),
          row.customer_name || "—",
          row.customer_phone || "—",
          row.total_weight,
          row.deduction_pct,
          row.net_weight,
          row.karat || "—",
          row.handwork_value,
          row.tax_value,
          row.final_total,
          row.payment_method === "cash" 
            ? (locale === "ar" ? "نقدي" : "Cash") 
            : (row.payment_method === "card" ? (locale === "ar" ? "بطاقة" : "Card") : (locale === "ar" ? "تحويل" : "Transfer")),
        ]);

        downloadCsv(headers, rows, `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (reportId === "stock-value") {
        // 1. Fetch today's gold prices for rates
        const { data: prices, error: pricesError } = await supabase
          .from("gold_prices")
          .select("*");

        if (pricesError) throw pricesError;

        // 2. Fetch purchase invoices for scrap stash weights
        const { data: purchases, error: purchasesError } = await supabase
          .from("invoices")
          .select("total_weight, net_weight, karat")
          .eq("transaction_type", "purchase");

        if (purchasesError) throw purchasesError;

        // 3. Fetch finished retail items currently in stock
        const { data: retailItems, error: retailError } = await supabase
          .from("inventory")
          .select("gross_weight, net_weight, karat")
          .eq("status", "in_stock");

        if (retailError) throw retailError;

        const rate24KBuy = prices?.find((p) => p.karat === 24)?.rate_buy || 6684;

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

          // Pricing logic matching dashboard
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
          locale === "ar" ? "التاريخ" : "Date",
          locale === "ar" ? "رقم الفاتورة" : "Invoice Number",
          locale === "ar" ? "وزن المبيعة (جم)" : "Weight (g)",
          locale === "ar" ? "العيار" : "Karat",
          locale === "ar" ? "قيمة المصنعية للجرام" : "Labor/g (EGP)",
          locale === "ar" ? "إجمالي قيمة المصنعية" : "Total Labor Value (EGP)",
          locale === "ar" ? "ضريبة القيمة المضافة (14% على المصنعية)" : "VAT (14% on labor)",
          locale === "ar" ? "الإجمالي النهائي للمبيعة" : "Invoice Total (EGP)",
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
    </PageTransition>
  );
}
