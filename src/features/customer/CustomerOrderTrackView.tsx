import { useTicketLookup } from "@/api/hooks/useTickets";
import { TicketPassCard } from "@/components/tickets/TicketPassCard";
import { formatCurrencyINR, formatDateTime } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Search,
  Ticket,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

function normalizeLookup(value: string) {
  const v = value.trim();
  const uuid = v.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return uuid[0];
  const digits = v.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return v;
}

export const CustomerOrderTrackView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("ticket_id") || "";
  const [ticketInput, setTicketInput] = useState(initialId);
  const [activeQuery, setActiveQuery] = useState(initialId);
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: ticketDetails, isLoading, error, refetch, isFetching } = useTicketLookup(activeQuery);
  const { showToast } = useUiStore();

  useEffect(() => {
    const id = searchParams.get("ticket_id") || "";
    if (id) {
      setTicketInput(id);
      setActiveQuery(id);
    }
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = normalizeLookup(ticketInput);
    if (!q) {
      showToast("Enter ticket ID, mobile number, or UTR", "warning");
      return;
    }
    if (q === activeQuery) {
      await refetch();
      return;
    }
    setActiveQuery(q);
  };

  const handleClear = () => {
    setTicketInput("");
    setActiveQuery("");
  };

  const handleCopyBarCode = async () => {
    if (!ticketDetails?.bar_code) return;
    try {
      await navigator.clipboard.writeText(ticketDetails.bar_code);
      setCopiedCode(true);
      showToast("Bar code copied to clipboard", "success");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast("Could not copy the bar code", "warning");
    }
  };

  const status = ticketDetails?.booking_status;
  const isConfirmed = status === "CONFIRMED";
  const isRejected = status === "FAILED" || status === "REJECTED";
  const isCheckedIn = Boolean(ticketDetails?.is_checked_in);
  const statusLabel = isRejected
    ? "Payment not approved"
    : isCheckedIn
    ? "Checked in"
    : isConfirmed
    ? "Ready for entry"
    : "Payment review";

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in text-left pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--color-hairline)]/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-brand)] shadow-sm shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink)] tracking-tight leading-none">
              My Ticket
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
              Find your pass, entry QR, bar code, and bar credit.
            </p>
          </div>
        </div>
      </div>

      {/* Inline Aligned Search Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-2">
          <label
            htmlFor="ticket-id"
            className="block text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider"
          >
            Mobile number or Transaction ID (UTR No.)
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-[var(--color-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="ticket-id"
                type="text"
                placeholder="10-digit mobile, or 12-digit UTR"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                aria-describedby="ticket-id-help"
                required
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)] placeholder:font-sans placeholder:text-[var(--color-muted)]/55 text-sm font-mono focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10 focus:outline-none transition-colors"
              />
              {ticketInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear ticket search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)] active:scale-90 transition-[color,transform] cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isFetching}
              className="h-11 px-6 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] font-semibold text-sm transition-[background-color,transform,opacity] duration-150 ease-[var(--ease-out)] hover:bg-[var(--color-brand-hover)] active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:active:scale-100 shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{isLoading || isFetching ? "Finding..." : "Find Ticket"}</span>
            </button>
          </div>

          <p id="ticket-id-help" className="text-[11px] text-[var(--color-muted)]">
            Search by registered mobile number, or payment transaction ID.
          </p>
        </form>
      </div>

      {/* Loading Skeleton */}
      {(isLoading || isFetching) && (
        <div
          role="status"
          aria-label="Finding your ticket"
          className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/60 p-6 sm:p-8 space-y-6 animate-pulse"
        >
          <div className="flex justify-between items-start pb-5 border-b border-[var(--color-hairline)]/40">
            <div className="space-y-2.5 w-2/3">
              <div className="h-3 w-24 rounded bg-[var(--color-hairline)]/40" />
              <div className="h-7 w-3/4 rounded bg-[var(--color-hairline)]/40" />
              <div className="h-3.5 w-1/2 rounded bg-[var(--color-hairline)]/30" />
            </div>
            <div className="h-7 w-28 rounded-full bg-[var(--color-hairline)]/40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-52 rounded-xl bg-[var(--color-canvas)]/70" />
            <div className="h-52 rounded-xl bg-[var(--color-canvas)]/70" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="h-16 rounded-xl bg-[var(--color-canvas)]/70" />
            <div className="h-16 rounded-xl bg-[var(--color-canvas)]/70" />
            <div className="h-16 rounded-xl bg-[var(--color-canvas)]/70" />
            <div className="h-16 rounded-xl bg-[var(--color-canvas)]/70" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activeQuery && !isLoading && (
        <div className="p-10 sm:p-12 rounded-2xl bg-[var(--color-surface)]/60 border border-dashed border-[var(--color-hairline)] text-center flex flex-col items-center justify-center space-y-3 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-brand)]">
            <Ticket className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-ink)]">Find your ticket</h2>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] max-w-md">
            Enter your ticket UUID, registered mobile number, or payment UTR to view your pass,
            booking details, and bar credit.
          </p>
        </div>
      )}

      {/* Not Found State */}
      {error && !isLoading && (
        <div
          role="alert"
          className="p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-danger)]/35 text-center space-y-3 animate-fade-in"
        >
          <div className="w-11 h-11 rounded-xl bg-[var(--color-danger-bg)] text-[var(--color-danger)] flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-[var(--color-danger)]">
              We couldn&apos;t find that ticket
            </p>
            <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
              Check the ticket UUID, registered mobile number, or payment UTR. Ask the venue desk if
              it still fails.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-brand)] active:scale-[0.97] transition-[border-color,transform] cursor-pointer"
          >
            Try another search
          </button>
        </div>
      )}

      {/* Ticket Result */}
      {ticketDetails && !isLoading && (
        <div className="space-y-4 animate-enter-up">
          {isRejected && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/35 text-xs text-[var(--color-danger)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">
                Payment for this ticket was not approved. Contact the venue desk if you believe this
                is a mistake.
              </span>
            </div>
          )}

          <TicketPassCard ticket={ticketDetails} whatsappPhone={ticketDetails.contact_phone} />

          {/* 4-Column Status Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 flex flex-col justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Entry status
              </span>
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  isRejected
                    ? "text-[var(--color-danger)]"
                    : isConfirmed || isCheckedIn
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-ink)]"
                }`}
              >
                {isRejected ? (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                ) : isConfirmed || isCheckedIn ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{statusLabel}</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 flex flex-col justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Check-in
              </span>
              <span className="text-xs font-semibold text-[var(--color-ink)] num truncate">
                {isCheckedIn
                  ? ticketDetails.checked_in_at
                    ? formatDateTime(ticketDetails.checked_in_at)
                    : "Checked in"
                  : "Not checked in"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 flex flex-col justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Bar code
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold tracking-widest text-[var(--color-ink)] num">
                  {ticketDetails.bar_code || "—"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyBarCode}
                  disabled={!ticketDetails.bar_code}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[10px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-brand)] active:scale-95 transition-[color,border-color,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
                >
                  {copiedCode ? (
                    <Check className="w-3 h-3 text-[var(--color-success)]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 flex flex-col justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Bar credit left
              </span>
              <span className="text-sm font-bold text-[var(--color-success)] num">
                {formatCurrencyINR(ticketDetails.food_balance ?? 0)}
              </span>
            </div>
          </div>

          {!isConfirmed && !isRejected && (
            <div className="p-3.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-center text-xs text-[var(--color-muted)]">
              Your payment reference is under review. The entry QR and bar code appear here once
              approved.
            </div>
          )}
        </div>
      )}
    </div>
  );
};