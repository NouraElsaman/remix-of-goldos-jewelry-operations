import { useEffect, useRef } from "react";
import { useReducedMotion, useScroll, useSpring, type MotionValue } from "motion/react";

import { cn } from "@/lib/utils";
import { createRingBoxRenderer, type RingBoxRenderer } from "./ring-box-renderer";

/**
 * Scroll-driven, fully reversible ring-box assembly.
 *
 * The scene is a single lightweight WebGL scene (one renderer, one camera,
 * render-on-demand) containing real geometry: a hollow base with side walls and
 * a cavity, a recessed cushion, a volumetric gold torus and a lid with
 * thickness, side wall, underside and inner lip.
 *
 * All transforms are derived deterministically from the same `progress`
 * MotionValue, so scrolling upward reverses the assembly exactly.
 */
export function RingBoxScene({
  progress,
  className,
}: {
  progress: MotionValue<number>;
  className?: string | undefined;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Smooth the raw scroll value so motion feels weighted, never twitchy.
  const p = useSpring(progress, { stiffness: 90, damping: 26, mass: 0.6 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: RingBoxRenderer | null = null;
    let disposed = false;
    const source = reduce ? progress : p;

    void createRingBoxRenderer(host).then((instance) => {
      if (disposed) {
        instance.dispose();
        return;
      }
      renderer = instance;
      renderer.setProgress(source.get());
    });

    const unsubscribe = source.on("change", (value) => renderer?.setProgress(value));

    return () => {
      disposed = true;
      unsubscribe();
      renderer?.dispose();
      renderer = null;
    };
  }, [p, progress, reduce]);

  return (
    <div
      className={cn("relative flex aspect-square w-full items-center justify-center", className)}
      aria-hidden
    >
      {/* Ambient warm studio light behind the product — static gradient, no blur */}
      <div className="aura-gold pointer-events-none absolute inset-[6%] rounded-[50%]" />

      <div ref={hostRef} className="relative h-full w-full" />
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
