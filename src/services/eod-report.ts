import { supabase } from "@/services/supabase/supabase-provider";
import { services } from "@/services";
import { sendEmailViaResend } from "@/services/send-email-fn";
import { generateEODPdfBuffer, getEODPdfAttachmentFilename } from "@/services/eod-pdf";

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
 * Generates email-bulletproof HTML template matching the website modal 100% in full RTL.
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
  <body dir="rtl" style="margin: 0; padding: 12px; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl !important; text-align: right !important;">
    
    <!-- Outer Wrapper Table -->
    <table dir="rtl" align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; direction: rtl !important;">
      
      <!-- Store Brand Header -->
      <tr>
        <td dir="rtl" align="center" style="background-color: #1e293b; border-bottom: 3px solid #d97706; padding: 20px; text-align: center !important; color: #fbbf24;">
          <h1 style="margin: 0; font-size: 20px; color: #fbbf24; font-weight: 800;">👑 ${metrics.shopName}</h1>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">تقرير الإغلاق اليومي ومطابقة الخزينة</p>
          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 11px;">📅 ${formattedDate} &nbsp;|&nbsp; 👤 المالك: ${metrics.ownerName}</p>
        </td>
      </tr>

      <!-- Main Content Cell -->
      <tr>
        <td dir="rtl" align="right" style="padding: 16px; direction: rtl !important; text-align: right !important;">
          
          <!-- SECTION 1: 4 KPI CARDS IN A 2x2 GRID (No compression, high legibility) -->
          <table dir="rtl" align="right" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; direction: rtl !important; width: 100%;">
            <!-- Row 1 -->
            <tr>
              <td width="48%" dir="rtl" align="right" style="padding: 4px;">
                <table dir="rtl" width="100%" cellpadding="10" cellspacing="0" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; text-align: center;">
                  <tr>
                    <td align="center" style="text-align: center !important;">
                      <div style="font-size: 11px; font-weight: 700; color: #047857; margin-bottom: 2px;">صافي التدفق النقدي</div>
                      <div style="font-size: 15px; font-weight: 800; font-family: monospace; color: #059669;" dir="ltr">${metrics.netCashFlow.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td width="48%" dir="rtl" align="right" style="padding: 4px;">
                <table dir="rtl" width="100%" cellpadding="10" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; text-align: center;">
                  <tr>
                    <td align="center" style="text-align: center !important;">
                      <div style="font-size: 11px; font-weight: 700; color: #b45309; margin-bottom: 2px;">أرباح المصنعية</div>
                      <div style="font-size: 15px; font-weight: 800; font-family: monospace; color: #d97706;" dir="ltr">${metrics.totalHandworkEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Row 2 -->
            <tr>
              <td width="48%" dir="rtl" align="right" style="padding: 4px;">
                <table dir="rtl" width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
                  <tr>
                    <td align="center" style="text-align: center !important;">
                      <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 2px;">المبيعات (${metrics.salesCount})</div>
                      <div style="font-size: 15px; font-weight: 800; font-family: monospace; color: #0f172a;" dir="ltr">${metrics.totalSalesRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td width="48%" dir="rtl" align="right" style="padding: 4px;">
                <table dir="rtl" width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
                  <tr>
                    <td align="center" style="text-align: center !important;">
                      <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 2px;">مشتريات الكسر (${metrics.scrapCount})</div>
                      <div style="font-size: 15px; font-weight: 800; font-family: monospace; color: #0f172a;" dir="ltr">${metrics.totalScrapPayout.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- SECTION 2: GOLD WEIGHT MOVEMENTS BOX -->
          <table dir="rtl" align="right" width="100%" cellpadding="12" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; background-color: #ffffff; direction: rtl !important; width: 100%;">
            <tr>
              <td dir="rtl" align="right" style="border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a; padding: 10px 12px;">
                📦 حركة أوزان الذهب اليومية (جرام)
              </td>
            </tr>
            <tr>
              <td dir="rtl" align="right" style="padding: 12px;">
                <table dir="rtl" align="right" width="100%" cellpadding="0" cellspacing="0" style="direction: rtl !important; width: 100%;">
                  <tr>
                    <!-- Right Column: Sold Weights -->
                    <td width="50%" dir="rtl" align="right" valign="top" style="padding-left: 8px;">
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px;">المباع حسب العيار:</div>
                      <table dir="rtl" width="100%" cellpadding="3" cellspacing="0" style="font-size: 12px; font-family: monospace;">
                        <tr>
                          <td dir="rtl" align="right" style="color: #334155;">عيار 21:</td>
                          <td dir="rtl" align="left" style="font-weight: 800; color: #0f172a;">${metrics.soldWeightsByKarat[21].toFixed(3)} جم</td>
                        </tr>
                        <tr>
                          <td dir="rtl" align="right" style="color: #334155;">عيار 18:</td>
                          <td dir="rtl" align="left" style="font-weight: 800; color: #0f172a;">${metrics.soldWeightsByKarat[18].toFixed(3)} جم</td>
                        </tr>
                        <tr>
                          <td dir="rtl" align="right" style="color: #334155;">عيار 24:</td>
                          <td dir="rtl" align="left" style="font-weight: 800; color: #0f172a;">${metrics.soldWeightsByKarat[24].toFixed(3)} جم</td>
                        </tr>
                      </table>
                    </td>

                    <!-- Left Column: Scrap Weights -->
                    <td width="50%" dir="rtl" align="right" valign="top" style="padding-right: 8px; border-right: 1px solid #f1f5f9;">
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px;">الكسر المشتري حسب العيار:</div>
                      <table dir="rtl" width="100%" cellpadding="3" cellspacing="0" style="font-size: 12px; font-family: monospace;">
                        <tr>
                          <td dir="rtl" align="right" style="color: #334155;">عيار 21:</td>
                          <td dir="rtl" align="left" style="font-weight: 800; color: #0f172a;">${metrics.scrapWeightsByKarat[21].toFixed(3)} جم</td>
                        </tr>
                        <tr>
                          <td dir="rtl" align="right" style="color: #334155;">عيار 18:</td>
                          <td dir="rtl" align="left" style="font-weight: 800; color: #0f172a;">${metrics.scrapWeightsByKarat[18].toFixed(3)} جم</td>
                        </tr>
                        <tr>
                          <td dir="rtl" align="right" style="color: #334155;">عيار 24:</td>
                          <td dir="rtl" align="left" style="font-weight: 800; color: #0f172a;">${metrics.scrapWeightsByKarat[24].toFixed(3)} جم</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- SECTION 3: SAFE WEIGHT RECONCILIATION TABLE (Compact & Perfectly Spaced) -->
          <table dir="rtl" align="right" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; direction: rtl !important; width: 100%;">
            <tr>
              <td dir="rtl" align="right" style="border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a; padding: 10px 12px;">
                ⚖️ مطابقة خزينة الذهب والفرق (بالجرام)
              </td>
            </tr>
            <tr>
              <td dir="rtl" align="right" style="padding: 8px;">
                <table dir="rtl" align="right" width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 11px; direction: rtl !important;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b;">
                      <th dir="rtl" align="right" style="padding: 6px 4px; text-align: right !important;">العيار</th>
                      <th dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">الافتتاحي</th>
                      <th dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">المستلم</th>
                      <th dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">المباع</th>
                      <th dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">المتوقع</th>
                      <th dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">الفعلي</th>
                      <th dir="rtl" align="left" style="padding: 6px 4px; text-align: left !important;">الفرق</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${metrics.reconciliationRows
                      .map(
                        (r) => `
                      <tr style="border-bottom: 1px solid #f1f5f9; font-family: monospace;">
                        <td dir="rtl" align="right" style="padding: 6px 4px; font-weight: 800; font-family: sans-serif; text-align: right !important; color: #0f172a;">${r.karat}K</td>
                        <td dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">${r.openingWeight.toFixed(3)}</td>
                        <td dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">${r.receivedWeight.toFixed(3)}</td>
                        <td dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">${r.soldWeight.toFixed(3)}</td>
                        <td dir="rtl" align="center" style="padding: 6px 4px; font-weight: 700; text-align: center !important; color: #0f172a;">${r.expectedWeight.toFixed(3)}</td>
                        <td dir="rtl" align="center" style="padding: 6px 4px; text-align: center !important;">${r.countedWeight !== null ? r.countedWeight.toFixed(3) : "-"}</td>
                        <td dir="rtl" align="left" style="padding: 6px 4px; font-weight: 800; color: ${r.variance === 0 ? "#059669" : (r.variance || 0) > 0 ? "#2563eb" : "#dc2626"}; text-align: left !important;">
                          ${r.variance !== null ? (r.variance >= 0 ? `+${r.variance.toFixed(3)}` : r.variance.toFixed(3)) : "-"}
                        </td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- Total Variance Summary Bar -->
            <tr>
              <td dir="rtl" style="padding: 8px 12px; border-top: 1px dashed #cbd5e1; background-color: #f8fafc;">
                <table dir="rtl" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td dir="rtl" align="right" style="font-size: 11px; font-weight: 700; color: #475569;">
                      إجمالي فرق الوزن لليوم:
                    </td>
                    <td dir="rtl" align="left" style="font-size: 12px; font-weight: 800; font-family: monospace; color: ${metrics.totalVariance === 0 ? "#059669" : "#dc2626"}; text-align: left !important;">
                      ${metrics.totalVariance >= 0 ? `+${metrics.totalVariance.toFixed(3)}` : metrics.totalVariance.toFixed(3)} جم
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- Footer Notice -->
      <tr>
        <td dir="rtl" align="center" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px; text-align: center !important; font-size: 11px; color: #64748b;">
          منصة جوهرة تك لإدارة محلات ومصانع الذهب والمجوهرات © ${new Date().getFullYear()}
        </td>
      </tr>

    </table>

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

    // Generate PDF attachment named after the day and date
    let attachments: Array<{ filename: string; content: string }> | undefined;
    try {
      const pdfBuffer = generateEODPdfBuffer(metrics);
      const pdfFilename = getEODPdfAttachmentFilename(metrics);
      attachments = [
        {
          filename: pdfFilename,
          content: pdfBuffer.toString("base64"),
        },
      ];
    } catch (pdfErr) {
      console.error("Failed to generate PDF attachment:", pdfErr);
    }

    // Call serverFn to dispatch via Resend
    const res = await sendEmailViaResend({
      data: {
        to: toEmail,
        subject,
        html,
        attachments,
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
