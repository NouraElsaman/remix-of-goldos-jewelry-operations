import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BarChart3, Coins, FileText, Package, ShieldCheck, Users } from "lucide-react";

import { AmbientDepth } from "./ambient-depth";
import { GoldBars } from "./gold-bars";
import { RingBoxScene, useAssemblyProgress } from "./ring-box-scene";

type Pillar = {
  icon: LucideIcon;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
};

const PILLARS: Pillar[] = [
  {
    icon: Package,
    ar: "إدارة المخزون",
    en: "Inventory Management",
    descAr: "تتبّع كل قطعة بالعيار والوزن الصافي والدرج، بدقة تصل إلى 0.001 جرام.",
    descEn: "Track every piece by karat, net weight and tray — to 0.001g precision.",
  },
  {
    icon: Coins,
    ar: "تحديث أسعار الذهب",
    en: "Live Gold Pricing",
    descAr: "أسعار العيارات بالجنيه المصري تُحدَّث لحظيًا وتُطبَّق تلقائيًا على كل عملية بيع.",
    descEn: "EGP karat rates update instantly and apply automatically across every sale.",
  },
  {
    icon: Users,
    ar: "إدارة العملاء",
    en: "Client Management",
    descAr: "سجل كامل لكل عميل: المشتريات، المرتجعات، والتفضيلات في مكان واحد.",
    descEn: "A complete record per client: purchases, returns and preferences.",
  },
  {
    icon: BarChart3,
    ar: "التقارير",
    en: "Reporting",
    descAr: "تقارير مبيعات ومخزون وضريبة جاهزة للطباعة والتصدير في أي لحظة تحتاجها.",
    descEn: "Sales, inventory and VAT reports ready to print or export anytime.",
  },
  {
    icon: FileText,
    ar: "الفواتير",
    en: "Invoicing",
    descAr: "فواتير أنيقة للشغل والسبائك مع احتساب المصنعية والضريبة تلقائيًا.",
    descEn: "Refined invoices for jewelry and bullion with automatic making-charge and VAT.",
  },
  {
    icon: ShieldCheck,
    ar: "الأمان",
    en: "Security",
    descAr: "صلاحيات دقيقة لكل دور، وسجل تدقيق كامل لكل حركة داخل النظام.",
    descEn: "Granular role permissions and a full audit trail for every action.",
  },
  {
    icon: BadgeCheck,
    ar: "سهولة الاستخدام",
    en: "Effortless to Use",
    descAr: "واجهة عربية هادئة يتقنها الكاشير من أول يوم دون أي تدريب معقد.",
    descEn: "A calm Arabic-first interface your cashier masters on day one.",
  },
];

/**
 * The centerpiece: a scroll-driven ring-box assembly locked beside the
 * "why Jawhara Tech" pillars, which reveal one by one as the box comes together.
 */
export function AssemblyStory({ locale }: { locale: string }) {
  const { ref, progress } = useAssemblyProgress();
  const isAr = locale === "ar";

  return (
    <section id="why" ref={ref} className="relative">
      <GoldBars />
      <AmbientDepth />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] seam-warm opacity-80" />

      <div className="relative mx-auto grid max-w-[86rem] gap-x-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-12">
        {/* Sticky ring box stage */}
        <div className="top-0 h-[min(70vh,30rem)] lg:sticky lg:h-screen">
          <div className="relative flex h-full items-center justify-center">
            <div
              aria-hidden
              className="aura-gold pointer-events-none absolute inset-[6%] -z-10 rounded-[50%] opacity-70 lg:opacity-90"
            />
            <RingBoxScene
              progress={progress}
              className="w-[82%] max-w-[min(30rem,68vh)] sm:w-full"
            />
          </div>
        </div>

        {/* Pillars */}
        <div className="py-20 lg:py-[20vh]">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16 space-y-6"
          >
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-gold-deep">
              {isAr ? "التميّز" : "The Difference"}
            </span>
            <h2 className="text-[2.4rem] font-extrabold leading-[1.28] tracking-tight text-foreground sm:text-[3.1rem]">
              {isAr ? "لماذا جوهرة تك؟" : "Why Jawhara Tech?"}
            </h2>
            <p className="max-w-md text-base leading-[2.1] text-muted-foreground">
              {isAr
                ? "منظومة واحدة تجمع كل ما يحتاجه محل الذهب، مصممة بهدوء ودقة تليق بالمعدن الذي تبيعه."
                : "One system holding everything a jewelry house needs — built with the precision the metal deserves."}
            </p>
          </motion.div>

          <div className="space-y-6 lg:space-y-10">
            {PILLARS.map((pillar, index) => (
              <PillarCard key={pillar.en} pillar={pillar} index={index} isAr={isAr} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PillarCard({ pillar, index, isAr }: { pillar: Pillar; index: number; isAr: boolean }) {
  const Icon = pillar.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group relative flex items-start gap-4 overflow-hidden rounded-[1.5rem] border border-white/70 bg-surface/70 p-5 sm:gap-6 sm:rounded-[2rem] sm:p-8 shadow-soft backdrop-blur-xl transition-[box-shadow,border-color] duration-500 hover:border-gold/35 hover:shadow-floating"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <span className="flex size-11 shrink-0 sm:size-14 items-center justify-center rounded-2xl border border-border/60 bg-surface-muted/60 text-gold-deep transition-all duration-500 group-hover:border-gold/40 group-hover:bg-gold-soft">
        <Icon className="size-5 sm:size-6" strokeWidth={1.6} aria-hidden />
      </span>
      <div className="space-y-2.5">
        <h3 className="text-lg font-bold sm:text-xl tracking-tight text-foreground">
          {isAr ? pillar.ar : pillar.en}
        </h3>
        <p className="text-sm leading-[2.05] text-muted-foreground">
          {isAr ? pillar.descAr : pillar.descEn}
        </p>
      </div>
      <span className="absolute bottom-4 end-5 font-mono sm:bottom-6 sm:end-8 text-xs text-muted-foreground/40">
        {String(index + 1).padStart(2, "0")}
      </span>
    </motion.article>
  );
}
