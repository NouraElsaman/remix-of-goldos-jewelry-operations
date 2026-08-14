import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { pageTransition, fadeUp, staggerList } from "./presets";

/** Wraps page content with the shared enter/exit transition. */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
      className={cn("flex min-w-0 flex-col gap-8", className)}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container for lists and card grids. */
export function StaggerGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerList}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}
