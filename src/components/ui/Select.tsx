import { cn } from "@/lib/utils";
import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, options, children, id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || props.name || generatedId;
    const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;
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
          <label htmlFor={selectId} className="text-[13px] font-medium text-[var(--color-muted)]">
            {label}
          </label>
        )}
        <div className={cn(shake && "shake")} onAnimationEnd={(e) => { if (e.animationName === "field-shake") setShake(false); }}>
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "field-select w-full min-h-[44px] px-3.5 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-xl text-base sm:text-sm text-[var(--color-ink)] transition-[border-color,box-shadow,background-color,transform] duration-150 ease-[var(--ease-out)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/12 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              error && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/12",
              className,
            )}
            {...props}
          >
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        </div>
        {error && <span id={`${selectId}-error`} className="text-xs text-[var(--color-danger)]" role="status">{error}</span>}
        {hint && !error && <span id={`${selectId}-hint`} className="text-xs text-[var(--color-muted)]">{hint}</span>}
      </div>
    );
  },
);
Select.displayName = "Select";
