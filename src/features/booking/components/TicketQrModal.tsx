import { Code39Barcode, normalizeBarCode } from "@/components/ui/Code39Barcode";
import { Modal } from "@/components/ui/Modal";
import { formatCurrencyINR, formatDateTime, formatLabel, pluralize, ticketCategoryBreakdown } from "@/lib/utils";
import { Ticket as TicketModel } from "@/models/ticket.schema";
import { useUiStore } from "@/stores/ui.store";
import { toPng } from "html-to-image";
import { Check, Copy, Download, MessageCircle, QrCode, Sparkles, Ticket } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import React, { useRef } from "react";

interface TicketPassCardProps {
  ticket: TicketModel;
  showActions?: boolean;
  adminActions?: boolean;
  whatsappPhone?: string;
  onMarkWaSent?: () => void | Promise<void>;
  waSent?: boolean;
  markWaSentLoading?: boolean;
}

const shareLink = (ticket: TicketModel) =>
  `${window.location.origin}/orders/track?ticket_id=${encodeURIComponent(ticket.id)}`;

const shareText = (ticket: TicketModel) =>
  `*HOUSEUNTOLD — YOUR TICKET*\n\n`
  + `*Event:* ${ticket.event_title}\n`
  + `*Lead guest:* ${(ticket.primary_guest_name || "Guest").toUpperCase()}\n`
  + `*Ticket:* ${ticket.category_name} • ${ticket.entry_count} ${pluralize(ticket.entry_count, "guest")}\n`
  + `*5-Character Bar Code:* ${ticket.bar_code || "—"}\n\n`
  + `*View your ticket and entry QR:* ${shareLink(ticket)}\n\n`
  + `Please carry a valid government photo ID. Show the QR code at entry and the bar code at the bar.`;

export const TicketPassCard: React.FC<TicketPassCardProps> = ({
  ticket,
  showActions = true,
  adminActions = false,
  whatsappPhone,
  onMarkWaSent,
  waSent = ticket.is_whatsapp_sent,
  markWaSentLoading = false,
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const { showToast } = useUiStore();

  const qrValue = ticket.gate_qr_token
    || (ticket as any).qr_token
    || (ticket as any).gate_token
    || "";
  const barcodeValue = normalizeBarCode(ticket.bar_code || "");
  const eventTitle = ticket.event_title || "HouseUntold Event";
  const passHolderName = (ticket.primary_guest_name || "GUEST").toUpperCase();
  const venueText = ticket.event_location || "Venue to be announced";

  // Adaptive sizing so longer names/venues wrap cleanly without crowding
  const titleSizeClass =
    eventTitle.length > 34
      ? "text-sm sm:text-base"
      : eventTitle.length > 22
      ? "text-base sm:text-lg"
      : "text-xl sm:text-2xl";

  const guestSizeClass =
    passHolderName.length > 22
      ? "text-[10px]"
      : passHolderName.length > 14
      ? "text-[11px]"
      : "text-xs";

  const venueSizeClass =
    venueText.length > 36
      ? "text-[10px]"
      : venueText.length > 24
      ? "text-[11px]"
      : "text-xs";

  const download = async () => {
    if (!ticketRef.current) return;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `houseuntold-ticket-${ticket.id.slice(0, 8)}.png`;
      link.click();
      showToast("Ticket downloaded.", "success");
    } catch {
      showToast("Could not download the ticket. Please try again.", "danger");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(ticket));
      showToast("Ticket details copied.", "success");
    } catch {
      showToast("Copying is not supported in this browser.", "warning");
    }
  };

  const openWhatsApp = () => {
    if (!whatsappPhone) return;
    const phone = whatsappPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(shareText(ticket))}`, "_blank");
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Compact, Wide Boarding-Pass Ticket */}
      <div ref={ticketRef} className="w-full flex justify-center">
        <div className="ticket-art relative flex w-full flex-col sm:flex-row rounded-2xl overflow-hidden border border-[var(--color-ink)]/25 bg-[var(--color-surface)] shadow-editorial">
          {/* LEFT MAIN TICKET BODY */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {/* Top Brand Strip */}
            <div className="h-9 px-5 bg-[var(--color-ink)] text-[var(--color-brand-text)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-hairline)] shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] truncate">
                  HouseUntold
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[var(--color-brand)]/30 border border-[var(--color-hairline)]/40 text-[9px] font-bold uppercase tracking-wider shrink-0 leading-none">
                {formatLabel(ticket.booking_status)}
              </span>
            </div>

            {/* Middle Content Area */}
            <div className="px-4 sm:px-5 py-3 flex items-stretch gap-3 flex-1">
              {/* Decorative Left Vertical Strip */}
              <div
                aria-hidden="true"
                className="hidden md:flex flex-col justify-between self-stretch w-2.5 py-0.5 opacity-25 shrink-0"
              >
                {[2, 1, 3, 1, 2, 1, 3, 2, 1, 2].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h * 2}px` }}
                    className="w-full bg-[var(--color-ink)] rounded-[1px]"
                  />
                ))}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between gap-2.5">
                {/* Event Title (Wider + Wraps & Scales) + Pricing Summary */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted)] block leading-none">
                      Event
                    </span>
                    <h4
                      className={`${titleSizeClass} font-extrabold text-[var(--color-ink)] leading-snug break-words line-clamp-2 mt-0.5`}
                    >
                      {eventTitle}
                    </h4>
                  </div>

                  <div className="text-[11px] font-semibold text-[var(--color-muted)] num shrink-0 sm:text-right leading-snug">
                    <div>
                      {ticket.section && ticket.seat_table_size
                        ? `Table · ${ticket.seat_table_size} guests · Section ${ticket.section}`
                        : ticketCategoryBreakdown(ticket)
                          || `${ticket.category_name} · ${ticket.entry_count} ${pluralize(ticket.entry_count, "guest")}`}
                    </div>
                    <div className="text-[var(--color-ink)] font-bold">
                      Amount Paid &bull; {formatCurrencyINR(ticket.total_amount)}
                    </div>
                    <div className="text-[var(--color-success)] font-bold">
                      Coverage {formatCurrencyINR(ticket.food_balance)}
                    </div>
                  </div>
                </div>

                {/* 3-Column Metadata Strip: Fixed Date/Time + Flexible Wrapping Guest & Venue */}
                <div className="grid grid-cols-2 sm:grid-cols-[max-content_minmax(0,1fr)_minmax(0,1.35fr)] gap-x-3 gap-y-2 pt-2 border-t border-[var(--color-hairline)]/60 items-start">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Date &amp; Time
                    </span>
                    <span className="text-xs font-bold text-[var(--color-ink)] num whitespace-nowrap block leading-snug mt-0.5">
                      {formatDateTime(ticket.event_starts_at || "")}
                    </span>
                  </div>

                  <div className="min-w-0 sm:border-l sm:border-[var(--color-hairline)]/60 sm:pl-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Guest Name
                    </span>
                    <span
                      className={`${guestSizeClass} font-bold text-[var(--color-ink)] uppercase tracking-wide leading-snug break-words line-clamp-2 block mt-0.5`}
                    >
                      {passHolderName}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 min-w-0 sm:border-l sm:border-[var(--color-hairline)]/60 sm:pl-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Venue
                    </span>
                    <span
                      className={`${venueSizeClass} font-bold text-[var(--color-ink)] leading-snug break-words line-clamp-2 block mt-0.5`}
                    >
                      {venueText}
                    </span>
                  </div>
                </div>

                {/* Full-Width Bar Counter Barcode Row */}
                <div className="pt-2 border-t border-dashed border-[var(--color-hairline)]/70 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--color-canvas)]/80 border border-[var(--color-hairline)]/70">
                    <Code39Barcode value={barcodeValue} />
                  </div>

                  <div className="sm:w-28 sm:text-right flex sm:flex-col justify-between sm:justify-center gap-1 shrink-0">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                        Ticket ID
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--color-ink)]">
                        #{ticket.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                        Barcode
                      </span>
                      <span className="text-xs font-mono font-extrabold tracking-widest text-[var(--color-brand)]">
                        {barcodeValue || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Strip */}
            <div className="h-7 px-5 bg-[var(--color-ink)] text-[var(--color-brand-text)] flex items-center justify-between gap-2 text-[10px]">
              <span className="font-semibold tracking-wider uppercase opacity-90 truncate">
                Official Entry Ticket
              </span>
              <span className="font-mono opacity-80 shrink-0">GOVERNMENT PHOTO ID REQUIRED</span>
            </div>
          </div>

          {/* PERFORATION TEAR-OFF DIVIDER (Desktop: Vertical Dark Circles) */}
          <div
            aria-hidden="true"
            className="relative hidden sm:flex flex-col items-center justify-between w-0 z-10"
          >
            <span className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-[var(--color-canvas)] border border-[var(--color-ink)]/35 z-20" />
            <div className="h-full py-4 flex flex-col items-center justify-between">
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-[var(--color-ink)]/75 shrink-0"
                />
              ))}
            </div>
            <span className="absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-[var(--color-canvas)] border border-[var(--color-ink)]/35 z-20" />
          </div>

          {/* PERFORATION TEAR-OFF DIVIDER (Mobile: Horizontal Dark Circles) */}
          <div
            aria-hidden="true"
            className="relative flex sm:hidden items-center justify-between px-4 py-1 bg-[var(--color-surface)]"
          >
            <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--color-canvas)] border border-[var(--color-ink)]/35 z-20" />
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]/75 shrink-0"
              />
            ))}
            <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--color-canvas)] border border-[var(--color-ink)]/35 z-20" />
          </div>

          {/* RIGHT STUB: LARGE 2D GATE QR CODE */}
          <div className="sm:w-[230px] shrink-0 flex flex-col justify-between bg-[var(--color-canvas)]/75">
            {/* Stub Header */}
            <div className="h-9 px-4 bg-[var(--color-brand)] text-[var(--color-brand-text)] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
                Entry QR
              </span>
              <Ticket className="w-3.5 h-3.5 shrink-0" />
            </div>

            {/* 2D QR Code */}
            <div className="p-2.5 flex-1 flex items-center justify-center">
              {qrValue ? (
                <div className="p-2 rounded-xl bg-white border border-[var(--color-hairline)] shadow-sm">
                  <QRCodeCanvas value={qrValue} size={156} level="M" marginSize={1} />
                </div>
              ) : (
                <div className="px-3 py-4 rounded-xl bg-white border border-dashed border-[var(--color-danger)] text-center">
                  <p className="text-[10px] font-bold text-[var(--color-danger)]">
                    Entry QR not available yet
                  </p>
                  <p className="text-[9px] text-[var(--color-muted)] mt-1">
                    Check back after payment is confirmed.
                  </p>
                </div>
              )}
            </div>

            {/* Stub Bottom Strip */}
            <div className="h-7 px-4 bg-[var(--color-brand)] text-[var(--color-brand-text)] flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold tracking-wider">
              <QrCode className="w-3 h-3 shrink-0" />
              <span>{qrValue ? "SCAN AT ENTRY" : "QR UNAVAILABLE"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Outside Below Ticket */}
      {showActions && (
        <div
          className={`mt-4 pt-4 border-t border-[var(--color-hairline)]/50 grid grid-cols-1 gap-2.5 ${
            adminActions ? "sm:grid-cols-2 lg:grid-cols-4" : ""
          }`}
        >
          <button
            type="button"
            onClick={download}
            className="px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Ticket
          </button>
          {adminActions && (
            <>
              <button
                type="button"
                onClick={copy}
                className="px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-ink)] text-xs font-bold flex items-center justify-center gap-1.5 hover:border-[var(--color-brand)] transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" /> Copy Details
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                disabled={!whatsappPhone}
                className="px-4 py-2.5 rounded-xl bg-[var(--color-success)]/15 border border-[var(--color-success)]/40 text-[var(--color-success)] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[var(--color-success)]/25 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" /> Send on WhatsApp
              </button>
              <button
                type="button"
                onClick={onMarkWaSent}
                disabled={!onMarkWaSent || waSent || markWaSentLoading}
                className="px-4 py-2.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)] text-xs font-bold flex items-center justify-center gap-1.5 hover:border-[var(--color-brand)] disabled:opacity-45 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />{" "}
                {markWaSentLoading ? "Marking..." : waSent ? "WA Sent" : "Mark WA Sent"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const TicketQrModal: React.FC<{ ticket: TicketModel | null | any; onClose: () => void }> = ({
  ticket,
  onClose,
}) => {
  if (!ticket) return null;
  return (
    <Modal isOpen={!!ticket} onClose={onClose} title="Gate Pass & QR Code">
      <TicketPassCard ticket={ticket} showActions />
    </Modal>
  );
};