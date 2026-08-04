import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { cn } from "@/lib/utils";
import LogoAr from "@/assets/branding/logo-ar.png";

/**
 * Scroll-driven, fully reversible ring-box assembly.
 *
 * Four independent layers (base → velvet cushion → gold ring → lid) start fully
 * exploded and mechanically settle into a closed luxury box as `progress`
 * moves 0 → 1. Every transform is derived from the same MotionValue, so
 * scrolling upward reverses the interaction exactly.
 */
export function RingBoxScene({
  progress,
  className,
}: {
  progress: MotionValue<number>;
  className?: string | undefined;
}) {
  // Smooth the raw scroll value so motion feels weighted, never twitchy.
  const p = useSpring(progress, { stiffness: 90, damping: 26, mass: 0.6 });

  // Layer travel — staggered ranges create the mechanical, sequential assembly.
  const lidY = useTransform(p, [0, 0.72, 1], [-230, -66, -60]);
  const lidLift = useTransform(p, [0.72, 1], [0, 1]);
  const lidRotate = useTransform(p, [0, 0.5, 1], [-9, -3, 0]);
  const ringY = useTransform(p, [0, 0.55, 1], [-92, -30, -30]);
  const ringScale = useTransform(p, [0, 0.55, 1], [1.06, 1, 1]);
  const velvetY = useTransform(p, [0, 0.4, 1], [-40, 0, 0]);

  const lidTotalY = useTransform([lidY, lidLift], (v) => {
    const [y, lift] = v as [number, number];
    return y + lift * 54;
  });

  const shadowScale = useTransform(p, [0, 1], [1.16, 0.94]);
  const shadowOpacity = useTransform(p, [0, 1], [0.1, 0.24]);
  const glow = useTransform(p, [0, 0.55, 1], [0.55, 0.9, 0.3]);

  return (
    <div
      className={cn(
        "relative flex aspect-square w-full items-center justify-center",
        className,
      )}
      aria-hidden
    >
      {/* Ambient warm light */}
      <motion.div
        style={{ opacity: glow }}
        className="pointer-events-none absolute inset-[12%] rounded-full bg-gold-soft/70 blur-[90px]"
      />

      <div
        className="relative h-full w-full"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 46%" }}
      >
        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Contact shadow on the floor */}
          <motion.div
            style={{ scale: shadowScale, opacity: shadowOpacity }}
            className="absolute left-1/2 top-[70%] h-16 w-[58%] -translate-x-1/2 rounded-[50%] bg-foreground blur-2xl"
          />

          <Layer y={velvetY} depth={0}>
            <BoxBase />
          </Layer>

          <Layer y={velvetY} depth={1}>
            <VelvetCushion />
          </Layer>

          <Layer y={ringY} depth={2} scale={ringScale}>
            <GoldRing />
          </Layer>

          <Layer y={lidTotalY} depth={3} rotate={lidRotate}>
            <BoxLid />
          </Layer>
        </div>
      </div>
    </div>
  );
}

function Layer({
  y,
  depth,
  scale,
  rotate,
  children,
}: {
  y: MotionValue<number>;
  depth: number;
  scale?: MotionValue<number> | undefined;
  rotate?: MotionValue<number> | undefined;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{
        y,
        ...(scale ? { scale } : {}),
        ...(rotate ? { rotateZ: rotate } : {}),
        zIndex: depth + 1,
        willChange: "transform",
      }}
      className="absolute inset-x-[12%] top-1/2 flex -translate-y-1/2 items-center justify-center"
    >
      <div
        className="w-full"
        style={{ transform: "rotateX(58deg)", transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/** Bottom base — thick ivory shell with a machined edge. */
function BoxBase() {
  return (
    <div className="relative aspect-square w-full">
      <div
        className="absolute inset-0 rounded-[22%] border border-white/70"
        style={{
          background:
            "linear-gradient(155deg, oklch(1 0 0), oklch(0.965 0.01 86) 55%, oklch(0.93 0.014 84))",
          boxShadow:
            "0 42px 0 -2px oklch(0.9 0.012 84), 0 46px 0 -2px oklch(0.86 0.014 82), 0 60px 70px -30px oklch(0.4 0.02 60 / 0.35), inset 0 2px 4px oklch(1 0 0)",
        }}
      />
    </div>
  );
}

/** Velvet cushion — warm ivory suede with a soft central channel. */
function VelvetCushion() {
  return (
    <div className="relative aspect-square w-full px-[9%] py-[9%]">
      <div
        className="h-full w-full rounded-[20%]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 20%, oklch(0.97 0.022 88), oklch(0.91 0.03 84) 70%, oklch(0.86 0.032 80))",
          boxShadow:
            "inset 0 10px 22px oklch(0.55 0.04 70 / 0.16), inset 0 -6px 14px oklch(1 0 0 / 0.7), 0 18px 30px -18px oklch(0.4 0.02 60 / 0.4)",
        }}
      >
        <div
          className="mx-auto mt-[42%] h-[6%] w-[34%] rounded-full"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.8 0.03 76 / 0.55), oklch(0.94 0.02 84 / 0.2))",
            boxShadow: "inset 0 2px 4px oklch(0.5 0.04 70 / 0.35)",
          }}
        />
      </div>
    </div>
  );
}

/** Gold ring — burnished band rendered as pure SVG for crisp edges. */
function GoldRing() {
  return (
    <div className="relative aspect-square w-full">
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        style={{
          filter: "drop-shadow(0 14px 18px oklch(0.5 0.06 70 / 0.35))",
        }}
      >
        <defs>
          <linearGradient id="jt-gold-band" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.9 0.06 92)" />
            <stop offset="30%" stopColor="oklch(0.78 0.09 82)" />
            <stop offset="55%" stopColor="oklch(0.66 0.09 74)" />
            <stop offset="78%" stopColor="oklch(0.84 0.08 86)" />
            <stop offset="100%" stopColor="oklch(0.62 0.085 72)" />
          </linearGradient>
          <linearGradient id="jt-gold-inner" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.6 0.08 70)" />
            <stop offset="100%" stopColor="oklch(0.86 0.07 88)" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="36"
          fill="none"
          stroke="url(#jt-gold-band)"
          strokeWidth="13"
        />
        <circle
          cx="100"
          cy="100"
          r="42"
          fill="none"
          stroke="url(#jt-gold-inner)"
          strokeWidth="1.5"
          opacity="0.8"
        />
        <circle
          cx="100"
          cy="100"
          r="30"
          fill="none"
          stroke="oklch(1 0 0 / 0.55)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/** Top lid — the brand surface. Carries the Jawhara Tech mark, never an icon. */
function BoxLid() {
  return (
    <div className="relative aspect-square w-full">
      <div
        className="absolute inset-0 flex items-center justify-center rounded-[22%] border border-white/80"
        style={{
          background:
            "linear-gradient(150deg, oklch(1 0 0), oklch(0.98 0.008 86) 45%, oklch(0.945 0.012 84))",
          boxShadow:
            "0 26px 0 -2px oklch(0.92 0.012 84), 0 30px 0 -2px oklch(0.88 0.014 82), 0 50px 60px -26px oklch(0.4 0.02 60 / 0.32), inset 0 2px 6px oklch(1 0 0)",
        }}
      >
        <img
          src={LogoAr}
          alt=""
          className="w-[46%] object-contain opacity-95 drop-shadow-[0_6px_14px_oklch(0.62_0.085_72/0.28)]"
        />
      </div>
    </div>
  );
}

/**
 * Hook wiring a section element to a 0→1 assembly progress value.
 */
export function useAssemblyProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  return { ref, progress: scrollYProgress };
}