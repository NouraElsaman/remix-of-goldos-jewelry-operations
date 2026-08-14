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
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" dir="rtl" lang="ar">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>تقرير الإغلاق اليومي — ${metrics.shopName}</title>
  </head>
  <body dir="rtl" style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl !important; text-align: right !important;">
    <div dir="rtl" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; direction: rtl !important; text-align: right !important;">
      
      <!-- Header -->
      <table dir="rtl" align="right" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-bottom: 3px solid #d97706; direction: rtl !important; width: 100%;">
        <tr>
          <td align="center" dir="rtl" style="padding: 24px; text-align: center !important; color: #fbbf24;">
            <h1 style="margin: 0; font-size: 22px; color: #fbbf24;">👑 ${metrics.shopName}</h1>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">تقرير الإغلاق اليومي للمالك — ${formattedDate}</p>
          </td>
        </tr>
      </table>

      <!-- Main Body -->
      <table dir="rtl" align="right" width="100%" cellpadding="0" cellspacing="0" style="padding: 20px; direction: rtl !important; text-align: right !important; width: 100%;">
        <tr>
          <td dir="rtl" style="direction: rtl !important; text-align: right !important;">
            
            <!-- Section 1 Title -->
            <h3 dir="rtl" style="font-size: 14px; font-weight: 700; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 20px 0 12px 0; text-align: right !important; direction: rtl !important;">
              ⚖️ حركة أوزان الذهب المباع والكسر المشتري (جم)
            </h3>

            <!-- Section 1 Table -->
            <table dir="rtl" align="right" width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 13px; margin-bottom: 20px; direction: rtl !important; text-align: right !important;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; color: #475569; font-weight: 700;">العيار</th>
                  <th dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; color: #475569; font-weight: 700;">الوزن المباع</th>
                  <th dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; color: #475569; font-weight: 700;">الكسر المشتري</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important;"><strong>عيار 21</strong></td>
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace;">${metrics.soldWeightsByKarat[21].toFixed(3)} جم</td>
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace;">${metrics.scrapWeightsByKarat[21].toFixed(3)} جم</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important;"><strong>عيار 18</strong></td>
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace;">${metrics.soldWeightsByKarat[18].toFixed(3)} جم</td>
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace;">${metrics.scrapWeightsByKarat[18].toFixed(3)} جم</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important;"><strong>عيار 24</strong></td>
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace;">${metrics.soldWeightsByKarat[24].toFixed(3)} جم</td>
                  <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace;">${metrics.scrapWeightsByKarat[24].toFixed(3)} جم</td>
                </tr>
              </tbody>
            </table>

            <!-- Section 2 Title -->
            <h3 dir="rtl" style="font-size: 14px; font-weight: 700; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 20px 0 12px 0; text-align: right !important; direction: rtl !important;">
              🔒 مطابقة خزينة الذهب والفرق
            </h3>

            <!-- Section 2 Table -->
            <table dir="rtl" align="right" width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 13px; margin-bottom: 20px; direction: rtl !important; text-align: right !important;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; color: #475569; font-weight: 700;">العيار</th>
                  <th dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; color: #475569; font-weight: 700;">المتوقع</th>
                  <th dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; color: #475569; font-weight: 700;">الفعلي</th>
                  <th dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; color: #475569; font-weight: 700;">الفرق</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.reconciliationRows
                  .map(
                    (r) => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important;"><strong>${r.karat}K</strong></td>
                    <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace;">${r.expectedWeight.toFixed(3)} جم</td>
                    <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace;">${r.countedWeight !== null ? `${r.countedWeight.toFixed(3)} جم` : "-"}</td>
                    <td dir="rtl" align="right" style="padding: 10px; text-align: right !important; direction: rtl !important; font-family: monospace; font-weight: bold; color: ${r.variance === 0 ? "#16a34a" : (r.variance || 0) > 0 ? "#2563eb" : "#dc2626"};">
                      ${r.variance !== null ? (r.variance >= 0 ? `+${r.variance.toFixed(3)}` : r.variance.toFixed(3)) : "-"} جم
                    </td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>

          </td>
        </tr>
      </table>

      <!-- Footer -->
      <table dir="rtl" align="right" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; direction: rtl !important; width: 100%;">
        <tr>
          <td align="center" dir="rtl" style="padding: 16px; text-align: center !important; font-size: 11px; color: #64748b;">
            منصة جوهرة تك لإدارة محلات ومصانع الذهب والمجوهرات © ${new Date().getFullYear()}
          </td>
        </tr>
      </table>

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
