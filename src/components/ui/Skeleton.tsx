import { cn } from "@/lib/utils";
import React from "react";

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={cn("animate-pulse rounded-xl bg-[var(--color-hairline)]/20", className)} {...props} />;
};
