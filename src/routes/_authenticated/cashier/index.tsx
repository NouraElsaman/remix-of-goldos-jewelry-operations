import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ScanLine, ShoppingCart, Camera, Printer, CheckCircle, ArrowRight, ArrowLeft, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader, SectionCard, ReceiptModal, SearchInput } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
  const [saleHandworkType, setSaleHandworkType] = useState<"egp" | "pct">("egp");
  const [saleCustomerName, setSaleCustomerName] = useState<string>("");
  const [saleCustomerPhone, setSaleCustomerPhone] = useState<string>("");
  const [salePaymentMethod, setSalePaymentMethod] = useState<string>("cash");
  const [saleItemType, setSaleItemType] = useState<string>("ring");
  const [isSalePriceManuallyEdited, setIsSalePriceManuallyEdited] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [productQuery, setProductQuery] = useState<string>("");
  const [itemPickerOpen, setItemPickerOpen] = useState<boolean>(false);

  // ── Walk-in Purchase States ───────────────────────────────────────────────
  const [purchaseWeight, setPurchaseWeight] = useState<string>("");
  const [purchaseKarat, setPurchaseKarat] = useState<string>("20.5");
  const [purchase21KPrice, setPurchase21KPrice] = useState<string>("");
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

  // Today's 21K buy rate reference
  const rate21KBuy = todayPrices.find((p) => p.karat === 21)?.rateBuy || 3395;

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

  // Client-side product search over the already loaded in-stock items.
  const debouncedProductQuery = useDebouncedValue(productQuery, 200);
  const filteredItems = useMemo(() => {
    const q = debouncedProductQuery.trim().toLowerCase();
    if (!q) return availableItems.slice(0, 100);
    return availableItems
      .filter((item) =>
        [
          item.sku,
          item.name,
          String(item.karat),
          `${item.karat}k`,
          String(item.netWeight),
          String(item.grossWeight),
          item.trayId ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 100);
  }, [availableItems, debouncedProductQuery]);
  const selectedItem = availableItems.find((i) => i.id === selectedItemId);

  // Auto-fill gold price when sale karat changes or database price loads
  useEffect(() => {
    const rate = todayPrices.find((p) => p.karat === saleKarat)?.rate || 0;
    if (rate && !isSalePriceManuallyEdited) {
      setSaleGoldPrice(String(rate));
    }
  }, [saleKarat, todayPrices, isSalePriceManuallyEdited]);

  // Auto-fill 21K buy price when page loads / database price loads
  useEffect(() => {
    if (rate21KBuy && !isPurchasePriceManuallyEdited) {
      setPurchase21KPrice(String(rate21KBuy));
    }
  }, [rate21KBuy, isPurchasePriceManuallyEdited]);

  // ── Sale Calculations ─────────────────────────────────────────────────────
  const weightVal = parseFloat(saleWeight) || 0;
  const goldPriceVal = parseFloat(saleGoldPrice) || 0;
  const handworkVal = parseFloat(saleHandwork) || 0;

  const saleGoldValue = weightVal * goldPriceVal;
  const saleHandworkValue =
    saleHandworkType === "pct"
      ? saleGoldValue * (handworkVal / 100)
      : weightVal * handworkVal;

  const saleSubtotal = saleGoldValue + saleHandworkValue;
  const saleTaxValue = 0; // VAT removed
  const saleFinalTotal = saleSubtotal + saleTaxValue;

  // ── Purchase Calculations ──────────────────────────────────────────────────
  const pWeightVal = parseFloat(purchaseWeight) || 0;
  const pKaratVal = parseFloat(purchaseKarat) || 20.5;
  const pDeductionVal = parseFloat(purchaseDeduction) || 0;
  const p21BuyVal = parseFloat(purchase21KPrice) || rate21KBuy;

  // Buying Rate of Karat = 21K Buy Rate * (Karat / 21)
  const purchaseCalculatedRate = p21BuyVal * (pKaratVal / 21);
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
    setSaleHandworkType("egp");
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
        className="grid min-w-0 gap-6 lg:grid-cols-[1.6fr_1fr]"
        onValueChange={(val) => setActiveTab(val as any)}
      >
        {/* Left Side: Calculations Form */}
        <div className="min-w-0 space-y-6">
          <TabsList className="w-full max-w-full flex-nowrap justify-start overflow-x-auto rounded-xl p-1 bg-surface-muted border border-border/50 scrollbar-slim">
            <TabsTrigger value="sale" className="whitespace-nowrap rounded-lg px-4 py-2 sm:px-6">
              {locale === "ar" ? "عملية بيع مجوهرات" : "Sell Jewelry"}
            </TabsTrigger>
            <TabsTrigger value="purchase" className="whitespace-nowrap rounded-lg px-4 py-2 sm:px-6">
              {locale === "ar" ? "شراء ذهب كسر (شراء من عميل)" : "Buy Old Gold (Walk-in)"}
            </TabsTrigger>
          </TabsList>

          {/* ────────────────── SALE TAB ────────────────── */}
          <TabsContent value="sale" className="mt-0">
            <SectionCard title={locale === "ar" ? "حساب قيمة المبيعة" : "Sale Calculator"}>
              <form onSubmit={handleFinalizeSale} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="col-span-full space-y-2">
                    <Label htmlFor="sale-product-search">
                      {locale === "ar" ? "اختر قطعة من المخزون (بحث بالاسم أو الكود)" : "Select item from inventory (search by name or code)"}
                    </Label>
                    <Popover open={itemPickerOpen} onOpenChange={setItemPickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          id="sale-product-search"
                          type="button"
                          className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-surface-muted focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <span className="min-w-0 flex-1 truncate text-start">
                            {selectedItem ? (
                              <>
                                <span className="font-semibold text-foreground">{selectedItem.name}</span>{" "}
                                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                                  ({selectedItem.sku} · {selectedItem.karat}K · {selectedItem.netWeight} g)
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                {locale === "ar" ? "بيع حر (إدخال يدوي) — اضغط للاختيار من المخزون" : "Custom sell (manual entry) — click to pick from inventory"}
                              </span>
                            )}
                          </span>
                          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[--radix-popover-trigger-width] p-0"
                      >
                        <div className="border-b border-border p-2">
                          <SearchInput
                            value={productQuery}
                            onValueChange={setProductQuery}
                            placeholder={locale === "ar" ? "ابحث بالاسم أو الكود أو العيار أو الوزن…" : "Search by name, SKU, karat or weight…"}
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto bg-background scrollbar-slim">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectItem("");
                              setItemPickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5 text-start text-xs font-semibold transition-colors hover:bg-surface-muted ${
                              selectedItemId === "" ? "bg-gold-soft/30 text-gold-deep" : ""
                            }`}
                          >
                            {locale === "ar" ? "بيع حر (إدخال يدوي)" : "Custom sell (manual entry)"}
                          </button>
                          {filteredItems.length === 0 ? (
                            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                              {locale === "ar" ? "لا توجد قطع مطابقة للبحث" : "No matching items"}
                            </p>
                          ) : (
                            filteredItems.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  handleSelectItem(item.id);
                                  setItemPickerOpen(false);
                                }}
                                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 px-3 py-2.5 text-start transition-colors last:border-0 hover:bg-surface-muted ${
                                  selectedItemId === item.id ? "bg-gold-soft/30" : ""
                                }`}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-semibold text-foreground">
                                    {item.name}
                                  </span>
                                  <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground" dir="ltr">
                                    {item.sku}
                                  </span>
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-muted-foreground" dir="ltr">
                                  {item.karat}K · {item.netWeight} g
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {selectedItem ? (
                      <p className="text-[11px] text-muted-foreground">
                        {locale === "ar" ? "القطعة المختارة: " : "Selected: "}
                        <span className="font-semibold text-foreground">{selectedItem.name}</span>{" "}
                        <span className="font-mono" dir="ltr">({selectedItem.sku})</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale-karat">{locale === "ar" ? "عيار الذهب" : "Gold Karat"}</Label>
                    <select
                      id="sale-karat"
                      value={saleKarat}
                      onChange={(e) => setSaleKarat(Number(e.target.value))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring h-10"
                    >
                      <option value="24">24K</option>
                      <option value="21">21K</option>
                      <option value="18">18K</option>
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
                      {locale === "ar" ? "نوع وقيمة المصنعية" : "Handwork Type & Value"}
                    </Label>
                    <div className="flex gap-2">
                      <select
                        value={saleHandworkType}
                        onChange={(e) => setSaleHandworkType(e.target.value as any)}
                        className="rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-28 h-10"
                      >
                        <option value="egp">{locale === "ar" ? "ج.م / جرام" : "EGP / g"}</option>
                        <option value="pct">%</option>
                      </select>
                      <Input
                        id="sale-handwork"
                        type="number"
                        required
                        value={saleHandwork}
                        onChange={(e) => setSaleHandwork(e.target.value)}
                        placeholder={saleHandworkType === "pct" ? "e.g. 5" : "e.g. 150"}
                        className="flex-1 h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale-item-type">{locale === "ar" ? "نوع القطعة" : "Item Category"}</Label>
                    <select
                      id="sale-item-type"
                      value={saleItemType}
                      onChange={(e) => setSaleItemType(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring h-10"
                    >
                      <option value="ring">{locale === "ar" ? "خاتم" : "Ring"}</option>
                      <option value="bracelet">{locale === "ar" ? "إسورة" : "Bracelet"}</option>
                      <option value="necklace">{locale === "ar" ? "قلادة / سلسلة" : "Necklace"}</option>
                      <option value="earring">{locale === "ar" ? "حلق" : "Earring"}</option>
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
                    <Label htmlFor="p-price-21">{locale === "ar" ? "سعر جرام عيار 21 شراء (ج.م)" : "21K Buying Rate/g (EGP)"}</Label>
                    <Input
                      id="p-price-21"
                      type="number"
                      required
                      value={purchase21KPrice}
                      onChange={(e) => {
                        setPurchase21KPrice(e.target.value);
                        setIsPurchasePriceManuallyEdited(true);
                      }}
                      placeholder="e.g. 3395"
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
                    <Label htmlFor="p-deduct">{locale === "ar" ? "خصم ضريبة ودمغة (%)" : "Taxes & Stamp Deduction (%)"}</Label>
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
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring h-10"
                    >
                      <option value="ring">{locale === "ar" ? "خاتم كسر" : "Scrap Ring"}</option>
                      <option value="bracelet">{locale === "ar" ? "إسورة كسر" : "Scrap Bracelet"}</option>
                      <option value="necklace">{locale === "ar" ? "قلادة / سلسلة كسر" : "Scrap Necklace"}</option>
                      <option value="earring">{locale === "ar" ? "حلق كسر" : "Scrap Earring"}</option>
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
                  <span>{locale === "ar" ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span className="font-mono text-foreground">{saleSubtotal.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between pt-2 text-lg font-bold text-gold-deep">
                  <span>{locale === "ar" ? "إجمالي الفاتورة" : "Final Price"}</span>
                  <span className="font-mono">{saleFinalTotal.toLocaleString()} ج.م</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "الوزن الفعلي" : "Scale weight"}</span>
                  <span className="font-mono text-foreground">{pWeightVal} جم</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? `خصم ضريبة ودمغة (${pDeductionVal}%)` : `Taxes & Stamp Deduction (${pDeductionVal}%)`}</span>
                  <span className="font-mono text-foreground">{(pWeightVal * (pDeductionVal / 100)).toFixed(3)} جم</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "الوزن الصافي المعترف به" : "Net weight"}</span>
                  <span className="font-mono text-foreground">{purchaseNetWeight.toFixed(3)} جم</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm text-muted-foreground">
                  <span>{locale === "ar" ? "سعر شراء عيار 21 اليوم" : "21K buy rate reference"}</span>
                  <span className="font-mono text-foreground">{rate21KBuy.toLocaleString()} ج.م</span>
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
