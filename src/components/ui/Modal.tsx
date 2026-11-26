import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import React, { useEffect, useRef } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const currentDialog = dialogRef.current;
      const focusable = Array.from(
        currentDialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true");
      const first = focusable[0] ?? currentDialog;
      const last = focusable[focusable.length - 1] ?? currentDialog;

      if (!currentDialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === currentDialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleTabKey);
    return () => {
      window.removeEventListener("keydown", handleTabKey);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-ink)]/20 backdrop-blur-[2px] animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        className={cn(
          "relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 rounded-2xl p-6 shadow-modal text-left animate-enter-up",
          className,
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-hairline)]/40">
          {title && <h3 className="text-lg font-bold text-[var(--color-ink)]">{title}</h3>}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
};
