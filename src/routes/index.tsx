import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Gem, Languages, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssemblyStory } from "@/features/landing/assembly-story";
import { GoldBars } from "@/features/landing/gold-bars";
import { AmbientDepth } from "@/features/landing/ambient-depth";
import { useI18n } from "@/lib/i18n";
import scorpiusWordmark from "@/assets/scorpius-wordmark.png.asset.json";
import heroJewelry from "@/assets/hero-jewelry.png.asset.json";


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
        content: "جوهرة تك — منصة إدارة محلات الذهب والمجوهرات في مصر",
      },
      {
        property: "og:description",
        content: "جوهرة تك منصة تشغيل متكاملة لإدارة محلات الذهب والمجوهرات في مصر. إدارة المخزون، الأسعار اليومية، الكاشير، والتقارير.",
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
  const reduce = useReducedMotion();
  return (
    <motion.div
      {...(reduce
        ? {}
        : {
            initial: { opacity: 0, y: 28 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, margin: "-90px" },
            transition: { duration: 0.9, delay, ease: EASE },
          })}
      {...(className ? { className } : {})}
    >
      {children}
    </motion.div>
  );
}

function LandingPage() {
  const { isRTL, setLocale, locale } = useI18n();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const isAr = locale === "ar";

  /** Hero entrance, honouring reduced-motion without changing the timing. */
  const enter = (delay: number, y = 22) =>
    reduce
      ? {}
      : ({
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 1.1, delay, ease: EASE },
        } as const);

  const trustPoints = [
    {
      icon: ShieldCheck,
      ar: "صلاحيات وسجل تدقيق كامل",
      en: "Roles and full audit trail",
    },
    {
      icon: Gem,
      ar: "دقة وزن حتى 0.001 جرام",
      en: "0.001g weight precision",
    },
    {
      icon: Languages,
      ar: "واجهة عربية أولًا",
      en: "Arabic-first interface",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-gold-soft selection:text-gold-foreground">
      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-[86rem] items-center justify-between gap-4 px-4 sm:h-24 sm:gap-10 sm:px-6 lg:px-12">
          <Link
            to="/"
            className="group flex shrink-0 items-center outline-none"
            aria-label="جوهرة تك"
          >
            <img
              src="/logo-ar.png"
              alt="جوهرة تك"
              width={612}
              height={408}
              className="h-11 w-auto object-contain contrast-[1.12] saturate-[1.08] drop-shadow-[0_6px_18px_oklch(0.62_0.085_72/0.22)] transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:h-16 lg:h-[4.75rem]"
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
              aria-label={isAr ? "تغيير اللغة إلى الإنجليزية" : "Switch language to Arabic"}
              className="rounded-full border border-border/60 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground transition-all duration-500 hover:border-gold/40 hover:text-foreground sm:px-5 sm:py-2.5 sm:text-xs"
            >
              {isAr ? "English" : "العربية"}
            </button>
            <Button
              variant="gold"
              onClick={() => void navigate({ to: "/login" })}
              className="h-11 gap-2 rounded-full px-4 text-[11px] font-semibold transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-floating sm:h-12 sm:gap-2.5 sm:px-7 sm:text-xs"
            >
              <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
              <ArrowIcon className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero — two-column, product-led ───────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Full-bleed jewelry photograph — supporting brand texture, never
            competing with the hero copy. Jewelry stays on the composition's
            left; the clean ivory negative space stays behind the headline.
            In LTR the layer is mirrored so the copy still lands on the
            uncluttered side. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <img
            src={heroJewelry.url}
            alt=""
            aria-hidden
            fetchPriority="high"
            decoding="async"
            className={`size-full object-cover object-[100%_center] md:object-[70%_center] lg:object-center ${
              isRTL ? "" : "scale-x-[-1]"
            }`}
          />
          {/* Overall warm ivory veil — keeps the gold natural, no darkening */}
          <div className="absolute inset-0 bg-[oklch(0.985_0.012_88)] opacity-[0.09]" />
          {/* Soft cream gradient behind the copy side only */}
          <div
            className={`absolute inset-0 ${
              isRTL
                ? "bg-[linear-gradient(to_left,oklch(0.99_0.008_88/0.62)_0%,oklch(0.99_0.008_88/0.34)_42%,transparent_78%)]"
                : "bg-[linear-gradient(to_right,oklch(0.99_0.008_88/0.62)_0%,oklch(0.99_0.008_88/0.34)_42%,transparent_78%)]"
            }`}
          />
          {/* Mobile stacks the copy full-width, so lift readability slightly */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,oklch(0.99_0.008_88/0.5)_0%,oklch(0.99_0.008_88/0.22)_55%,transparent_100%)] md:hidden" />
        </div>

        {/* Static champagne atmosphere — pure gradients, no blur layers */}
        <div className="atmosphere-hero pointer-events-none absolute inset-0 -z-10">
          <div className="seam-warm absolute inset-x-0 bottom-0 h-40 opacity-70" />
        </div>

        <GoldBars />


        <div className="relative mx-auto grid max-w-[84rem] items-center gap-12 px-6 pb-24 pt-20 lg:grid-cols-[45fr_55fr] lg:gap-14 lg:px-12 lg:pb-28 lg:pt-20">
          {/* Content column */}
          <div className="flex flex-col items-start text-start">
            <motion.div {...enter(0, 18)}>
              <Badge
                variant="outline"
                className="gap-2 border-gold/30 bg-surface/70 px-4 py-1.5 text-[11px] font-semibold text-gold-deep backdrop-blur"
              >
                <Sparkles className="size-3.5" aria-hidden />
                {isAr ? "مصممة لسوق الذهب المصري" : "Built for the Egyptian gold trade"}
              </Badge>
            </motion.div>

            <motion.h1
              {...enter(0.15, 26)}
              className="mt-8 text-[2.5rem] font-extrabold leading-[1.3] tracking-tight text-foreground sm:text-6xl lg:text-[4rem] lg:leading-[1.22]"
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
              {...enter(0.28)}
              className="mt-8 max-w-xl text-base leading-[2.2] text-muted-foreground sm:text-lg"
            >
              {isAr
                ? "المخزون، أسعار الذهب، الكاشير والتقارير — في نظام واحد هادئ ودقيق."
                : "Inventory, gold rates, cashier and reporting — in one calm, precise system."}
            </motion.p>

            <motion.div {...enter(0.42, 20)} className="mt-12 flex flex-wrap items-center gap-5">
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

            <motion.ul
              {...enter(0.42, 16)}
              className="mt-12 flex flex-wrap gap-x-8 gap-y-4 text-sm text-muted-foreground"
            >
              {trustPoints.map((point) => (
                <li key={point.en} className="flex items-center gap-2.5">
                  <point.icon className="size-4 text-gold-deep" strokeWidth={1.7} aria-hidden />
                  <span>{isAr ? point.ar : point.en}</span>
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Visual column — refined glass card presenting the wordmark.
              Semi-transparent warm ivory so a hint of the Hero background
              reads through; soft champagne border + gentle warm shadow keep
              it premium without competing with the headline. */}
          <div className="relative flex items-center justify-center">
            <motion.div
              {...(reduce
                ? {}
                : {
                    initial: { opacity: 0, y: 26 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 1.1, delay: 0.2, ease: EASE },
                  })}
              className="relative w-full max-w-[30rem]"
            >
              <div className="relative flex min-h-[15rem] items-center justify-center overflow-hidden rounded-[1.5rem] border border-[rgba(190,145,70,0.22)] bg-[rgba(255,252,245,0.74)] p-9 shadow-[0_12px_30px_rgba(70,50,20,0.06),inset_0_1px_0_rgba(255,248,235,0.45)] backdrop-blur-[16px] sm:min-h-[18rem] sm:p-12 lg:min-h-[20rem]">
                {/* Whisper-thin champagne inner field for warmth */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(190,145,70,0.06),transparent_60%)]"
                />

                {/* Very subtle gold corner accents — secondary, never flashy */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-5 top-5 size-7 rounded-tl-[0.5rem] border-l border-t border-gold/20"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-5 right-5 size-7 rounded-br-[0.5rem] border-b border-r border-gold/20"
                />

                <img
                  src="/logo-ar.png"
                  alt="جوهرة تك"
                  width={612}
                  height={408}
                  className="relative h-32 w-auto max-w-full object-contain contrast-[1.08] saturate-[1.06] sm:h-44 lg:h-52"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Scroll-driven ring box + pillars ─────────────────────────────── */}
      <AssemblyStory locale={locale} />

      {/* ── Platform statement ───────────────────────────────────────────── */}
      <section
        id="platform"
        className="atmosphere-soft relative overflow-hidden border-y border-border/40 bg-surface-muted/30 py-28 lg:py-32"
      >
        <GoldBars />
        <AmbientDepth />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
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
        className="relative overflow-hidden bg-primary py-28 text-primary-foreground"
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
      <section className="atmosphere-soft relative overflow-hidden py-28 lg:py-36">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="aura-gold absolute left-1/2 top-1/2 size-[44rem] max-w-[130vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-70" />
          <div className="pedestal-gold absolute left-1/2 top-1/2 h-[18rem] w-[52rem] max-w-[110vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-60" />
        </div>
        <GoldBars />
        <AmbientDepth />
        <div className="relative mx-auto max-w-3xl px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-surface/70 p-10 text-center shadow-soft backdrop-blur-xl transition-[box-shadow,border-color] duration-500 hover:border-gold/35 hover:shadow-floating sm:p-16">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
              <img
                src="/logo-ar.png"
                alt="جوهرة تك"
                width={612}
                height={408}
                className="mx-auto h-24 w-auto object-contain contrast-[1.15] saturate-[1.1] drop-shadow-[0_20px_46px_oklch(0.62_0.085_72/0.28)] sm:h-28"
              />
              <h2 className="mt-10 text-[2rem] font-extrabold leading-[1.35] tracking-tight text-foreground sm:text-[2.6rem]">
                {isAr
                  ? "جاهز لتحديث محل الذهب الخاص بك؟"
                  : "Ready to modernize your jewelry house?"}
              </h2>
              <p className="mx-auto mt-7 max-w-lg text-base leading-[2.2] text-muted-foreground">
                {isAr
                  ? "ابدأ اليوم بتجربة إدارة هادئة وسريعة مصممة لسوق الذهب."
                  : "Start today with a calm, fast platform designed for the gold trade."}
              </p>
              <div className="mt-12">
                <Button
                  variant="gold"
                  onClick={() => void navigate({ to: "/login" })}
                  className="h-16 gap-3 rounded-full px-12 text-sm font-bold tracking-wide transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-floating active:translate-y-0"
                >
                  <span>{isAr ? "تسجيل الدخول" : "Sign In to System"}</span>
                  <ArrowIcon className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-surface/60 py-14 backdrop-blur">
        <div className="mx-auto flex max-w-[86rem] flex-col items-center justify-between gap-8 px-6 text-xs text-muted-foreground sm:flex-row lg:px-12">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <img
              src="/logo-ar.png"
              alt="جوهرة تك"
              width={612}
              height={408}
              className="h-14 w-auto object-contain contrast-[1.12]"
            />
            <span className="text-[11px] font-semibold text-gold-deep sm:border-s sm:border-border/50 sm:ps-5">
              {isAr
                ? "صُنعت لمحلات الذهب والمجوهرات المصرية"
                : "Made for Egyptian Jewelry Businesses"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <p className="text-[11px]">
              © {new Date().getFullYear()} جوهرة تك. جميع الحقوق محفوظة.
            </p>
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
              <span>{isAr ? "صُنع بواسطة" : "Crafted by"}</span>
              <img
                src={scorpiusWordmark.url}
                alt="Scorpius"
                className="h-2.5 w-auto object-contain opacity-70"
              />
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
