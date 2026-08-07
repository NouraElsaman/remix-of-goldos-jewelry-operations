import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ScanLine, ShoppingCart, Camera, Printer, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader, SectionCard, ReceiptModal } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import { queryKeys, services } from "@/services";
import { supabase } from "@/services/supabase/supabase-provider";

export const Route = createFileRoute("/_authenticated/cashier/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/cashier")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "الكاشير — جوهرة تك" },
      {
        name: "description",
        content: "إصدار الفواتير ونقطة بيع الذهب والمجوهرات.",
      },
    ],
  }),
  component: CashierPage,
});

function CashierPage() {
  const { t, locale, isRTL } = useI18n();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"sale" | "purchase">("sale");

  // ── Sale Calculator States ────────────────────────────────────────────────
  const [saleWeight, setSaleWeight] = useState<string>("");
  const [saleKarat, setSaleKarat] = useState<number>(21);
  const [saleGoldPrice, setSaleGoldPrice] = useState<string>("");
  const [saleHandwork, setSaleHandwork] = useState<string>("");
  const [saleCustomerName, setSaleCustomerName] = useState<string>("");
  const [saleCustomerPhone, setSaleCustomerPhone] = useState<string>("");
  const [salePaymentMethod, setSalePaymentMethod] = useState<string>("cash");
  const [saleItemType, setSaleItemType] = useState<string>("ring");
  const [isSalePriceManuallyEdited, setIsSalePriceManuallyEdited] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  // ── Walk-in Purchase States ───────────────────────────────────────────────
  const [purchaseWeight, setPurchaseWeight] = useState<string>("");
  const [purchaseKarat, setPurchaseKarat] = useState<string>("20.5");
  const [purchase24KPrice, setPurchase24KPrice] = useState<string>("");
  const [purchaseDeduction, setPurchaseDeduction] = useState<string>("2"); // 2% default
  const [purchaseCustomerName, setPurchaseCustomerName] = useState<string>("");
  const [purchaseCustomerPhone, setPurchaseCustomerPhone] = useState<string>("");
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<string>("cash");
  const [purchaseItemType, setPurchaseItemType] = useState<string>("ring");
  const [isPurchasePriceManuallyEdited, setIsPurchasePriceManuallyEdited] = useState<boolean>(false);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // ── Receipt Print Modal State ─────────────────────────────────────────────
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: todayPrices = [] } = useQuery({
    queryKey: queryKeys.goldPrices.today(),
    queryFn: () => services.goldPrices.today(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Today's 24K buy rate reference
  const rate24KBuy = todayPrices.find((p) => p.karat === 24)?.rateBuy || 3880;

  // Query available finished inventory items from database
  const { data: availableItems = [] } = useQuery({
    queryKey: ["inventory", "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("status", "in_stock");

      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        karat: Number(row.karat),
        grossWeight: Number(row.gross_weight),
        stoneWeight: Number(row.stone_weight),
        netWeight: Number(row.net_weight),
        manufacturingCost: Number(row.manufacturing_cost),
        trayId: row.tray_id || null,
        status: row.status,
      }));
    },
  });

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    if (!id) {
      setSaleWeight("");
      setSaleHandwork("");
      return;
    }

    const item = availableItems.find((item) => item.id === id);
    if (item) {
      setSaleKarat(item.karat);
      setSaleWeight(String(item.netWeight));
      setSaleHandwork(String(item.manufacturingCost));

      const skuLower = item.sku.toLowerCase();
      if (skuLower.startsWith("rng")) {
        setSaleItemType("ring");
      } else if (skuLower.startsWith("nck")) {
        setSaleItemType("necklace");
      } else if (skuLower.startsWith("brc")) {
        setSaleItemType("bracelet");
      } else {
        setSaleItemType("other");
      }

      const rate = todayPrices.find((p) => p.karat === item.karat)?.rate || 0;
      if (rate) {
        setSaleGoldPrice(String(rate));
        setIsSalePriceManuallyEdited(false);
      }
    }
  };

  // Auto-fill gold price when sale karat changes or database price loads
  useEffect(() => {
    const rate = todayPrices.find((p) => p.karat === saleKarat)?.rate || 0;
    if (rate && !isSalePriceManuallyEdited) {
      setSaleGoldPrice(String(rate));
    }
  }, [saleKarat, todayPrices, isSalePriceManuallyEdited]);

  // Auto-fill 24K buy price when page loads / database price loads
  useEffect(() => {
    if (rate24KBuy && !isPurchasePriceManuallyEdited) {
      setPurchase24KPrice(String(rate24KBuy));
    }
  }, [rate24KBuy, isPurchasePriceManuallyEdited]);

  // ── Sale Calculations ─────────────────────────────────────────────────────
  const weightVal = parseFloat(saleWeight) || 0;
  const goldPriceVal = parseFloat(saleGoldPrice) || 0;
  const handworkVal = parseFloat(saleHandwork) || 0;

  const saleGoldValue = weightVal * goldPriceVal;
  const saleHandworkValue = weightVal * handworkVal;
  const saleSubtotal = saleGoldValue + saleHandworkValue;
  const saleTaxValue = saleHandworkValue * 0.14; // VAT 14% on labor only
  const saleFinalTotal = saleSubtotal + saleTaxValue;

  // ── Purchase Calculations ──────────────────────────────────────────────────
  const pWeightVal = parseFloat(purchaseWeight) || 0;
  const pKaratVal = parseFloat(purchaseKarat) || 20.5;
  const pDeductionVal = parseFloat(purchaseDeduction) || 0;
  const p24BuyVal = parseFloat(purchase24KPrice) || rate24KBuy;

  // Buying Rate of Karat = 24K Buy Rate * (Karat / 24)
  const purchaseCalculatedRate = p24BuyVal * (pKaratVal / 24);
  const purchaseNetWeight = pWeightVal * (1 - pDeductionVal / 100);
  const purchaseFinalPayout = purchaseNetWeight * purchaseCalculatedRate;

  // ── Mutation for Invoices ─────────────────────────────────────────────────
  const createInvoiceMutation = useMutation({
    mutationFn: (newInvoice: any) => services.sales.createInvoice(newInvoice),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setLastInvoice(data);
      toast.success(
        locale === "ar"
          ? "تم حفظ الفاتورة بنجاح"
          : "Invoice registered successfully"
      );
      resetForms();
    },
    onError: () => {
      toast.error(
        locale === "ar" ? "حدث خطأ أثناء حفظ الفاتورة" : "Failed to save invoice"
      );
    },
  });

  const resetForms = () => {
    setSaleWeight("");
    setSaleHandwork("");
    setSaleCustomerName("");
    setSaleCustomerPhone("");
    setSaleItemType("ring");
    setIsSalePriceManuallyEdited(false);
    setSelectedItemId("");
    setPurchaseWeight("");
    setPurchaseCustomerName("");
    setPurchaseCustomerPhone("");
    setPurchaseItemType("ring");
    setIsPurchasePriceManuallyEdited(false);
    setIdPhoto(null);
    setIdPhotoPreview(null);
  };

  // ── Photo snapshot handling ────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdPhoto(file);
      const url = URL.createObjectURL(file);
      setIdPhotoPreview(url);
    }
  };

  const uploadIdPhoto = async (file: File, invoiceNumber: string): Promise<string> => {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${invoiceNumber}.${fileExt}`;
    const filePath = `id-cards/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("customer-ids")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("customer-ids").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // ── Submission Handler ────────────────────────────────────────────────────
  const handleFinalizeSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleWeight || !saleGoldPrice || !saleHandwork) {
      toast.error(locale === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    if (!saleCustomerName || !saleCustomerPhone) {
      toast.error(locale === "ar" ? "اسم العميل ورقم الهاتف مطلوبان" : "Customer name and phone number are required");
      return;
    }

    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(saleCustomerPhone)) {
      toast.error(locale === "ar" ? "رقم الهاتف يجب أن يتكون من 11 رقماً فقط" : "Phone number must be exactly 11 digits");
      return;
    }

    createInvoiceMutation.mutate({
      transactionType: "sale",
      customerName: saleCustomerName,
      customerPhone: saleCustomerPhone,
      weight: weightVal,
      karat: saleKarat,
      subtotal: saleSubtotal,
      handwork_value: saleHandworkValue,
      tax: saleTaxValue,
      total: saleFinalTotal,
      paymentMethod: salePaymentMethod,
      itemType: saleItemType,
      itemId: selectedItemId || undefined,
    });
  };

  const handleFinalizePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseWeight || !purchaseKarat) {
      toast.error(locale === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    if (!purchaseCustomerName || !purchaseCustomerPhone) {
      toast.error(locale === "ar" ? "اسم العميل ورقم الهاتف مطلوبان" : "Customer name and phone number are required");
      return;
    }

    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(purchaseCustomerPhone)) {
      toast.error(locale === "ar" ? "رقم الهاتف يجب أن يتكون من 11 رقماً فقط" : "Phone number must be exactly 11 digits");
      return;
    }

    setIsUploading(true);
    let idImageUrl = "";
    try {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const generatedNumber = `PUR-${dateStr}-${randomNum}`;

      if (idPhoto) {
        idImageUrl = await uploadIdPhoto(idPhoto, generatedNumber);
      }

      createInvoiceMutation.mutate({
        number: generatedNumber,
        transactionType: "purchase",
        customerName: purchaseCustomerName,
        customerPhone: purchaseCustomerPhone,
        weight: pWeightVal,
        karat: pKaratVal,
        deductionPct: pDeductionVal,
        subtotal: purchaseFinalPayout,
        handwork_value: 0,
        tax: 0,
        total: purchaseFinalPayout,
        paymentMethod: purchasePaymentMethod,
        idImageUrl: idImageUrl || undefined,
        itemType: purchaseItemType,
      });
    } catch (err) {
      console.error(err);
      toast.error(locale === "ar" ? "فشل رفع الصورة للهوية" : "Failed to upload ID photo");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Trigger Print ─────────────────────────────────────────────────────────
  const triggerPrint = () => {
    window.print();
  };

  return (
    <PageTransition>
      <PageHeader
        title={t("cashier.title")}
        description={t("cashier.subtitle")}
      />

      <Tabs
        defaultValue="sale"
        className="grid gap-6 lg:grid-cols-[1.6fr_1fr]"
        onValueChange={(val) => setActiveTab(val as any)}
      >
        {/* Left Side: Calculations Form */}
        <div className="space-y-6">
          <TabsList className="w-full justify-start rounded-xl p-1 bg-surface-muted border border-border/50">
            <TabsTrigger value="sale" className="rounded-lg px-6 py-2">
              {locale === "ar" ? "عملية بيع مجوهرات" : "Sell Jewelry"}
            </TabsTrigger>
            <TabsTrigger value="purchase" className="rounded-lg px-6 py-2">
              {locale === "ar" ? "شراء ذهب كسر (شراء من عميل)" : "Buy Old Gold (Walk-in)"}
            </TabsTrigger>
          </TabsList>

          {/* ────────────────── SALE TAB ────────────────── */}
          <TabsContent value="sale" className="mt-0">
            <SectionCard title={locale === "ar" ? "حساب قيمة المبيعة" : "Sale Calculator"}>
              <form onSubmit={handleFinalizeSale} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 col-span-full">
                    <Label htmlFor="sale-select-item">
                      {locale === "ar" ? "اختر قطعة من المخزون (تعبئة تلقائية)" : "Select finished item from inventory (Auto-fill)"}
                    </Label>
                    <select
                      id="sale-select-item"
                      value={selectedItemId}
                      onChange={(e) => handleSelectItem(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="">
                        {locale === "ar" ? "--- بيع حر (إدخال يدوي) ---" : "--- Custom Sell (Manual entry) ---"}
                      </option>
                      {availableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.sku} - {item.name} ({item.karat}K, {item.netWeight} جم)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale-karat">{locale === "ar" ? "عيار الذهب" : "Gold Karat"}</Label>
                    <select
                      id="sale-karat"
                      value={saleKarat}
                      onChange={(e) => setSaleKarat(Number(e.target.value))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="24">24K</option>
                      <option value="22">22K</option>
                      <option value="21">21K</option>
                      <option value="18">18K</option>
                      <option value="14">14K</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale-gold-price">
                      {locale === "ar" ? "سعر جرام الذهب اليوم (ج.م)" : "Gold Price/g today (EGP)"}
                    </Label>
                    <Input
                      id="sale-gold-price"
                      type="number"
                      required
                      value={saleGoldPrice}
                      onChange={(e) => {
                        setSaleGoldPrice(e.target.value);
                        setIsSalePriceManuallyEdited(true);
                      }}
                      placeholder="e.g. 3500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale-weight">{locale === "ar" ? "وزن القطعة (جرام)" : "Weight (grams)"}</Label>
                    <Input
                      id="sale-weight"
                      type="number"
                      step="0.001"
                      required
                      value={saleWeight}
                      onChange={(e) => setSaleWeight(e.target.value)}
                      placeholder="0.000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale-handwork">
                      {locale === "ar" ? "المصنعية للجرام (ج.م)" : "Handwork/g (EGP)"}
                    </Label>
                    <Input
                      id="sale-handwork"
                      type="number"
                      required
                      value={saleHandwork}
                      onChange={(e) => setSaleHandwork(e.target.value)}
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale-item-type">{locale === "ar" ? "نوع القطعة" : "Item Category"}</Label>
                    <select
                      id="sale-item-type"
                      value={saleItemType}
                      onChange={(e) => setSaleItemType(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ring">{locale === "ar" ? "خاتم" : "Ring"}</option>
                      <option value="bracelet">{locale === "ar" ? "إسورة" : "Bracelet"}</option>
                      <option value="necklace">{locale === "ar" ? "قلادة / سلسلة" : "Necklace"}</option>
                      <option value="earring">{locale === "ar" ? "حلق" : "Earring"}</option>
                      <option value="lazurde">{locale === "ar" ? "خاتم لازوردي" : "L'azurde Ring"}</option>
                      <option value="other">{locale === "ar" ? "أخرى" : "Other"}</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold mb-3">{locale === "ar" ? "بيانات العميل (إلزامية)" : "Customer Info (Mandatory)"}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sale-cust-name">{locale === "ar" ? "اسم العميل" : "Customer Name"}</Label>
                      <Input
                        id="sale-cust-name"
                        required
                        value={saleCustomerName}
                        onChange={(e) => setSaleCustomerName(e.target.value)}
                        placeholder={locale === "ar" ? "محمد أحمد" : "John Doe"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sale-cust-phone">{locale === "ar" ? "رقم الهاتف" : "Phone"}</Label>
                      <Input
                        id="sale-cust-phone"
                        required
                        type="tel"
                        pattern="[0-9]{11}"
                        value={saleCustomerPhone}
                        onChange={(e) => setSaleCustomerPhone(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="010XXXXXXXX (11 رقم)"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4">
                  <Label className="mb-2 block">{locale === "ar" ? "طريقة الدفع" : "Payment Method"}</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "cash", label: locale === "ar" ? "نقدي" : "Cash" },
                      { id: "card", label: locale === "ar" ? "بطاقة" : "Card" },
                      { id: "transfer", label: locale === "ar" ? "تحويل بنكي" : "Bank Transfer" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSalePaymentMethod(m.id)}
                        className={`py-3.5 px-4 rounded-xl border text-xs font-semibold transition-all ${
                          salePaymentMethod === m.id
                            ? "border-gold-deep/80 ring-2 ring-gold/30 bg-gold-soft/20 text-gold-deep"
                            : "border-border/60 hover:bg-surface-muted"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  disabled={createInvoiceMutation.isPending}
                  className="w-full h-12 rounded-xl text-base font-bold shadow-gold mt-2"
                >
                  {createInvoiceMutation.isPending ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ المبيعة وطباعة الفاتورة" : "Finalize Sale & Print")}
                </Button>
              </form>
            </SectionCard>
          </TabsContent>

          {/* ────────────────── PURCHASE TAB ────────────────── */}
          <TabsContent value="purchase" className="mt-0">
            <SectionCard title={locale === "ar" ? "شراء ذهب كسر من عميل" : "Walk-in Purchase Calculator"}>
              <form onSubmit={handleFinalizePurchase} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="p-karat">{locale === "ar" ? "العيار المدخل" : "Gold Karat (e.g. 20.5)"}</Label>
                    <Input
                      id="p-karat"
                      type="number"
                      step="0.1"
                      required
                      value={purchaseKarat}
                      onChange={(e) => setPurchaseKarat(e.target.value)}
                      placeholder="e.g. 20.5"
                    />
                  </div>

                   <div className="space-y-2">
                    <Label htmlFor="p-price-24">{locale === "ar" ? "سعر جرام عيار 24 شراء (ج.م)" : "24K Buying Rate/g (EGP)"}</Label>
                    <Input
                      id="p-price-24"
                      type="number"
                      required
                      value={purchase24KPrice}
                      onChange={(e) => {
                        setPurchase24KPrice(e.target.value);
                        setIsPurchasePriceManuallyEdited(true);
                      }}
                      placeholder="e.g. 6654"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-weight">{locale === "ar" ? "الوزن الإجمالي (جرام)" : "Gross Weight (grams)"}</Label>
                    <Input
                      id="p-weight"
                      type="number"
                      step="0.001"
                      required
                      value={purchaseWeight}
                      onChange={(e) => setPurchaseWeight(e.target.value)}
                      placeholder="0.000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-deduct">{locale === "ar" ? "خصم الأوساخ والهالك (%)" : "Deduction/Loss (%)"}</Label>
                    <Input
                      id="p-deduct"
                      type="number"
                      required
                      value={purchaseDeduction}
                      onChange={(e) => setPurchaseDeduction(e.target.value)}
                      placeholder="e.g. 2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-item-type">{locale === "ar" ? "نوع الذهب المشتري" : "Item Category"}</Label>
                    <select
                      id="p-item-type"
                      value={purchaseItemType}
                      onChange={(e) => setPurchaseItemType(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ring">{locale === "ar" ? "خاتم كسر" : "Scrap Ring"}</option>
                      <option value="bracelet">{locale === "ar" ? "إسورة كسر" : "Scrap Bracelet"}</option>
                      <option value="necklace">{locale === "ar" ? "قلادة / سلسلة كسر" : "Scrap Necklace"}</option>
                      <option value="earring">{locale === "ar" ? "حلق كسر" : "Scrap Earring"}</option>
                      <option value="lazurde">{locale === "ar" ? "لازوردي كسر" : "Scrap L'azurde"}</option>
                      <option value="other">{locale === "ar" ? "ذهب كسر آخر" : "Other Scrap"}</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold">{locale === "ar" ? "بيانات العميل ورفع الهوية (إلزامية)" : "Customer Details & ID (Mandatory)"}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="p-cust-name">{locale === "ar" ? "اسم البائع (العميل)" : "Customer Name"}</Label>
                      <Input
                        id="p-cust-name"
                        required
                        value={purchaseCustomerName}
                        onChange={(e) => setPurchaseCustomerName(e.target.value)}
                        placeholder={locale === "ar" ? "أحمد محمد" : "Customer Name"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-cust-phone">{locale === "ar" ? "رقم الهاتف" : "Customer Phone"}</Label>
                      <Input
                        id="p-cust-phone"
                        required
                        type="tel"
                        pattern="[0-9]{11}"
                        value={purchaseCustomerPhone}
                        onChange={(e) => setPurchaseCustomerPhone(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="010XXXXXXXX (11 رقم)"
                      />
                  </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{locale === "ar" ? "صورة بطاقة الرقم القومي أو الفاتورة" : "Customer National ID / Receipt Image"}</Label>
                    <div className="flex flex-col items-center gap-4 p-5 border border-dashed border-border bg-surface-muted/30 rounded-2xl">
                      {idPhotoPreview ? (
                        <div className="relative size-40 rounded-xl overflow-hidden border">
                          <img src={idPhotoPreview} alt="ID preview" className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setIdPhoto(null); setIdPhotoPreview(null); }}
                            className="absolute inset-0 bg-black/50 text-white text-xs font-semibold flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          >
                            {locale === "ar" ? "إزالة الصورة" : "Remove Image"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <Camera className="size-8 mx-auto text-muted-foreground" />
                          <div className="text-xs text-muted-foreground">
                            {locale === "ar" ? "التقط صورة البطاقة بالهاتف أو الكاميرا" : "Snap ID card using camera"}
                          </div>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl px-5 h-9"
                      >
                        {locale === "ar" ? "اختر صورة الهوية" : "Choose ID File/Snap"}
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4">
                  <Label className="mb-2 block">{locale === "ar" ? "طريقة دفع النقدية" : "Payout Method"}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "cash", label: locale === "ar" ? "خزينة المحل (نقدي)" : "Cash Box" },
                      { id: "transfer", label: locale === "ar" ? "تحويل بنكي" : "Bank Transfer" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPurchasePaymentMethod(m.id)}
                        className={`py-3.5 px-4 rounded-xl border text-xs font-semibold transition-all ${
                          purchasePaymentMethod === m.id
                            ? "border-gold-deep/80 ring-2 ring-gold/30 bg-gold-soft/20 text-gold-deep"
                            : "border-border/60 hover:bg-surface-muted"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  disabled={createInvoiceMutation.isPending || isUploading}
                  className="w-full h-12 rounded-xl text-base font-bold shadow-gold mt-2"
                >
                  {isUploading || createInvoiceMutation.isPending ? (
                    locale === "ar" ? "جاري الرفع والحفظ..." : "Uploading & Saving..."
                  ) : (
                    locale === "ar" ? "حفظ عملية الشراء والتسجيل" : "Finalize Purchase & Register"
                  )}
                </Button>
              </form>
            </SectionCard>
          </TabsContent>
        </div>

        {/* Right Side: Invoice Math Preview Panel */}
        <div className="flex flex-col gap-6">
          <SectionCard title={locale === "ar" ? "تتبع الحساب" : "Live Price Math Engine"}>
            {activeTab === "sale" ? (
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "قيمة الذهب الصافي" : "Net Gold Value"}</span>
                  <span className="font-mono text-foreground">{saleGoldValue.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "إجمالي المصنعية" : "Total Labor/Handwork"}</span>
                  <span className="font-mono text-foreground">{saleHandworkValue.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "ضريبة القيمة المضافة (14% على المصنعية)" : "VAT (14% on labor)"}</span>
                  <span className="font-mono text-foreground">{saleTaxValue.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span className="font-mono text-foreground">{saleSubtotal.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between pt-2 text-lg font-bold text-gold-deep">
                  <span>{locale === "ar" ? "إجمالي الفاتورة" : "Final Price"}</span>
                  <span className="font-mono">{saleFinalTotal.toLocaleString()} ج.م</span>
                </div>

                <div className="bg-gold-soft/10 border border-gold/20 p-3.5 rounded-2xl text-[11px] text-gold-deep leading-relaxed">
                  {locale === "ar" ? (
                    "* يتم احتساب ضريبة القيمة المضافة قانونياً على مصنعية المشغولات فقط وليس على قيمة الذهب الخام."
                  ) : (
                    "* According to Egyptian Law, 14% VAT is applied strictly on the labor/making charge (Handwork) value, not the gold value."
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "الوزن الفعلي" : "Scale weight"}</span>
                  <span className="font-mono text-foreground">{pWeightVal} جم</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "خصم الهالك والمقاومة (2%)" : "Deduction Weight (2%)"}</span>
                  <span className="font-mono text-foreground">{(pWeightVal * (pDeductionVal / 100)).toFixed(3)} جم</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "الوزن الصافي المعترف به" : "Net weight"}</span>
                  <span className="font-mono text-foreground">{purchaseNetWeight.toFixed(3)} جم</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "سعر شراء عيار 24 اليوم" : "24K buy rate"}</span>
                  <span className="font-mono text-foreground">{rate24KBuy.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? `سعر شراء عيار ${purchaseKarat} المحتسب` : `Calculated ${purchaseKarat}K rate`}</span>
                  <span className="font-mono text-foreground">{purchaseCalculatedRate.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between pt-2 text-lg font-bold text-emerald-600">
                  <span>{locale === "ar" ? "المبلغ المستحق للعميل" : "Payout to Customer"}</span>
                  <span className="font-mono">{purchaseFinalPayout.toLocaleString()} ج.م</span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </Tabs>

      {/* ────────────────── RECEIPT MODAL FOR PRINTING ────────────────── */}
      {lastInvoice && (
        <ReceiptModal
          invoice={lastInvoice}
          onClose={() => setLastInvoice(null)}
        />
      )}

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
    </PageTransition>
  );
}
