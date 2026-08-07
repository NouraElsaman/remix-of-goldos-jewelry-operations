import { Printer, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { Invoice } from "@/types/domain";

export interface ReceiptModalProps {
  invoice: any; // Accept any to handle both parsed model and database row casings
  onClose: () => void;
}

export function ReceiptModal({ invoice, onClose }: ReceiptModalProps) {
  const { locale } = useI18n();

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

  const triggerPrint = () => {
    window.print();
  };

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

        {/* Printable Receipt Frame */}
        <div id="receipt-print-area" className="text-center font-sans py-4 print:py-8">
          {/* Shop Logo/Name */}
          <h1 className="text-xl font-extrabold tracking-wide mb-1">
            {locale === "ar" ? "مجوهرات الأصالة" : "Al Asala Jewelry"}
          </h1>
          <p className="text-xs text-muted-foreground mb-4">
            {locale === "ar" ? "المنصورة، مصر · ت: 01012345678" : "Mansoura, Egypt · Tel: 01012345678"}
          </p>

          <div className="border-y border-dashed border-border/80 my-4 py-3 text-start text-xs space-y-1.5 leading-relaxed">
            <div>
              <strong>{locale === "ar" ? "رقم الفاتورة:" : "Invoice #:"}</strong> {num}
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
              <div>
                <strong>{locale === "ar" ? "الهاتف:" : "Phone:"}</strong> {phone}
              </div>
            )}
          </div>

          {/* Items details table */}
          <table className="w-full text-xs text-start my-4">
            <thead>
              <tr className="border-b font-bold">
                <th className="py-2">{locale === "ar" ? "الصنف" : "Item"}</th>
                <th className="py-2 text-end">{locale === "ar" ? "الوزن" : "Weight"}</th>
                <th className="py-2 text-end">{locale === "ar" ? "الصافي" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2.5">
                  {type === "sale" ? (
                    locale === "ar" ? `ذهب عيار ${karat}` : `Gold ${karat}K`
                  ) : (
                    locale === "ar" ? `شراء ذهب كسر عيار ${karat}` : `Buy scrap ${karat}K`
                  )}
                </td>
                <td className="py-2.5 text-end font-mono">{weight} جم</td>
                <td className="py-2.5 text-end font-mono">{Number(totalVal).toLocaleString()} ج.م</td>
              </tr>
            </tbody>
          </table>

          {/* Receipt Totals */}
          <div className="border-t border-dashed border-border/80 pt-3 text-xs space-y-1.5 text-end font-mono">
            {type === "sale" && (
              <>
                <div className="flex justify-between">
                  <span>{locale === "ar" ? "المجموع الفرعي:" : "Subtotal:"}</span>
                  <span>{Number(subtotalVal).toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>{locale === "ar" ? "ضريبة القيمة المضافة:" : "VAT:"}</span>
                  <span>{Number(taxVal).toLocaleString()} ج.م</span>
                </div>
              </>
            )}
            {Number(deductVal) > 0 && (
              <div className="flex justify-between">
                <span>{locale === "ar" ? "نسبة الخصم:" : "Deduction %:"}</span>
                <span>{deductVal}%</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold border-t pt-1.5 text-foreground">
              <span>{locale === "ar" ? "الإجمالي النهائي:" : "Grand Total:"}</span>
              <span>{Number(totalVal).toLocaleString()} ج.م</span>
            </div>
          </div>

          {/* ID image attached label (for purchase compliance) */}
          {idImg && (
            <div className="mt-5 flex flex-col gap-3 items-center border border-dashed border-emerald-500/30 bg-emerald-500/5 text-emerald-700 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[10px]">
                <CheckCircle className="size-3.5" />
                <span>{locale === "ar" ? "تم أرشفة الهوية الوطنية للبائع بنجاح" : "Seller National ID archived successfully"}</span>
              </div>
              <a 
                href={idImg} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] text-emerald-800 underline hover:text-emerald-950 font-bold print:hidden"
              >
                {locale === "ar" ? "عرض صورة الهوية المرفقة" : "View Attached ID Photo"}
              </a>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-8 text-[10px] text-muted-foreground leading-relaxed border-t pt-4">
            {locale === "ar" ? (
              <>
                شكراً لتعاملكم معنا!
                <br />
                فاتورة رسمية صادرة عن نظام جوهرة تك
              </>
            ) : (
              <>
                Thank you for your business!
                <br />
                Official Invoice generated via Jawhara Tech
              </>
            )}
          </div>
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
            {locale === "ar" ? "طباعة الفاتورة" : "Print Receipt"}
          </Button>
        </div>
      </div>

      {/* Styled Printable Styles via style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
