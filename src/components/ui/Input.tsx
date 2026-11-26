import { cn } from "@/lib/utils";
import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, leading, trailing, onAnimationEnd, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || props.name || generatedId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
    const [shake, setShake] = React.useState(false);
    const prevError = React.useRef(error);

    React.useEffect(() => {
      if (error && error !== prevError.current) setShake(true);
      if (!error) setShake(false);
      prevError.current = error;
    }, [error]);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-[var(--color-muted)]">
            {label}
          </label>
        )}
        <div className={cn("relative", shake && "shake")} onAnimationEnd={(e) => { if (e.animationName === "field-shake") setShake(false); onAnimationEnd?.(e as any); }}>
          {leading && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-muted)]">
              {leading}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "w-full min-h-[44px] px-3.5 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-xl text-base sm:text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/70 transition-[border-color,box-shadow,background-color,transform] duration-150 ease-[var(--ease-out)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/12 disabled:opacity-50 disabled:cursor-not-allowed",
              leading ? "pl-10" : undefined,
              trailing ? "pr-10" : undefined,
              error && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/12",
              className,
            )}
            {...props}
          />
          {trailing && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--color-muted)]">
              {trailing}
            </div>
          )}
        </div>
        {error && <span id={`${inputId}-error`} className="text-xs text-[var(--color-danger)]" role="status">{error}</span>}
        {hint && !error && <span id={`${inputId}-hint`} className="text-xs text-[var(--color-muted)]">{hint}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";
