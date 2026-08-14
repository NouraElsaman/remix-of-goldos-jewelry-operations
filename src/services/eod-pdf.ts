import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { AMIRI_FONT_BASE64 } from "@/assets/amiri-font-base64";
import type { EODReportMetrics } from "@/services/eod-report";

/**
 * Returns the Arabic PDF filename formatted with the Day Name and Date.
 * Example: "تقرير_الإغلاق_الجمعة_2026-08-14.pdf"
 */
export function getEODPdfAttachmentFilename(metrics: EODReportMetrics): string {
  const dayName = new Date(metrics.date).toLocaleDateString("ar-EG", { weekday: "long" });
  return `تقرير_الإغلاق_${dayName}_${metrics.date}.pdf`;
}

/**
 * Generates an executive PDF document buffer for the EOD Report.
 */
export function generateEODPdfBuffer(metrics: EODReportMetrics): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.addFileToVFS("Amiri-Regular.ttf", AMIRI_FONT_BASE64);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  doc.setFont("Amiri");

  const formattedDate = new Date(metrics.date).toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // Dark slate
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(251, 191, 36); // Gold
  doc.setFontSize(20);
  doc.text(`👑 ${metrics.shopName}`, 105, 14, { align: "center", isRTL: true });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("تقرير الإغلاق اليومي ومطابقة الخزينة", 105, 23, { align: "center", isRTL: true });

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(10);
  doc.text(`📅 ${formattedDate}  |  👤 المالك: ${metrics.ownerName}`, 105, 31, { align: "center", isRTL: true });

  let startY = 46;

  // 2. Executive Financial KPIs Table
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text("💰 المؤشرات المالية لليوم", 195, startY, { align: "right", isRTL: true });
  startY += 4;

  const kpiData = [
    [
      `${metrics.totalHandworkEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`,
      "أرباح المصنعية",
      `${metrics.netCashFlow.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`,
      "صافي التدفق النقدي",
    ],
    [
      `${metrics.totalScrapPayout.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`,
      `مشتريات الكسر (${metrics.scrapCount})`,
      `${metrics.totalSalesRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`,
      `المبيعات (${metrics.salesCount})`,
    ],
  ];

  autoTable(doc, {
    startY,
    body: kpiData,
    styles: { font: "Amiri", fontSize: 10, halign: "center", cellPadding: 4 },
    headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: "normal" },
    margin: { left: 15, right: 15 },
  });

  startY = (doc as any).lastAutoTable.finalY + 10;

  // 3. Daily Gold Weight Movements Table
  doc.text("📦 حركة أوزان الذهب اليومية (جرام)", 195, startY, { align: "right", isRTL: true });
  startY += 4;

  const weightData = [
    [`${metrics.scrapWeightsByKarat[21].toFixed(3)} جم`, "عيار 21 (كسر)", `${metrics.soldWeightsByKarat[21].toFixed(3)} جم`, "عيار 21 (مباع)"],
    [`${metrics.scrapWeightsByKarat[18].toFixed(3)} جم`, "عيار 18 (كسر)", `${metrics.soldWeightsByKarat[18].toFixed(3)} جم`, "عيار 18 (مباع)"],
    [`${metrics.scrapWeightsByKarat[24].toFixed(3)} جم`, "عيار 24 (كسر)", `${metrics.soldWeightsByKarat[24].toFixed(3)} جم`, "عيار 24 (مباع)"],
  ];

  autoTable(doc, {
    startY,
    head: [["وزن الكسر المشتري", "العيار", "الوزن المباع", "العيار"]],
    body: weightData,
    styles: { font: "Amiri", fontSize: 10, halign: "center", cellPadding: 3.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "normal" },
    margin: { left: 15, right: 15 },
  });

  startY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Safe Reconciliation & Variance Table
  doc.text("⚖️ مطابقة خزينة الذهب والفرق (جرام)", 195, startY, { align: "right", isRTL: true });
  startY += 4;

  const reconHeaders = [["الفرق", "الفعلي", "المتوقع", "المباع", "المستلم", "الافتتاحي", "العيار"]];
  const reconData = metrics.reconciliationRows.map((r) => [
    r.variance !== null ? (r.variance >= 0 ? `+${r.variance.toFixed(3)}` : r.variance.toFixed(3)) : "-",
    r.countedWeight !== null ? r.countedWeight.toFixed(3) : "-",
    r.expectedWeight.toFixed(3),
    r.soldWeight.toFixed(3),
    r.receivedWeight.toFixed(3),
    r.openingWeight.toFixed(3),
    `${r.karat}K`,
  ]);

  reconData.push([
    metrics.totalVariance >= 0 ? `+${metrics.totalVariance.toFixed(3)} جم` : `${metrics.totalVariance.toFixed(3)} جم`,
    "إجمالي فرق الوزن لليوم:",
    "",
    "",
    "",
    "",
    "",
  ]);

  autoTable(doc, {
    startY,
    head: reconHeaders,
    body: reconData,
    styles: { font: "Amiri", fontSize: 9.5, halign: "center", cellPadding: 3.5 },
    headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "normal" },
    margin: { left: 15, right: 15 },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height || 297;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`منصة جوهرة تك لإدارة محلات ومصانع الذهب والمجوهرات © ${new Date().getFullYear()}`, 105, pageHeight - 10, {
    align: "center",
    isRTL: true,
  });

  return Buffer.from(doc.output("arraybuffer"));
}
