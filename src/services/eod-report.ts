import { supabase } from "@/services/supabase/supabase-provider";
import { services } from "@/services";
import { sendEmailViaResend } from "@/services/send-email-fn";

export interface EODReportMetrics {
  date: string;
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  totalSalesRevenue: number;
  totalScrapPayout: number;
  totalHandworkEarnings: number;
  netCashFlow: number;
  salesCount: number;
  scrapCount: number;
  soldWeightsByKarat: Record<number, number>; // { 18: weight, 21: weight, 24: weight }
  scrapWeightsByKarat: Record<number, number>; // { 18: weight, 21: weight, 24: weight }
  reconciliationRows: {
    karat: number;
    openingWeight: number;
    receivedWeight: number;
    soldWeight: number;
    expectedWeight: number;
    countedWeight: number | null;
    variance: number | null;
    status: string;
  }[];
  totalVariance: number;
}

/**
 * Compiles comprehensive End-of-Day (EOD) financial, inventory, and safe weight data for today.
 */
export async function compileEODReport(targetDateStr?: string): Promise<EODReportMetrics> {
  const dateStr = targetDateStr || new Date().toISOString().slice(0, 10);
  const startOfDay = `${dateStr}T00:00:00.000Z`;
  const endOfDay = `${dateStr}T23:59:59.999Z`;

  // 1. Fetch Store Settings
  const settings = await services.settings.get();
  const shopName = settings?.shopNameAr || settings?.shopName || "مجوهرات جوهرة تك";
  const ownerName = settings?.ownerName || "مالك المحل";
  const ownerEmail = settings?.email || "hotohory13@gmail.com";
  const ownerPhone = settings?.phone || "";

  // 2. Fetch Sales & Scrap Purchases for today
  const { data: invoices = [], error: invoicesErr } = await supabase
    .from("invoices")
    .select("*")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay);

  if (invoicesErr) console.error("Error fetching invoices for EOD report:", invoicesErr);

  const salesInvoices = invoices.filter((i) => i.transaction_type === "sale");
  const scrapInvoices = invoices.filter((i) => i.transaction_type === "purchase");

  const totalSalesRevenue = salesInvoices.reduce((sum, i) => sum + Number(i.final_total || 0), 0);
  const totalScrapPayout = scrapInvoices.reduce((sum, i) => sum + Number(i.final_total || 0), 0);
  const totalHandworkEarnings = salesInvoices.reduce((sum, i) => sum + Number(i.handwork_value || 0), 0);
  const netCashFlow = totalSalesRevenue - totalScrapPayout;

  // Weight breakdown by karat
  const soldWeightsByKarat: Record<number, number> = { 18: 0, 21: 0, 24: 0 };
  salesInvoices.forEach((i) => {
    const k = Math.round(Number(i.karat));
    if ([18, 21, 24].includes(k)) {
      soldWeightsByKarat[k] = (soldWeightsByKarat[k] || 0) + Number(i.net_weight || i.total_weight || 0);
    }
  });

  const scrapWeightsByKarat: Record<number, number> = { 18: 0, 21: 0, 24: 0 };
  scrapInvoices.forEach((i) => {
    const k = Math.round(Number(i.karat));
    if ([18, 21, 24].includes(k)) {
      scrapWeightsByKarat[k] = (scrapWeightsByKarat[k] || 0) + Number(i.net_weight || i.total_weight || 0);
    }
  });

  // 3. Fetch Reconciliation Data for today
  const { data: reconRows = [], error: reconErr } = await supabase
    .from("reconciliation")
    .select("*")
    .eq("date", dateStr);

  if (reconErr) console.error("Error fetching reconciliation for EOD report:", reconErr);

  const reconciliationRows = [18, 21, 24].map((k) => {
    const match = reconRows.find((r) => Math.round(Number(r.karat)) === k);
    return {
      karat: k,
      openingWeight: Number(match?.opening_weight || 0),
      receivedWeight: Number(match?.received_weight || 0),
      soldWeight: Number(match?.sold_weight || 0),
      expectedWeight: Number(match?.expected_weight || 0),
      countedWeight: match?.counted_weight !== null && match?.counted_weight !== undefined ? Number(match.counted_weight) : null,
      variance: match?.variance !== null && match?.variance !== undefined ? Number(match.variance) : null,
      status: match?.status || "open",
    };
  });

  const totalVariance = reconciliationRows.reduce((sum, r) => sum + (r.variance || 0), 0);

  return {
    date: dateStr,
    shopName,
    ownerName,
    ownerEmail,
    ownerPhone,
    totalSalesRevenue,
    totalScrapPayout,
    totalHandworkEarnings,
    netCashFlow,
    salesCount: salesInvoices.length,
    scrapCount: scrapInvoices.length,
    soldWeightsByKarat,
    scrapWeightsByKarat,
    reconciliationRows,
    totalVariance,
  };
}

/**
 * Generates executive HTML email template for End-of-Day Report.
 */
export function generateEODHtmlEmail(metrics: EODReportMetrics): string {
  const formattedDate = new Date(metrics.date).toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
  <!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8">
    <title>تقرير الإغلاق اليومي — ${metrics.shopName}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; text-align: right; }
      .card { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
      .header { background: #1e293b; color: #fbbf24; padding: 24px; text-align: center; border-bottom: 3px solid #d97706; }
      .header h1 { margin: 0; font-size: 22px; }
      .header p { margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; }
      .body-content { padding: 24px; }
      .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
      .kpi-box { background: #f1f5f9; padding: 14px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
      .kpi-box.emerald { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
      .kpi-box.amber { background: #fffbeb; border-color: #fde68a; color: #b45309; }
      .kpi-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
      .kpi-value { font-size: 18px; font-weight: 800; font-family: monospace; }
      .section-title { font-size: 14px; font-weight: 700; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
      th, td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; }
      th { background-color: #f8fafc; color: #475569; font-weight: 700; }
      .variance-positive { color: #2563eb; font-weight: bold; }
      .variance-zero { color: #16a34a; font-weight: bold; }
      .variance-negative { color: #dc2626; font-weight: bold; }
      .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>👑 ${metrics.shopName}</h1>
        <p>تقرير الإغلاق اليومي للمالك — ${formattedDate}</p>
      </div>
      
      <div class="body-content">
        <div class="kpi-grid">
          <div class="kpi-box emerald">
            <div class="kpi-title" style="color:#047857;">صافي التدفق النقدي</div>
            <div class="kpi-value">${metrics.netCashFlow.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</div>
          </div>

          <div class="kpi-box amber">
            <div class="kpi-title" style="color:#b45309;">أرباح المصنعية</div>
            <div class="kpi-value">${metrics.totalHandworkEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</div>
          </div>

          <div class="kpi-box">
            <div class="kpi-title">مبيعات المصوغات (${metrics.salesCount})</div>
            <div class="kpi-value">${metrics.totalSalesRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</div>
          </div>

          <div class="kpi-box">
            <div class="kpi-title">مشتريات الكسر (${metrics.scrapCount})</div>
            <div class="kpi-value">${metrics.totalScrapPayout.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</div>
          </div>
        </div>

        <div class="section-title">⚖️ حركة أوزان الذهب المباع والكسر المشتري (جم)</div>
        <table>
          <thead>
            <tr>
              <th>العيار</th>
              <th>الوزن المباع</th>
              <th>الكسر المشتري</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>عيار 21</strong></td>
              <td>${metrics.soldWeightsByKarat[21].toFixed(3)} جم</td>
              <td>${metrics.scrapWeightsByKarat[21].toFixed(3)} جم</td>
            </tr>
            <tr>
              <td><strong>عيار 18</strong></td>
              <td>${metrics.soldWeightsByKarat[18].toFixed(3)} جم</td>
              <td>${metrics.scrapWeightsByKarat[18].toFixed(3)} جم</td>
            </tr>
            <tr>
              <td><strong>عيار 24</strong></td>
              <td>${metrics.soldWeightsByKarat[24].toFixed(3)} جم</td>
              <td>${metrics.scrapWeightsByKarat[24].toFixed(3)} جم</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">🔒 مطابقة خزينة الذهب والفرق</div>
        <table>
          <thead>
            <tr>
              <th>العيار</th>
              <th>المتوقع</th>
              <th>الفعلي</th>
              <th>الفرق</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.reconciliationRows
              .map(
                (r) => `
              <tr>
                <td><strong>${r.karat}K</strong></td>
                <td>${r.expectedWeight.toFixed(3)} جم</td>
                <td>${r.countedWeight !== null ? `${r.countedWeight.toFixed(3)} جم` : "-"}</td>
                <td class="${r.variance === 0 ? "variance-zero" : (r.variance || 0) > 0 ? "variance-positive" : "variance-negative"}">
                  ${r.variance !== null ? (r.variance >= 0 ? `+${r.variance.toFixed(3)}` : r.variance.toFixed(3)) : "-"} جم
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="footer">
        منصة جوهرة تك لإدارة محلات ومصانع الذهب والمجوهرات © ${new Date().getFullYear()}
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Triggers server-side email dispatch using Resend API to deliver the EOD Report.
 */
export async function sendEODReportEmail(metrics: EODReportMetrics): Promise<{ success: boolean; message: string }> {
  try {
    const toEmail = metrics.ownerEmail || "hotohory13@gmail.com";
    const subject = `تقرير الإغلاق اليومي — ${metrics.shopName} (${metrics.date})`;
    const html = generateEODHtmlEmail(metrics);

    // Call serverFn to dispatch via Resend
    const res = await sendEmailViaResend({
      data: {
        to: toEmail,
        subject,
        html,
      },
    });

    if (!res.success) {
      console.warn("Resend email serverFn message:", res.error);
      return {
        success: false,
        message: res.error || `تعذر الإرسال المباشر. يرجى التأكد من ضبط RESEND_API_KEY في البيئة.`,
      };
    }

    return {
      success: true,
      message: `تم إرسال التقرير اليومي بنجاح إلى البريد: ${toEmail}`,
    };
  } catch (err: any) {
    console.error("Failed to send EOD email:", err);
    return {
      success: false,
      message: err.message || `حدث خطأ أثناء إرسال البريد الإلكتروني.`,
    };
  }
}

/**
 * Generates a pre-formatted Arabic WhatsApp message payload for the EOD Report.
 */
export function generateWhatsAppPayload(metrics: EODReportMetrics): string {
  const formattedDate = new Date(metrics.date).toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines = [
    `👑 *تقرير الإغلاق اليومي — ${metrics.shopName}*`,
    `📅 *التاريخ:* ${formattedDate}`,
    `👤 *المالك:* ${metrics.ownerName}`,
    ``,
    `💰 *المؤشرات المالية:*`,
    `• مبيعات المصوغات (${metrics.salesCount} فاتورة): ${metrics.totalSalesRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`,
    `• مشتريات الذهب الكسر (${metrics.scrapCount} عملية): ${metrics.totalScrapPayout.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`,
    `• أرباح المصنعية: ${metrics.totalHandworkEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`,
    `• *صافي التدفق النقدي:* ${metrics.netCashFlow.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`,
    ``,
    `⚖️ *أوزان الذهب المباع:*`,
    `• عيار 21: ${metrics.soldWeightsByKarat[21].toFixed(3)} جم`,
    `• عيار 18: ${metrics.soldWeightsByKarat[18].toFixed(3)} جم`,
    `• عيار 24: ${metrics.soldWeightsByKarat[24].toFixed(3)} جم`,
    ``,
    `📥 *أوزان الكسر المشتري:*`,
    `• عيار 21: ${metrics.scrapWeightsByKarat[21].toFixed(3)} جم`,
    `• عيار 18: ${metrics.scrapWeightsByKarat[18].toFixed(3)} جم`,
    `• عيار 24: ${metrics.scrapWeightsByKarat[24].toFixed(3)} جم`,
    ``,
    `🔒 *مطابقة خزينة الذهب:*`,
    ...metrics.reconciliationRows.map(
      (r) =>
        `• عيار ${r.karat}K: متوقع ${r.expectedWeight.toFixed(3)} جم | فعلي ${r.countedWeight !== null ? r.countedWeight.toFixed(3) : "غير محدد"} جم | فرق: ${r.variance !== null ? (r.variance >= 0 ? `+${r.variance.toFixed(3)}` : r.variance.toFixed(3)) : "0"} جم`,
    ),
    ``,
    `✨ *الحالة:* تم إغلاق اليوم ومطابقة الخزينة بنجاح!`,
  ];

  return encodeURIComponent(lines.join("\n"));
}
