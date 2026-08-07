import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Upload } from "lucide-react";

import { PageHeader, SectionCard } from "@/components/shared";
import {
  TextField,
  SelectField,
  CheckboxField,
  TextareaField,
  PasswordField,
  CurrencyField,
  requiredString,
} from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { services } from "@/services";

import type { ShopSettings } from "@/services";
import { supabase } from "@/services/supabase/supabase-provider";

export const Route = createFileRoute("/_authenticated/settings/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/settings")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "الإعدادات — جوهرة تك" },
      { name: "description", content: "إعدادات النظام والأسعار." },
    ],
  }),
  component: SettingsPage,
});

const storeSchema = z.object({
  shopNameAr: requiredString(),
  shopName: requiredString(),
  ownerName: requiredString(),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z
    .string()
    .regex(/^01[0125][0-9]{8}$/, "يجب أن يكون رقم هاتف مصري صحيح"),
  commercialRegister: z.string().regex(/^\d+$/, "يجب أن يحتوي على أرقام فقط"),
  taxId: z.string().regex(/^\d+$/, "يجب أن يحتوي على أرقام فقط"), // TODO: official ETA validation later
  governorate: requiredString(),
  city: requiredString(),
  address: requiredString(),
  currency: z.string(),
});

const receiptSchema = z.object({
  receiptHeader: requiredString(),
  receiptFooter: requiredString(),
  returnPolicy: requiredString(),
});

const pricingSchema = z.object({
  vatRate: z.coerce.number().min(0).max(100),
  vatOnManufacturingOnly: z.boolean(),
  defaultManufacturingCost: z.coerce.number().min(0),
  roundingMode: z.enum(["none", "nearest_pound", "nearest_5_pounds"]),
});

const securitySchema = z
  .object({
    currentPassword: requiredString(),
    newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: requiredString(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

function SettingsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => services.settings.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (newSettings: Partial<ShopSettings>) =>
      services.settings.update(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(t("common.save"));
    },
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  const uploadStoreLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("store-logos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("store-logos").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const storeForm = useForm<z.infer<typeof storeSchema>>({
    resolver: zodResolver(storeSchema),
    mode: "onChange",
  });
  const receiptForm = useForm<z.infer<typeof receiptSchema>>({
    resolver: zodResolver(receiptSchema),
    mode: "onChange",
  });
  const pricingForm = useForm<z.infer<typeof pricingSchema>>({
    resolver: zodResolver(pricingSchema),
    mode: "onChange",
  });
  const securityForm = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (settings) {
      storeForm.reset(settings);
      receiptForm.reset(settings);
      pricingForm.reset(settings);
      if (settings.logoUrl) setLogoPreview(settings.logoUrl);
    }
  }, [settings, storeForm, receiptForm, pricingForm]);

  const isAnyDirty =
    storeForm.formState.isDirty ||
    Boolean(logoFile) ||
    receiptForm.formState.isDirty ||
    pricingForm.formState.isDirty ||
    securityForm.formState.isDirty;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnyDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isAnyDirty]);

  if (isLoading) return null;

  return (
    <PageTransition>
      <PageHeader
        title={t("settings.title")}
        description={t("settings.subtitle")}
      />

      <Tabs defaultValue="store" className="gap-4">
        <TabsList className="rounded-xl">
          <TabsTrigger value="store" className="rounded-lg">
            معلومات المحل
          </TabsTrigger>
          <TabsTrigger value="receipt" className="rounded-lg">
            الفاتورة
          </TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-lg">
            التسعير والضرائب
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg">
            الأمان
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <SectionCard
            title="معلومات المحل"
            description="البيانات الأساسية للمحل والتي تظهر في التقارير والفواتير."
          >
            <form
              onSubmit={storeForm.handleSubmit(async (data) => {
                let logoUrl = settings?.logoUrl;
                if (logoFile) {
                  try {
                    setIsUploading(true);
                    logoUrl = await uploadStoreLogo(logoFile);
                    setLogoFile(null);
                  } catch (err) {
                    console.error("Logo upload failed:", err);
                    toast.error("فشل رفع الشعار");
                    return;
                  } finally {
                    setIsUploading(false);
                  }
                }
                updateMutation.mutate({ ...data, logoUrl });
              })}
              className="grid gap-6 md:grid-cols-2 max-w-4xl"
            >
              <div className="md:col-span-2 flex items-center gap-6">
                <div
                  className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted/50 overflow-hidden cursor-pointer hover:bg-surface-muted transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Upload className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">شعار المحل</h3>
                  <p className="text-xs text-muted-foreground">
                    صورة بصيغة PNG أو JPG. يفضل خلفية شفافة.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>

              <TextField
                control={storeForm.control}
                name="shopNameAr"
                label="اسم المحل (بالعربية)"
              />
              <TextField
                control={storeForm.control}
                name="shopName"
                label="اسم المحل (بالإنجليزية)"
              />
              <TextField
                control={storeForm.control}
                name="ownerName"
                label="اسم المالك"
              />
              <TextField
                control={storeForm.control}
                name="email"
                label="البريد الإلكتروني"
              />
              <TextField
                control={storeForm.control}
                name="phone"
                label="رقم الهاتف"
              />

              <div className="opacity-70 pointer-events-none">
                <TextField
                  control={storeForm.control}
                  name="currency"
                  label="العملة"
                />
              </div>

              <TextField
                control={storeForm.control}
                name="commercialRegister"
                label="السجل التجاري"
              />
              <TextField
                control={storeForm.control}
                name="taxId"
                label="البطاقة الضريبية"
              />
              <TextField
                control={storeForm.control}
                name="governorate"
                label="المحافظة"
              />
              <TextField
                control={storeForm.control}
                name="city"
                label="المدينة / المنطقة"
              />

              <div className="md:col-span-2">
                <TextField
                  control={storeForm.control}
                  name="address"
                  label="العنوان بالتفصيل"
                />
              </div>

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={
                    (!storeForm.formState.isDirty && !logoFile) ||
                    !storeForm.formState.isValid ||
                    updateMutation.isPending ||
                    isUploading
                  }
                  className="h-11 w-32 rounded-xl"
                >
                  {updateMutation.isPending || isUploading
                    ? "جاري الحفظ..."
                    : t("common.save")}
                </Button>
              </div>
            </form>
          </SectionCard>
        </TabsContent>

        <TabsContent value="receipt">
          <SectionCard
            title="إعدادات الفاتورة"
            description="النصوص والسياسات التي تظهر أسفل فواتير العملاء."
          >
            <form
              onSubmit={receiptForm.handleSubmit((data) =>
                updateMutation.mutate(data),
              )}
              className="grid gap-6 max-w-2xl"
            >
              <TextareaField
                control={receiptForm.control}
                name="receiptHeader"
                label="ترويسة الفاتورة"
                placeholder="أهلاً بك في جوهرة تك..."
              />
              <TextareaField
                control={receiptForm.control}
                name="receiptFooter"
                label="تذييل الفاتورة"
                placeholder="شكراً لزيارتكم..."
              />
              <TextareaField
                control={receiptForm.control}
                name="returnPolicy"
                label="سياسة الاسترجاع والاستبدال"
                placeholder="الاسترجاع خلال ١٤ يوم..."
              />

              <Button
                type="submit"
                disabled={
                  !receiptForm.formState.isDirty ||
                  !receiptForm.formState.isValid ||
                  updateMutation.isPending
                }
                className="h-11 w-32 rounded-xl"
              >
                {updateMutation.isPending ? "جاري الحفظ..." : t("common.save")}
              </Button>
            </form>
          </SectionCard>
        </TabsContent>

        <TabsContent value="pricing">
          <SectionCard
            title="التسعير والضرائب"
            description="إعدادات ضريبة القيمة المضافة والمصنعية الافتراضية."
          >
            <form
              onSubmit={pricingForm.handleSubmit((data) =>
                updateMutation.mutate(data),
              )}
              className="grid gap-6 max-w-xl"
            >
              <div className="grid grid-cols-2 gap-4">
                <CurrencyField
                  control={pricingForm.control}
                  name="defaultManufacturingCost"
                  label="المصنعية الافتراضية (للجرام)"
                />
                <TextField
                  control={pricingForm.control}
                  name="vatRate"
                  label="نسبة ضريبة القيمة المضافة (%)"
                />
              </div>
              <p className="-mt-3 text-xs text-muted-foreground">
                المصنعية الافتراضية هي قيمة استرشادية ويمكن تغييرها لكل صنف على
                حدة.
              </p>

              <CheckboxField
                control={pricingForm.control}
                name="vatOnManufacturingOnly"
                label="تطبيق الضريبة على المصنعية فقط (وليس على الذهب)"
              />

              <SelectField
                control={pricingForm.control}
                name="roundingMode"
                label="تقريب الإجمالي"
                options={[
                  { value: "none", label: "بدون تقريب" },
                  { value: "nearest_pound", label: "لأقرب جنيه" },
                  { value: "nearest_5_pounds", label: "لأقرب ٥ جنيهات" },
                ]}
              />

              <Button
                type="submit"
                disabled={
                  !pricingForm.formState.isDirty ||
                  !pricingForm.formState.isValid ||
                  updateMutation.isPending
                }
                className="h-11 w-32 rounded-xl mt-2"
              >
                {updateMutation.isPending ? "جاري الحفظ..." : t("common.save")}
              </Button>
            </form>
          </SectionCard>
        </TabsContent>

        <TabsContent value="security">
          <SectionCard
            title="الأمان"
            description="تغيير كلمة المرور الخاصة بحسابك."
          >
            <form
              onSubmit={securityForm.handleSubmit(() => {
                toast.success("تم تغيير كلمة المرور بنجاح");
                securityForm.reset();
              })}
              className="grid gap-5 max-w-md"
            >
              <PasswordField
                control={securityForm.control}
                name="currentPassword"
                label="كلمة المرور الحالية"
              />
              <PasswordField
                control={securityForm.control}
                name="newPassword"
                label="كلمة المرور الجديدة"
              />
              <PasswordField
                control={securityForm.control}
                name="confirmPassword"
                label="تأكيد كلمة المرور الجديدة"
              />

              <Button
                type="submit"
                disabled={
                  !securityForm.formState.isDirty ||
                  !securityForm.formState.isValid
                }
                className="h-11 w-32 rounded-xl mt-2"
              >
                تحديث كلمة المرور
              </Button>
            </form>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}
