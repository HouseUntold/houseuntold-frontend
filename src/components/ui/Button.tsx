import React, { useLayoutEffect, useRef, useState } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-brand)] text-[var(--color-brand-text)] hover:bg-[var(--color-brand-hover)] border border-transparent font-medium shadow-[0_1px_2px_rgba(64,16,33,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-hairline)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]",
  ghost:
    "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] border border-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]",
  danger:
    "bg-[var(--color-danger-bg)]/70 text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-danger)]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-[40px] px-3.5 text-[13px]",
  md: "min-h-[44px] px-4 sm:px-5 text-sm",
  lg: "min-h-[48px] px-5 sm:px-6 text-[15px]",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  children,
  style,
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [lockedWidth, setLockedWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (isLoading && btnRef.current && lockedWidth === undefined) {
      setLockedWidth(btnRef.current.getBoundingClientRect().width);
    } else if (!isLoading && lockedWidth !== undefined) {
      setLockedWidth(undefined);
    }
  }, [isLoading, lockedWidth]);

  return (
    <button
      ref={btnRef}
      disabled={disabled || isLoading}
      style={lockedWidth ? { ...style, width: `${lockedWidth}px` } : style}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap shrink-0 cursor-pointer select-none touch-manipulation transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100 ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {isLoading
        ? (
          <span className="inline-flex items-center gap-1" aria-label="Loading">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:120ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:240ms]" />
          </span>
        )
        : children}
    </button>
  );
};
