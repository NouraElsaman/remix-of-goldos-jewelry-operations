import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

import { cn } from "@/lib/utils";

const BARS = [
  { top: "14%", width: "42%", start: "-8%", drift: 70, opacity: 0.5 },
  { top: "31%", width: "26%", start: "58%", drift: -50, opacity: 0.34 },
  { top: "52%", width: "62%", start: "-14%", drift: 110, opacity: 0.42 },
  { top: "68%", width: "18%", start: "72%", drift: -78, opacity: 0.3 },
  { top: "84%", width: "36%", start: "22%", drift: 58, opacity: 0.38 },
];

/**
 * Whisper-thin gold filaments that drift horizontally with scroll.
 * Pure luxury parallax — never loud enough to compete with content.
 */
export function GoldBars({ className }: { className?: string | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10", className)}
    >
      {BARS.map((bar, i) => (
        <Bar key={i} progress={scrollYProgress} {...bar} />
      ))}
    </div>
  );
}

function Bar({
  progress,
  top,
  width,
  start,
  drift,
  opacity,
}: {
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  top: string;
  width: string;
  start: string;
  drift: number;
  opacity: number;
}) {
  const x = useTransform(progress, [0, 1], [-drift, drift]);
  return (
    <motion.span
      style={{ x, top, width, insetInlineStart: start, opacity }}
      className="absolute h-px bg-gradient-to-r from-transparent via-gold to-transparent"
    />
  );
}