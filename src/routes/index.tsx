import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import LogoAr from "@/assets/branding/logo-ar.png";
import { Button } from "@/components/ui/button";
import { AssemblyStory } from "@/features/landing/assembly-story";
import { GoldBars } from "@/features/landing/gold-bars";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "جوهرة تك — منصة إدارة محلات الذهب والمجوهرات في مصر" },
      {
        name: "description",
        content:
          "جوهرة تك منصة تشغيل متكاملة لإدارة محلات الذهب والمجوهرات في مصر. إدارة المخزون، الأسعار اليومية، الكاشير، والتقارير.",
      },
      {
        property: "og:title",
        content: "جوهرة تك — منصة إدارة محلات الذهب والمجوهرات",
      },
      {
        property: "og:description",
        content:
          "جوهرة تك منصة تشغيل متكاملة لإدارة محلات الذهب والمجوهرات في مصر.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const EASE = [0.16, 1, 0.3, 1] as const;

/** Slow, cinematic entrance shared by every block on the page. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string | undefined;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-90px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      {...(className ? { className } : {})}
    >
      {children}
    </motion.div>
  );
}

function LandingPage() {
  const { isRTL, setLocale, locale } = useI18n();
  const navigate = useNavigate();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-gold-soft selection:text-gold-foreground">
      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-24 max-w-[86rem] items-center justify-between gap-10 px-6 lg:px-12">
          <Link
            to="/"
            className="group flex shrink-0 items-center outline-none"
            aria-label="جوهرة تك"
          >
            <img
              src={LogoAr}
              alt="جوهرة تك"
              width={612}
              height={408}
              className="h-16 w-auto object-contain contrast-[1.12] saturate-[1.08] drop-shadow-[0_6px_18px_oklch(0.62_0.085_72/0.22)] transition-transform duration-500 ease-out group-hover:scale-[1.03] lg:h-[4.75rem]"
            />
          </Link>

          <div className="hidden items-center gap-12 text-sm font-medium text-muted-foreground lg:flex">
            {[
              { href: "#why", ar: "لماذا جوهرة تك", en: "Why Jawhara Tech" },
              { href: "#platform", ar: "المنصة", en: "Platform" },
              { href: "#impact", ar: "الأرقام", en: "Impact" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative py-1 transition-colors duration-500 hover:text-foreground"
              >
                {isAr ? link.ar : link.en}
                <span className="absolute inset-x-0 -bottom-1 h-px origin-center scale-x-0 bg-gold/70 transition-transform duration-500 ease-out group-hover:scale-x-100" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocale(isAr ? "en" : "ar")}
              className="rounded-full border border-border/60 px-5 py-2.5 text-xs font-semibold text-muted-foreground transition-all duration-500 hover:border-gold/40 hover:text-foreground"
            >
              {isAr ? "English" : "العربية"}
            </button>
            <Button
              variant="gold"
              onClick={() => void navigate({ to: "/login" })}
              className="h-12 gap-2.5 rounded-full px-7 text-xs font-semibold transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-floating"
            >
              <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
              <ArrowIcon className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero — minimal, generous, logo-led ───────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[44rem] bg-gradient-to-b from-gold-soft/35 via-background to-background" />
          <div className="absolute left-1/2 top-[-14rem] size-[46rem] -translate-x-1/2 rounded-full bg-gold-soft/45 blur-[160px]" />
        </div>
        <GoldBars />

        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-40 pt-28 text-center lg:pb-52 lg:pt-36">
          <motion.img
            src={LogoAr}
            alt="جوهرة تك"
            width={612}
            height={408}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
            className="h-40 w-auto object-contain contrast-[1.15] saturate-[1.1] drop-shadow-[0_28px_60px_oklch(0.62_0.085_72/0.3)] sm:h-52 lg:h-64"
          />

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.15, ease: EASE }}
            className="mt-16 text-[2.5rem] font-extrabold leading-[1.3] tracking-tight text-foreground sm:text-6xl lg:text-[4.25rem] lg:leading-[1.25]"
          >
            {isAr ? (
              <>
                منصة تشغيل متكاملة
                <br />
                <span className="text-gradient-gold">لمحلات الذهب</span>
              </>
            ) : (
              <>
                The Operating System
                <br />
                <span className="text-gradient-gold">for Jewelry Houses</span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.28, ease: EASE }}
            className="mt-10 max-w-xl text-base leading-[2.2] text-muted-foreground sm:text-lg"
          >
            {isAr
              ? "المخزون، أسعار الذهب، الكاشير والتقارير — في نظام واحد هادئ ودقيق."
              : "Inventory, gold rates, cashier and reporting — in one calm, precise system."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.42, ease: EASE }}
            className="mt-14 flex flex-wrap items-center justify-center gap-5"
          >
            <Button
              variant="gold"
              onClick={() => void navigate({ to: "/login" })}
              className="h-16 gap-3 rounded-full px-11 text-sm font-bold tracking-wide transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-floating active:translate-y-0"
            >
              <span>{isAr ? "دخول إلى النظام" : "Sign In to System"}</span>
              <ArrowIcon className="size-4" aria-hidden />
            </Button>

            <a href="#why">
              <Button
                variant="outline"
                className="h-16 rounded-full border-border/60 bg-surface/50 px-10 text-sm font-semibold backdrop-blur transition-all duration-500 ease-out hover:-translate-y-1 hover:border-gold/40 hover:bg-surface hover:shadow-soft active:translate-y-0"
              >
                {isAr ? "اكتشف المنصة" : "Discover the Platform"}
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Scroll-driven ring box + pillars ─────────────────────────────── */}
      <AssemblyStory locale={locale} />

      {/* ── Platform statement ───────────────────────────────────────────── */}
      <section
        id="platform"
        className="relative overflow-hidden border-y border-border/40 bg-surface-muted/30 py-36 lg:py-44"
      >
        <GoldBars />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-gold-deep">
              {isAr ? "المنصة" : "The Platform"}
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-8 text-[2.2rem] font-extrabold leading-[1.35] tracking-tight text-foreground sm:text-[3rem]">
              {isAr
                ? "كل عملية في المحل، من الدرج إلى الفاتورة، في مكان واحد."
                : "Every operation, from tray to invoice, in a single place."}
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-10 max-w-xl text-base leading-[2.2] text-muted-foreground">
              {isAr
                ? "بُنيت جوهرة تك خصيصًا لسوق الذهب المصري: المصنعية، العيارات بالجنيه المصري، ومطابقة الأوزان اليومية بدقة مطلقة."
                : "Purpose-built for the Egyptian gold trade: making charges, EGP karat pricing, and daily weight reconciliation."}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Impact ───────────────────────────────────────────────────────── */}
      <section
        id="impact"
        className="relative overflow-hidden bg-primary py-32 text-primary-foreground"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <div className="relative mx-auto max-w-[86rem] px-6 lg:px-12">
          <div className="grid gap-y-16 text-center sm:grid-cols-2 lg:grid-cols-4">
            {[
              { ar: "فواتير يومية", en: "Invoices Daily", value: "120+" },
              { ar: "أوزان مُدارة", en: "Inventory Managed", value: "450kg" },
              { ar: "جاهزية النظام", en: "Availability", value: "99.9%" },
              { ar: "تقرير مُستخرج", en: "Reports Generated", value: "150+" },
            ].map((kpi, idx) => (
              <Reveal key={kpi.en} delay={idx * 0.1}>
                <div className="space-y-4 px-6 lg:border-e lg:border-primary-foreground/10 lg:last:border-e-0">
                  <p className="text-gradient-gold font-mono text-5xl font-extrabold tracking-tight sm:text-[3.5rem]">
                    {kpi.value}
                  </p>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-primary-foreground/60">
                    {isAr ? kpi.ar : kpi.en}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-36 lg:py-44">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-soft/35 blur-[160px]" />
        </div>
        <GoldBars />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <img
              src={LogoAr}
              alt="جوهرة تك"
              width={612}
              height={408}
              className="mx-auto h-28 w-auto object-contain contrast-[1.15] saturate-[1.1] drop-shadow-[0_20px_46px_oklch(0.62_0.085_72/0.28)]"
            />
          </Reveal>
          <Reveal delay={0.12}>
            <h2 className="mt-14 text-[2.2rem] font-extrabold leading-[1.35] tracking-tight text-foreground sm:text-[2.9rem]">
              {isAr
                ? "جاهز لتحديث محل الذهب الخاص بك؟"
                : "Ready to modernize your jewelry house?"}
            </h2>
          </Reveal>
          <Reveal delay={0.22}>
            <p className="mx-auto mt-8 max-w-lg text-base leading-[2.2] text-muted-foreground">
              {isAr
                ? "ابدأ اليوم بتجربة إدارة هادئة وسريعة مصممة لسوق الذهب."
                : "Start today with a calm, fast platform designed for the gold trade."}
            </p>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mt-14">
              <Button
                variant="gold"
                onClick={() => void navigate({ to: "/login" })}
                className="h-16 gap-3 rounded-full px-12 text-sm font-bold tracking-wide transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-floating active:translate-y-0"
              >
                <span>{isAr ? "تسجيل الدخول" : "Sign In to System"}</span>
                <ArrowIcon className="size-4" aria-hidden />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-surface/60 py-16 backdrop-blur">
        <div className="mx-auto flex max-w-[86rem] flex-col items-center justify-between gap-8 px-6 text-xs text-muted-foreground sm:flex-row lg:px-12">
          <div className="flex items-center gap-5">
            <img
              src={LogoAr}
              alt="جوهرة تك"
              width={612}
              height={408}
              className="h-14 w-auto object-contain contrast-[1.12]"
            />
            <span className="border-s border-border/50 ps-5 text-[11px] font-semibold text-gold-deep">
              {isAr
                ? "صُنعت لمحلات الذهب والمجوهرات المصرية"
                : "Made for Egyptian Jewelry Businesses"}
            </span>
          </div>
          <p className="text-[11px]">
            © {new Date().getFullYear()} جوهرة تك. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
