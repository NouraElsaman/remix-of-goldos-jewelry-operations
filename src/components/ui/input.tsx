import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-surface/50 backdrop-blur-sm px-3.5 py-2 text-sm shadow-sm transition-all duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 hover:border-border-strong focus-visible:outline-none focus-visible:border-gold-deep/50 focus-visible:ring-[3px] focus-visible:ring-gold-deep/10 disabled:cursor-not-allowed disabled:bg-surface-muted/60 disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
