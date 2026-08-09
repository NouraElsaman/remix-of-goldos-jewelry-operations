import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fetchLiveEgyptianGoldRates } from "@/services/supabase/live-rates";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared";
import { SUPPORTED_KARATS } from "@/features/pricing/pricing-engine";
import type { Karat } from "@/types/domain";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ── Zod schema ──────────────────────────────────────────────────────────────

const rateSchema = z
  .number({ invalid_type_error: "يجب إدخال رقم" })
  .positive("يجب أن يكون السعر أكبر من صفر")
  .max(10_000, "السعر مرتفع جداً")
  .multipleOf(0.01, "يُسمح بمنزلتين عشريتين كحد أقصى");

export const setPricesSchema = z.object({
  rates: z.object({
    24: rateSchema,
    21: rateSchema,
    18: rateSchema,
  }),
});

export type SetPricesFormValues = z.infer<typeof setPricesSchema>;

// ── Form component ───────────────────────────────────────────────────────────

/**
 * Set Today's Prices form — all 3 karats in one submit.
 * Validates with Zod; loading/success/error states included.
 * No service calls: `onSubmit` callback owned by the route/feature.
 */
export function SetPricesForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  t,
}: {
  defaultValues?: Partial<SetPricesFormValues>;
  onSubmit: (values: SetPricesFormValues) => Promise<void>;
  isSubmitting: boolean;
  t: (key: TranslationKey) => string;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SetPricesFormValues>({
    resolver: zodResolver(setPricesSchema),
    defaultValues: defaultValues ?? {
      rates: { 24: 0, 21: 0, 18: 0 },
    },
  });

  const [isFetchingLive, setIsFetchingLive] = useState(false);

  const handleFetchLiveRates = async () => {
    setIsFetchingLive(true);
    try {
      const liveRates = await fetchLiveEgyptianGoldRates();
      
      // Update form values dynamically
      if (liveRates[24]) setValue("rates.24", liveRates[24].sell, { shouldDirty: true, shouldValidate: true });
      if (liveRates[21]) setValue("rates.21", liveRates[21].sell, { shouldDirty: true, shouldValidate: true });
      if (liveRates[18]) setValue("rates.18", liveRates[18].sell, { shouldDirty: true, shouldValidate: true });

      toast.success(
        t("common.save") === "حفظ" 
          ? "تم جلب أسعار السوق الحالية بنجاح!" 
          : "Live market rates fetched successfully!"
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t("common.save") === "حفظ" 
          ? "تعذّر جلب الأسعار تلقائياً" 
          : "Failed to fetch live prices"
      );
    } finally {
      setIsFetchingLive(false);
    }
  };

  return (
    <SectionCard title={t("goldPrices.setToday")}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORTED_KARATS.map((karat) => {
            const key = karat as Karat;
            const error = errors.rates?.[key];

            return (
              <div key={karat} className="flex flex-col gap-2">
                <Label
                  htmlFor={`rate-${karat}`}
                  className={cn(
                    "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    error && "text-destructive",
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-lg border border-gold/30 bg-gold-soft/80 text-xs font-bold text-gold-deep">
                    {karat}
                  </span>
                  عيار {karat}
                </Label>
                <div className="relative">
                  <Input
                    id={`rate-${karat}`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    dir="ltr"
                    className={cn(
                      "pe-12 text-end font-mono font-semibold text-foreground",
                      error &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                    {...register(`rates.${karat}` as unknown as "rates", {
                      valueAsNumber: true,
                    })}
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-xs font-semibold text-muted-foreground/70">
                    ج.م
                  </span>
                </div>
                {error ? (
                  <p className="text-xs font-medium text-destructive">
                    {error.message}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4.5">
          <p className="text-xs text-muted-foreground/80">
            {t("goldPrices.formNote")}
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isFetchingLive}
              onClick={handleFetchLiveRates}
              className="h-10 rounded-xl text-sm font-semibold border-gold/30 hover:bg-gold-soft/10 text-gold-deep flex items-center gap-2"
            >
              {isFetchingLive ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4 text-gold-deep" />
              )}
              {t("common.save") === "حفظ" ? "جلب الأسعار الحالية تلقائياً" : "Fetch Live Market Rates"}
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={isSubmitting}
              className="h-10 min-w-36 gap-2 rounded-xl text-sm font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </form>
    </SectionCard>
  );
}
