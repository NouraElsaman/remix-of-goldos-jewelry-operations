import { cn } from "@/lib/utils";

/**
 * Extremely soft champagne light falloff that gives flat ivory sections depth.
 * Pure static CSS gradients — no blur layers, no animation, no compositing cost.
 */
export function AmbientDepth({ className }: { className?: string | undefined }) {
  return (
    <div
      aria-hidden
      className={cn(
        "atmosphere-soft pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-60 sm:opacity-100",
        className,
      )}
    />
  );
}
