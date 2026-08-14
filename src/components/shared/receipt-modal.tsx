import { useQuery } from "@tanstack/react-query";
import { Printer, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { services } from "@/services";

export interface ReceiptModalProps {
  invoice: any; // Accept any to handle both parsed model and database row casings
  onClose: () => void;
}

export function ReceiptModal({ invoice, onClose }: ReceiptModalProps) {
  const { locale } = useI18n();

  // Store identity, invoice header and footer all come from Settings.
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => services.settings.get(),
  });

  const logoUrl = settings?.logoUrl ?? "";
  const storeName =
    (locale === "ar" ? settings?.shopNameAr : settings?.shopName) ??
    settings?.shopNameAr ??
    "";
  
  const fullAddressStr = [
    settings?.address,
    settings?.city,
    settings?.governorate,
  ]
    .filter(Boolean)
    .join("، ");

  const storePhone = settings?.phone ?? "";
  const commercialRegister = settings?.commercialRegister ?? "";
  const taxId = settings?.taxId ?? "";

  const taxAndRegisterStr = [
    commercialRegister
      ? locale === "ar"
        ? `س.ت: ${commercialRegister}`
        : `C.R: ${commercialRegister}`
      : "",
    taxId
      ? locale === "ar"
        ? `ب.ض: ${taxId}`
        : `Tax ID: ${taxId}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const receiptHeader = settings?.receiptHeader ?? "";
  const receiptFooter = settings?.receiptFooter ?? "";
  const returnPolicy = settings?.returnPolicy ?? "";

  const money = (val: unknown) =>
    `${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
  const grams = (val: unknown) =>
    `${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

  // Normalize properties supporting both frontend types and database row names
  const num = invoice.number || invoice.invoice_number || "";
  const type = invoice.transactionType || invoice.transaction_type || "sale";
  const dateStr = invoice.createdAt || invoice.created_at || new Date().toISOString();
  const name = invoice.customerName || invoice.customer_name || "";
  const phone = invoice.customerPhone || invoice.customer_phone || "";
  const karat = invoice.karat || "";
  const weight = invoice.weight || invoice.total_weight || 0;
  const totalVal = invoice.total || invoice.final_total || 0;
  
  // Calculate subtotal and tax fallback
  const goldVal = Number(invoice.gold_value || 0);
  const handworkVal = Number(invoice.handwork_value || invoice.handworkValue || 0);
  const subtotalVal = invoice.subtotal || (goldVal + handworkVal) || totalVal;
  const taxVal = invoice.tax !== undefined ? invoice.tax : (invoice.tax_value || 0);
  
  const deductVal = invoice.deductionPct !== undefined ? invoice.deductionPct : (invoice.deduction_pct || 0);
  const idImg = invoice.idImageUrl || invoice.id_image_url || "";
  const itemSku = invoice.itemSku || invoice.item_sku || "";
  const itemName = invoice.itemName || invoice.item_name || "";
  const company = invoice.itemCompany || invoice.item_company || invoice.company || "";

  const triggerPrint = () => {
    window.print();
  };

  const renderCopy = (copyLabel: string, isSecondCopy = false) => (
    <div className={`receipt-copy text-start ${isSecondCopy ? "receipt-copy-2 mt-6 pt-6 border-t-2 border-dashed border-border/80" : ""}`}>
      <div className="mb-2 text-center">
        <span className="inline-block rounded-full bg-surface-muted border border-border/60 px-3 py-0.5 text-[10px] font-bold text-muted-foreground">
          {copyLabel}
        </span>
      </div>

      {/* Shop Logo */}
      {logoUrl ? (
        <div className="mb-2 flex justify-center">
          <img
            src={logoUrl}
            alt={storeName}
            className="h-14 w-auto max-w-[130px] object-contain print:h-14"
          />
        </div>
      ) : null}

      {/* Shop Name */}
      {storeName ? (
        <h1 className="text-center text-lg font-extrabold tracking-wide mb-1 text-foreground">
          {storeName}
        </h1>
      ) : null}

      {/* Full Detailed Address & Phone */}
      {fullAddressStr || storePhone ? (
        <p className="text-center text-xs text-muted-foreground mb-1 leading-relaxed" dir="rtl">
          {[fullAddressStr, storePhone].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {/* Commercial Register & Tax ID */}
      {taxAndRegisterStr ? (
        <p className="text-center text-[11px] font-mono text-muted-foreground/90 mb-1 font-semibold" dir="rtl">
          {taxAndRegisterStr}
        </p>
      ) : null}

      {/* Additional Receipt Header */}
      {receiptHeader ? (
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground mb-2 whitespace-pre-line">
          {receiptHeader}
        </p>
      ) : null}

      <div className="border-y border-dashed border-border/80 my-3 py-2 text-start text-xs space-y-1 leading-relaxed">
        <div className="flex items-start justify-between gap-3">
          <strong>{locale === "ar" ? "رقم الفاتورة:" : "Invoice #:"}</strong>
          <span className="font-mono" dir="ltr">{num}</span>
        </div>
        <div>
          <strong>{locale === "ar" ? "نوع العملية:" : "Type:"}</strong>{" "}
          {type === "sale" ? (locale === "ar" ? "فاتورة بيع" : "Sale Invoice") : (locale === "ar" ? "فاتورة شراء ذهب كسر" : "Purchase (Old Gold)")}
        </div>
        <div>
          <strong>{locale === "ar" ? "التاريخ:" : "Date:"}</strong> {new Date(dateStr).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
        </div>
        {name && (
          <div>
            <strong>{locale === "ar" ? "العميل:" : "Customer:"}</strong> {name}
          </div>
        )}
        {phone && (
          <div className="flex items-start justify-between gap-3">
            <strong>{locale === "ar" ? "الهاتف:" : "Phone:"}</strong>
            <span className="font-mono" dir="ltr">{phone}</span>
          </div>
        )}
      </div>

      {/* Item details */}
      <div className="my-3 rounded-xl border border-border/70 p-2.5 text-start text-xs">
        <div className="mb-1.5 border-b border-dashed border-border/70 pb-1.5 font-bold text-foreground">
          {type === "sale"
            ? locale === "ar"
              ? `ذهب عيار ${karat}`
              : `Gold ${karat}K`
            : locale === "ar"
              ? `شراء ذهب كسر عيار ${karat}`
              : `Buy scrap ${karat}K`}
        </div>
        <dl className="space-y-1">
          {itemName ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">
                {locale === "ar" ? "اسم القطعة" : "Item name"}
              </dt>
              <dd className="max-w-[60%] text-end font-semibold">{itemName}</dd>
            </div>
          ) : null}
          {itemSku ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">
                {locale === "ar" ? "كود القطعة" : "SKU"}
              </dt>
              <dd className="font-mono" dir="ltr">{itemSku}</dd>
            </div>
          ) : null}
          {company ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">
                {locale === "ar" ? "الشركة المصنعة" : "Manufacturer"}
              </dt>
              <dd className="max-w-[60%] text-end font-semibold">{company}</dd>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">
              {locale === "ar" ? "الوزن (جرام)" : "Weight (g)"}
            </dt>
            <dd className="font-mono" dir="ltr">{grams(weight)}</dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-dashed border-border/70 pt-1 font-bold text-foreground">
            <dt>{locale === "ar" ? "الصافي" : "Net value"}</dt>
            <dd className="font-mono" dir="ltr">{money(totalVal)}</dd>
          </div>
        </dl>
      </div>

      {/* Receipt Totals */}
      <div className="border-t border-dashed border-border/80 pt-2.5 text-xs space-y-1 text-start">
        {type === "sale" && (
          <>
            <div className="flex justify-between">
              <span>{locale === "ar" ? "المجموع الفرعي:" : "Subtotal:"}</span>
              <span className="font-mono" dir="ltr">{money(subtotalVal)}</span>
            </div>
            {Number(taxVal) > 0 && (
              <div className="flex justify-between">
                <span>{locale === "ar" ? "ضريبة القيمة المضافة:" : "VAT:"}</span>
                <span className="font-mono" dir="ltr">{money(taxVal)}</span>
              </div>
            )}
          </>
        )}
        {Number(deductVal) > 0 && (
          <div className="flex justify-between">
            <span>{locale === "ar" ? "نسبة الخصم:" : "Deduction %:"}</span>
            <span className="font-mono" dir="ltr">{deductVal}%</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-extrabold border-t pt-1 text-foreground">
          <span>{locale === "ar" ? "الإجمالي النهائي:" : "Grand Total:"}</span>
          <span className="font-mono" dir="ltr">{money(totalVal)}</span>
        </div>
      </div>

      {/* ID image attached label (for purchase compliance) */}
      {idImg && (
        <div className="mt-3 flex flex-col gap-2 items-center border border-dashed border-emerald-500/30 bg-emerald-500/5 text-emerald-700 rounded-xl p-2.5 text-center">
          <div className="flex items-center gap-1.5 text-[10px]">
            <CheckCircle className="size-3.5" />
            <span>{locale === "ar" ? "تم أرشفة الهوية الوطنية للبائع بنجاح" : "Seller National ID archived successfully"}</span>
          </div>
        </div>
      )}

      {/* Footer info — driven by Invoice Settings */}
      <div className="mt-4 space-y-1 border-t pt-2.5 text-[10px] leading-relaxed text-muted-foreground text-center">
        {receiptFooter ? (
          <p className="whitespace-pre-line">{receiptFooter}</p>
        ) : null}
        {returnPolicy ? (
          <p className="whitespace-pre-line">{returnPolicy}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto print:absolute print:inset-0 print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-h-full">
        {/* Modal Actions */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h2 className="text-lg font-bold text-foreground">
            {locale === "ar" ? "تفاصيل الفاتورة" : "Invoice Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            {locale === "ar" ? "إغلاق" : "Close"}
          </button>
        </div>

        {/* Printable Receipt Frame rendering 2 copies */}
        <div id="receipt-print-area" dir="rtl" className="font-sans py-2 print:py-4">
          {renderCopy(locale === "ar" ? "نسخة العميل — Customer Copy" : "Customer Copy", false)}
          {renderCopy(locale === "ar" ? "نسخة المحل (الأرشيف) — Store Copy" : "Store Copy", true)}
        </div>

        {/* Modal Bottom Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6 print:hidden">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl h-11"
          >
            {locale === "ar" ? "إغلاق" : "Close"}
          </Button>
          <Button
            variant="gold"
            onClick={triggerPrint}
            className="rounded-xl h-11 gap-2"
          >
            <Printer className="size-4" />
            {locale === "ar" ? "طباعة الفاتورة (نسختان)" : "Print Receipt (2 Copies)"}
          </Button>
        </div>
      </div>

      {/* Strict Printable CSS resetting page height & preventing extra blank pages */}
      <style>{`
        @media print {
          @page {
            margin: 4mm;
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
          #receipt-print-area, #receipt-print-area * {
            visibility: visible !important;
          }
          #receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
          }
          .receipt-copy {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .receipt-copy-2 {
            margin-top: 1.5rem !important;
            padding-top: 1.5rem !important;
            border-top: 2px dashed #6b7280 !important;
          }
        }
      `}</style>
    </div>
  );
}
