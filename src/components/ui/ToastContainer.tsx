import { useUiStore } from "@/stores/ui.store";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React from "react";
import { SPRING_SPATIAL } from "../../lib/motion/variants";

export interface ToastMessage {
  id: string;
  title: string;
  tone: "error" | "success" | "info";
}

interface ToastContainerProps {
  toasts?: ToastMessage[];
  onDismiss?: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts: propToasts,
  onDismiss: propOnDismiss,
}) => {
  const storeToasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  const toasts: ToastMessage[] = propToasts
    ?? storeToasts.map((t) => ({
      id: t.id,
      title: t.message,
      tone: t.type === "danger" ? "error" : t.type === "success" ? "success" : "info",
    }));

  const onDismiss = propOnDismiss ?? removeToast;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 pointer-events-none sm:bottom-6 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const isError = toast.tone === "error";
          const isSuccess = toast.tone === "success";

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.94 }}
              transition={SPRING_SPATIAL}
              role={isError ? "alert" : "status"}
              aria-live={isError ? "assertive" : "polite"}
              aria-atomic="true"
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-modal border backdrop-blur-xl ${
                isError
                  ? "bg-[var(--color-danger-bg)]/95 border-[var(--color-danger)]/35 text-[var(--color-ink)]"
                  : isSuccess
                  ? "bg-[var(--color-success-bg)]/95 border-[var(--color-success)]/35 text-[var(--color-ink)]"
                  : "bg-[var(--color-surface)]/96 border-[var(--color-hairline)] text-[var(--color-ink)]"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isError
                  ? <AlertCircle className="w-5 h-5 text-[var(--color-danger)]" strokeWidth={2} />
                  : isSuccess
                  ? <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" strokeWidth={2} />
                  : <Info className="w-5 h-5 text-[var(--color-brand)]" strokeWidth={2} />}
              </div>

              <div className="flex-1 text-[13px] font-medium leading-relaxed">
                {toast.title}
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="min-h-[44px] min-w-[44px] -m-2 inline-flex items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] cursor-pointer active:scale-[0.96] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
