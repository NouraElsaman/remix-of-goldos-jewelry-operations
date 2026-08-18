import { Printer, Send, Mail, CheckCircle2, ShieldCheck, DollarSign, Scale, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { formatMoney, formatWeight } from "@/lib/format";
import {
  sendEODReportEmail,
  generateWhatsAppPayload,
  type EODReportMetrics,
} from "@/services/eod-report";

interface EODOwnerReportModalProps {
  metrics: EODReportMetrics | null;
  onClose: () => void;
}

export function EODOwnerReportModal({ metrics, onClose }: EODOwnerReportModalProps) {
  const { locale } = useI18n();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  if (!metrics) return null;

  const formattedDate = new Date(metrics.date).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  const handlePrint = () => {
    window.print();
  };

  const handleResendEmail = async () => {
    setIsSendingEmail(true);
    const res = await sendEODReportEmail(metrics);
    setIsSendingEmail(false);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const whatsAppUrl = `https://wa.me/${metrics.ownerPhone.replace(/[^0-9]/g, "")}?text=${generateWhatsAppPayload(metrics)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto print:absolute print:inset-0 print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-h-full">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-gold" />
            <h2 className="text-lg font-bold text-foreground">
              {locale === "ar" ? "تقرير الإغلاق اليومي للمالك" : "Owner End-of-Day Summary"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            {locale === "ar" ? "إغلاق" : "Close"}
          </button>
        </div>

        {/* Printable EOD Executive Report Frame */}
        <div id="eod-report-print-area" dir="rtl" className="space-y-6 text-start py-2 print:py-4">
          {/* Store Brand Header */}
          <div className="border-b border-border/80 pb-4 text-center">
            <h1 className="text-xl font-extrabold tracking-wide text-foreground">
              {metrics.shopName}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {locale === "ar" ? "تقرير الإغلاق اليومي ومطابقة الخزينة" : "Daily EOD Financial & Weight Summary"}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-muted-foreground/90">
              <span>📅 {formattedDate}</span>
              <span>👤 {locale === "ar" ? "المالك:" : "Owner:"} {metrics.ownerName}</span>
              {metrics.ownerEmail && <span>📧 {metrics.ownerEmail}</span>}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
              <span className="text-[11px] font-semibold text-emerald-700">
                {locale === "ar" ? "صافي التدفق النقدي" : "Net Cash Flow"}
              </span>
              <p className="text-base font-extrabold font-mono text-emerald-600 mt-1" dir="ltr">
                {formatMoney(metrics.netCashFlow, locale)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-surface-muted/40 p-3 text-center">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {locale === "ar" ? `المبيعات (${metrics.salesCount})` : `Sales (${metrics.salesCount})`}
              </span>
              <p className="text-base font-extrabold font-mono text-foreground mt-1" dir="ltr">
                {formatMoney(metrics.totalSalesRevenue, locale)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-surface-muted/40 p-3 text-center">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {locale === "ar" ? `مشتريات الكسر (${metrics.scrapCount})` : `Scrap Buy (${metrics.scrapCount})`}
              </span>
              <p className="text-base font-extrabold font-mono text-foreground mt-1" dir="ltr">
                {formatMoney(metrics.totalScrapPayout, locale)}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
              <span className="text-[11px] font-semibold text-amber-700">
                {locale === "ar" ? "أرباح المصنعية" : "Labor Earnings"}
              </span>
              <p className="text-base font-extrabold font-mono text-amber-600 mt-1" dir="ltr">
                {formatMoney(metrics.totalHandworkEarnings, locale)}
              </p>
            </div>
          </div>

          {/* Gold Weight Movements Section */}
          <div className="rounded-2xl border border-border/80 p-4 space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <Package className="size-4 text-gold" />
              {locale === "ar" ? "حركة أوزان الذهب اليومية (جرام)" : "Daily Gold Weight Movements (g)"}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Sold Weight */}
              <div>
                <p className="font-semibold text-muted-foreground mb-2">
                  {locale === "ar" ? "المباع حسب العيار:" : "Sold by Karat:"}
                </p>
                <ul className="space-y-1 font-mono">
                  <li className="flex justify-between">
                    <span>عيار 21:</span>
                    <strong>{formatWeight(metrics.soldWeightsByKarat[21], locale)}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>عيار 18:</span>
                    <strong>{formatWeight(metrics.soldWeightsByKarat[18], locale)}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>عيار 24:</span>
                    <strong>{formatWeight(metrics.soldWeightsByKarat[24], locale)}</strong>
                  </li>
                </ul>
              </div>

              {/* Scrap Purchased Weight */}
              <div>
                <p className="font-semibold text-muted-foreground mb-2">
                  {locale === "ar" ? "الكسر المشتري حسب العيار:" : "Scrap Bought by Karat:"}
                </p>
                <ul className="space-y-1 font-mono">
                  <li className="flex justify-between">
                    <span>عيار 21:</span>
                    <strong>{formatWeight(metrics.scrapWeightsByKarat[21], locale)}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>عيار 18:</span>
                    <strong>{formatWeight(metrics.scrapWeightsByKarat[18], locale)}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>عيار 24:</span>
                    <strong>{formatWeight(metrics.scrapWeightsByKarat[24], locale)}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Safe Weight Reconciliation & Variance Table */}
          <div className="rounded-2xl border border-border/80 p-4 space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <Scale className="size-4 text-gold" />
              {locale === "ar" ? "مطابقة خزينة الذهب والفرق" : "Safe Weight Reconciliation & Variance"}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                    <th className="py-1.5 text-start">{locale === "ar" ? "العيار" : "Karat"}</th>
                    <th className="py-1.5 text-start">{locale === "ar" ? "الافتتاحي" : "Opening"}</th>
                    <th className="py-1.5 text-start">{locale === "ar" ? "المستلم" : "Received"}</th>
                    <th className="py-1.5 text-start">{locale === "ar" ? "المباع" : "Sold"}</th>
                    <th className="py-1.5 text-start">{locale === "ar" ? "المتوقع" : "Expected"}</th>
                    <th className="py-1.5 text-start">{locale === "ar" ? "الفعلي" : "Counted"}</th>
                    <th className="py-1.5 text-start">{locale === "ar" ? "الفرق" : "Variance"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {metrics.reconciliationRows.map((r) => (
                    <tr key={r.karat}>
                      <td className="py-2 font-semibold font-sans">{r.karat}K</td>
                      <td className="py-2">{formatWeight(r.openingWeight, locale)}</td>
                      <td className="py-2">{formatWeight(r.receivedWeight, locale)}</td>
                      <td className="py-2">{formatWeight(r.soldWeight, locale)}</td>
                      <td className="py-2 font-bold">{formatWeight(r.expectedWeight, locale)}</td>
                      <td className="py-2">{r.countedWeight !== null ? formatWeight(r.countedWeight, locale) : "-"}</td>
                      <td className="py-2">
                        {r.variance !== null ? (
                          <span className={r.variance === 0 ? "text-emerald-600 font-bold" : r.variance > 0 ? "text-blue-600 font-bold" : "text-rose-600 font-bold"}>
                            {r.variance >= 0 ? `+${formatWeight(r.variance, locale)}` : formatWeight(r.variance, locale)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Variance Warning / Clean Check */}
            <div className="pt-2 border-t border-dashed border-border/60 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                {locale === "ar" ? "إجمالي فرق الوزن لليوم:" : "Total Daily Weight Variance:"}
              </span>
              <span className={`font-mono font-bold ${metrics.totalVariance === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {metrics.totalVariance >= 0 ? `+${formatWeight(metrics.totalVariance, locale)}` : formatWeight(metrics.totalVariance, locale)}
              </span>
            </div>
          </div>

          {/* Cash Drawer Reconciliation */}
          <div className="rounded-2xl border border-border/80 p-4 space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <DollarSign className="size-4 text-emerald-600" />
              {locale === "ar" ? "مطابقة نقدية الخزينة (ج.م)" : "Cash Drawer Reconciliation (EGP)"}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <tbody className="divide-y divide-border/40 font-mono">
                  <tr>
                    <td className="py-2 text-muted-foreground font-sans">{locale === "ar" ? "القيمة الافتتاحية" : "Opening Balance"}</td>
                    <td className="py-2 font-semibold text-end">{formatMoney(metrics.cashOpeningBalance || 0, locale)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-muted-foreground font-sans">{locale === "ar" ? "إجمالي المبيعات (+)" : "Total Sales (+)"}</td>
                    <td className="py-2 font-bold text-emerald-600 text-end">{formatMoney(metrics.totalSalesRevenue, locale)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-muted-foreground font-sans">{locale === "ar" ? "إجمالي مشتريات الكسر (-)" : "Total Scrap Payout (-)"}</td>
                    <td className="py-2 font-bold text-rose-600 text-end">{formatMoney(metrics.totalScrapPayout, locale)}</td>
                  </tr>
                  <tr className="bg-surface-muted/30">
                    <td className="py-2 font-bold text-foreground font-sans">{locale === "ar" ? "المتوقع" : "Expected"}</td>
                    <td className="py-2 font-extrabold text-end">{formatMoney(metrics.cashExpectedBalance || 0, locale)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-foreground font-sans">{locale === "ar" ? "الفعلي" : "Counted"}</td>
                    <td className="py-2 font-extrabold text-end">{metrics.cashActualBalance !== null && metrics.cashActualBalance !== undefined ? formatMoney(metrics.cashActualBalance, locale) : "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-dashed border-border/60 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                {locale === "ar" ? "الفرق:" : "Variance:"}
              </span>
              <span className={`font-mono font-bold ${metrics.cashVariance === 0 ? "text-emerald-600" : (metrics.cashVariance || 0) > 0 ? "text-blue-600" : "text-rose-600"}`}>
                {metrics.cashVariance !== null && metrics.cashVariance !== undefined ? (metrics.cashVariance >= 0 ? `+${formatMoney(metrics.cashVariance, locale)}` : formatMoney(metrics.cashVariance, locale)) : "-"}
              </span>
            </div>
          </div>

          {/* EOD Footer Notice */}
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 p-2.5 text-center text-xs font-semibold">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              {locale === "ar"
                ? `تم إرسال نسخة من هذا التقرير تلقائياً إلى بريد المالك (${metrics.ownerEmail || "المالك"})`
                : `A copy of this report was automatically dispatched to owner email (${metrics.ownerEmail || "Owner"})`}
            </span>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 print:hidden">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl h-11 text-xs"
          >
            {locale === "ar" ? "إغلاق" : "Close"}
          </Button>

          <Button
            variant="outline"
            onClick={handleResendEmail}
            disabled={isSendingEmail}
            className="rounded-xl h-11 text-xs gap-1.5"
          >
            <Mail className="size-3.5" />
            {isSendingEmail
              ? (locale === "ar" ? "جاري الإرسال..." : "Sending...")
              : (locale === "ar" ? "إعادة إرسال ايميل" : "Resend Email")}
          </Button>

          {metrics.ownerPhone && (
            <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl h-11 text-xs gap-1.5 text-emerald-700 border-emerald-500/30 hover:bg-emerald-50"
              >
                <Send className="size-3.5" />
                {locale === "ar" ? "واتساب المالك" : "WhatsApp"}
              </Button>
            </a>
          )}

          <Button
            variant="gold"
            onClick={handlePrint}
            className="rounded-xl h-11 text-xs gap-1.5"
          >
            <Printer className="size-3.5" />
            {locale === "ar" ? "طباعة التقرير" : "Print Report"}
          </Button>
        </div>
      </div>

      {/* Styled Printable CSS for EOD Owner Report */}
      <style>{`
        @media print {
          @page {
            margin: 6mm;
            size: auto;
          }
          html, body {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #eod-report-print-area, #eod-report-print-area * {
            visibility: visible !important;
          }
          #eod-report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 6mm !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
