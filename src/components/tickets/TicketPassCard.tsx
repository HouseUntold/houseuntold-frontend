import { Code39Barcode, normalizeBarCode } from "@/components/ui/Code39Barcode";
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
  const passHolderName = (ticket.primary_guest_name || "GUEST").toUpperCase();

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
      showToast("Copying is not supported in this browser.", "danger");
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
        <div className="ticket-art relative flex w-full flex-col sm:flex-row rounded-2xl overflow-hidden border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-editorial">
          {/* LEFT MAIN TICKET BODY */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {/* Top Brand Strip (Exact h-9 to match right stub) */}
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

            {/* Middle Content Area (Compact Vertical Height) */}
            <div className="px-5 py-2.5 flex items-stretch gap-3.5 flex-1">
              {/* Decorative Left Vertical Strip */}
              <div
                aria-hidden="true"
                className="hidden md:flex flex-col justify-between self-stretch w-3 py-0.5 opacity-30 shrink-0"
              >
                {[2, 1, 3, 1, 2, 1, 3, 2, 1, 2].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h * 2}px` }}
                    className="w-full bg-[var(--color-ink)] rounded-[1px]"
                  />
                ))}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                {/* Larger Event Title + Tier & F&B Wallet Summary */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted)] block leading-none">
                      Event
                    </span>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-[var(--color-ink)] leading-tight truncate mt-0.5">
                      {ticket.event_title}
                    </h4>
                  </div>
                  <p className="text-[11px] font-semibold text-[var(--color-muted)] num shrink-0 text-right">
                    {ticket.section && ticket.seat_table_size
                      ? `Table · ${ticket.seat_table_size} guests · Section ${ticket.section}`
                      : ticketCategoryBreakdown(ticket) || `${ticket.category_name} · ${ticket.entry_count} ${pluralize(ticket.entry_count, "guest")}`}<br />
                    <span className="text-[var(--color-ink)] font-bold">Amount Paid &bull; {formatCurrencyINR(ticket.total_amount)}</span><br />
                    <span className="text-[var(--color-success)] font-bold">Coverage {formatCurrencyINR(ticket.food_balance)}</span>
                  </p>
                </div>

                {/* 3-Column Metadata Strip (Venue wraps to 2nd line, Pass Holder UPPERCASE) */}
                <div className="grid grid-cols-2 sm:grid-cols-[1.15fr_0.9fr_1.45fr] gap-3 pt-2 border-t border-[var(--color-hairline)]/60">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Date &amp; Time
                    </span>
                    <span className="text-xs font-bold text-[var(--color-ink)] num block leading-snug">
                      {formatDateTime(ticket.event_starts_at || "")}
                    </span>
                  </div>

                  <div className="min-w-0 sm:border-l sm:border-[var(--color-hairline)]/60 sm:pl-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Guest Name
                    </span>
                    <span className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wide truncate block leading-snug">
                      {passHolderName}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 min-w-0 sm:border-l sm:border-[var(--color-hairline)]/60 sm:pl-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Venue
                    </span>
                    <span className="text-xs font-bold text-[var(--color-ink)] leading-snug line-clamp-2 break-words block">
                      {ticket.event_location || "Venue to be announced"}
                    </span>
                  </div>
                </div>

                {/* Full-Width Bar Counter Barcode Row */}
                <div className="pt-2 border-t border-dashed border-[var(--color-hairline)]/70 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--color-canvas)]/80 border border-[var(--color-hairline)]/70">
                    <Code39Barcode value={barcodeValue} />
                  </div>

                  <div className="sm:w-32 sm:text-right flex sm:flex-col justify-between sm:justify-center gap-1 shrink-0">
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

            {/* Bottom Strip (Exact h-7 to match right stub) */}
            <div className="h-7 px-5 bg-[var(--color-ink)] text-[var(--color-brand-text)] flex items-center justify-between gap-2 text-[10px]">
              <span className="font-semibold tracking-wider uppercase opacity-90 truncate">
                Official Entry Ticket
              </span>
              <span className="font-mono opacity-80 shrink-0">GOVERNMENT PHOTO ID REQUIRED</span>
            </div>
          </div>

          {/* PERFORATION CUT LINE WITH TOP & BOTTOM NOTCHES */}
          <div className="relative hidden sm:flex flex-col items-center justify-center w-0">
            <span
              aria-hidden="true"
              className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] z-10"
            />
            <div className="h-full border-l-2 border-dashed border-[var(--color-hairline)]" />
            <span
              aria-hidden="true"
              className="absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] z-10"
            />
          </div>

          {/* RIGHT STUB: LARGE 2D GATE QR CODE */}
          <div className="sm:w-[230px] shrink-0 flex flex-col justify-between bg-[var(--color-canvas)]/75 border-t-2 border-dashed sm:border-t-0 border-[var(--color-hairline)]">
            {/* Stub Header (Exact h-9 to align flush with left top bar) */}
            <div className="h-9 px-4 bg-[var(--color-brand)] text-[var(--color-brand-text)] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
                Entry QR
              </span>
              <Ticket className="w-3.5 h-3.5 shrink-0" />
            </div>

            {/* 2D QR Code */}
            <div className="p-2.5 flex-1 flex items-center justify-center">
              {qrValue
                ? (
                  <div className="p-2 rounded-xl bg-white border border-[var(--color-hairline)] shadow-sm">
                    <QRCodeCanvas value={qrValue} size={156} level="M" marginSize={1} />
                  </div>
                )
                : (
                  <div className="px-3 py-4 rounded-xl bg-white border border-dashed border-[var(--color-danger)] text-center">
                    <p className="text-[10px] font-bold text-[var(--color-danger)]">Entry QR not available yet</p>
                    <p className="text-[9px] text-[var(--color-muted)] mt-1">Check back after payment is confirmed.</p>
                  </div>
                )}
            </div>

            {/* Stub Bottom Strip (Exact h-7 to align flush with left bottom bar) */}
            <div className="h-7 px-4 bg-[var(--color-brand)] text-[var(--color-brand-text)] flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold tracking-wider">
              <QrCode className="w-3 h-3 shrink-0" />
              <span>{qrValue ? "SCAN AT ENTRY" : "QR UNAVAILABLE"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Outside Below Ticket */}
      {showActions && (
        <div className={`mt-4 pt-4 border-t border-[var(--color-hairline)]/50 grid grid-cols-1 gap-2.5 ${adminActions ? "sm:grid-cols-2 lg:grid-cols-4" : ""}`}>
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
                <Check className="w-4 h-4" /> {markWaSentLoading ? "Marking..." : waSent ? "WA Sent" : "Mark WA Sent"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
