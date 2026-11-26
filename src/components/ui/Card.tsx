import { cn } from "@/lib/utils";
import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "surface" | "interactive";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "bg-[var(--color-surface)] border border-[var(--color-hairline)]/65 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(64,16,33,0.04)]",
      surface: "bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 rounded-2xl p-4 sm:p-5 shadow-[0_8px_24px_rgba(64,16,33,0.05)]",
      interactive:
        "bg-[var(--color-surface)] border border-[var(--color-hairline)]/65 rounded-2xl p-4 sm:p-5 transition-[transform,border-color,background-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-[var(--color-brand)]/35 hover:bg-[var(--color-surface-hover)]/50 hover:shadow-[0_10px_28px_rgba(64,16,33,0.07)] cursor-pointer active:scale-[0.995] touch-manipulation",
    };

    return (
      <div ref={ref} className={cn(variants[variant], className)} {...props}>
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";
