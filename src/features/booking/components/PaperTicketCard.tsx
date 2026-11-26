import { Calendar, CheckCircle2, KeyRound, MapPin, QrCode, Scissors, Users } from "lucide-react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import React from "react";
import { Button } from "../../../components/ui/Button";
import { TierBadge } from "../../../components/ui/TierBadge";
import type { Ticket } from "../../../lib/api/types";
import { isTicketExpired } from "../../../lib/domain/rules";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";

interface PaperTicketCardProps {
  ticket: Ticket;
  onShowQr?: (ticket: Ticket) => void;
  actionLabel?: string;
  onAction?: (ticket: Ticket) => void;
  actionLoading?: boolean;
}

const TIER_STRIPE_COLOR: Record<Ticket["tier"], string> = {
  VIP: "#B45309",
  COUPLE: "#E11D63",
  GENERAL: "#0F766E",
  STAG: "#0284C7",
  TABLE: "#7C3AED",
};

interface MandalaTheme {
  imageUrl: string;
  tiled: boolean;
  tintClass: string;
}

function getMandalaTheme(ticket: Ticket): MandalaTheme {
  if (ticket.tier === "VIP") {
    return {
      imageUrl: "/assets/aistudio/Image_result_for_Fractal_Mandala_Rainbow_0611b49b.jpeg",
      tiled: false,
      tintClass: "from-[#FEF3C7]/45 via-white/80 to-white/92",
    };
  }
  if (ticket.tier === "COUPLE") {
    return {
      imageUrl: "/assets/aistudio/100_Vector_Mandala_Ornaments__a_Decorative_Illustration_by_pixaroma_7a44f312.jpeg",
      tiled: true,
      tintClass: "from-[#FCE7F0]/55 via-white/84 to-white/92",
    };
  }
  if (ticket.category === "Live Music" || ticket.category === "Theater & Plays") {
    return {
      imageUrl: "/assets/aistudio/59__Green_Gifts_on_Zazzle_edc9863a.jpeg",
      tiled: false,
      tintClass: "from-[#CCFBF1]/45 via-white/82 to-white/92",
    };
  }
  return {
    imageUrl: "/assets/aistudio/Black_and_White_Mandala_Postcard___Zazzle_85e5b80d.jpeg",
    tiled: false,
    tintClass: "from-[#E0E7FF]/40 via-white/84 to-white/92",
  };
}

/**
 * Architectural two-part perforated paper ticket with category-tinted mandala watermark.
 * - Never displays F&B wallet amount on the card face (revealed only when opened).
 * - Never prints "Stag" anywhere on the pass.
 * - When `ticket.checkedIn` is true, keeps the full left body intact and trims away
 *   ONLY the right QR stub past the perforated cut point, leaving a serrated tear edge.
 */
export const PaperTicketCard: React.FC<PaperTicketCardProps> = ({
  ticket,
  onShowQr,
  actionLabel,
  onAction,
  actionLoading,
}) => {
  const seatCount = ticket.seatLabels.length;
  const stripeColor = TIER_STRIPE_COLOR[ticket.tier];
  const expired = isTicketExpired(ticket);
  const mandala = getMandalaTheme(ticket);
  const checkedTime = ticket.checkedInAt
    ? new Date(ticket.checkedInAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "At Door";

  const mandalaBackdrop = (
    <>
      {mandala.tiled
        ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-[0.075] mix-blend-multiply"
            style={{
              backgroundImage: `url('${mandala.imageUrl}')`,
              backgroundSize: "200px auto",
              backgroundRepeat: "repeat",
              backgroundPosition: "center",
            }}
          />
        )
        : (
          <img
            src={mandala.imageUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-[0.085] mix-blend-multiply"
          />
        )}
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${mandala.tintClass}`}
      />
    </>
  );

  const mainBodyContent = (
    <div className="relative z-10 flex flex-col justify-between gap-5 h-full">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-dashed border-[#E7E5E0]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="num text-[11px] font-semibold uppercase tracking-widest text-[#0F1419]">
              {ticket.code}
            </span>
            <span className="num inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-white/90 border border-[#E7E5E0] text-[11px] font-semibold text-[#2D2A6E]">
              <KeyRound className="w-3 h-3" strokeWidth={1.75} />
              {ticket.barCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {ticket.checkedIn
              ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-[#0F766E]/35 bg-[#CCFBF1]/70 text-[#0F766E] num text-[11px] font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Admitted · {checkedTime}</span>
                </span>
              )
              : expired
              ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#DC2626]/30 bg-[#FEE2E2]/80 text-[#DC2626] num text-[11px] font-semibold uppercase tracking-wider">
                  Expired
                </span>
              )
              : null}
            <TierBadge tier={ticket.tier} label={ticket.sectionName} />
          </div>
        </div>

        <div>
          <h2 className="text-[20px] sm:text-[21px] font-semibold leading-snug text-[#0F1419]">
            {ticket.eventTitle}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-[#5C6570]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0 text-[#2D2A6E]" strokeWidth={1.75} />
              <span className="num font-medium text-[#0F1419]">{ticket.dateLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0 text-[#2D2A6E]" strokeWidth={1.75} />
              <span>
                {ticket.venueName} · {ticket.gate}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-dashed border-[#E7E5E0] grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#5C6570]">
            Guests Admitted
          </div>
          <div className="num text-[14px] font-semibold text-[#0F1419] mt-0.5">
            {seatCount} {seatCount === 1 ? "Person" : "People"}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#5C6570]">Seats</div>
          <div className="num text-[14px] font-semibold text-[#0F1419] mt-0.5">
            {ticket.seatLabels.join(", ")}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#5C6570] inline-flex items-center gap-1">
            <Users className="w-3 h-3" strokeWidth={1.75} />
            <span>Guest Names</span>
          </div>
          <div className="text-[13px] font-medium text-[#0F1419] mt-0.5 truncate">
            {ticket.attendees.map((a) => a.fullName).join(", ")}
          </div>
        </div>
      </div>
    </div>
  );

  // Scanned State: Keep FULL left body intact and trim ONLY the right QR stub past the cut point
  if (ticket.checkedIn) {
    return (
      <motion.article
        layout
        layoutId={`ticket-card-${ticket.id}`}
        transition={SPRING_SPATIAL}
        className="w-full flex items-stretch drop-shadow-[0_8px_20px_rgba(15,20,25,0.06)]"
      >
        {onShowQr
          ? (
            <button
              type="button"
              onClick={() => onShowQr(ticket)}
              aria-label={`Open pass details and F&B wallet for ${ticket.eventTitle}`}
              className="flex-1 text-left bg-white rounded-l-[16px] border-y border-l border-[#E7E5E0] p-6 relative overflow-hidden cursor-pointer hover:brightness-[0.99] focus-visible:outline-2 focus-visible:outline-[#2D2A6E] transition-all"
              style={{ borderLeftWidth: "4px", borderLeftColor: stripeColor }}
            >
              {mandalaBackdrop}
              {mainBodyContent}
            </button>
          )
          : (
            <div
              className="flex-1 bg-white rounded-l-[16px] border-y border-l border-[#E7E5E0] p-6 relative overflow-hidden"
              style={{ borderLeftWidth: "4px", borderLeftColor: stripeColor }}
            >
              {mandalaBackdrop}
              {mainBodyContent}
            </div>
          )}

        {/* Realistic Serrated Jagged Torn Paper Right Edge (QR Stub Removed at Cut Point) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 18 200"
          preserveAspectRatio="none"
          className="w-[16px] shrink-0 block"
        >
          <polygon
            points="0,0 14,10 2,20 15,30 3,40 13,50 1,60 16,70 4,80 14,90 2,100 15,110 3,120 14,130 1,140 16,150 4,160 13,170 2,180 14,190 0,200"
            fill="#FFFFFF"
          />
          <polyline
            points="0,0 14,10 2,20 15,30 3,40 13,50 1,60 16,70 4,80 14,90 2,100 15,110 3,120 14,130 1,140 16,150 4,160 13,170 2,180 14,190 0,200"
            fill="none"
            stroke="#D6D3CC"
            strokeWidth="1.25"
          />
        </svg>
      </motion.article>
    );
  }

  // Intact Two-Part Perforated Physical Ticket
  return (
    <motion.article
      layout
      layoutId={`ticket-card-${ticket.id}`}
      transition={SPRING_SPATIAL}
      className="bg-white rounded-[16px] border border-[#E7E5E0] shadow-editorial overflow-hidden flex flex-col sm:flex-row relative"
      style={{ borderLeftWidth: "4px", borderLeftColor: stripeColor }}
    >
      {/* Left Main Body (Clickable to open Wallet & QR Modal) */}
      {onShowQr
        ? (
          <button
            type="button"
            onClick={() => onShowQr(ticket)}
            aria-label={`Open pass details and F&B wallet for ${ticket.eventTitle}`}
            className="flex-1 text-left p-6 relative overflow-hidden cursor-pointer hover:brightness-[0.99] focus-visible:outline-2 focus-visible:outline-[#2D2A6E] transition-all"
          >
            {mandalaBackdrop}
            {mainBodyContent}
          </button>
        )
        : (
          <div className="flex-1 p-6 relative overflow-hidden">
            {mandalaBackdrop}
            {mainBodyContent}
          </div>
        )}

      {/* Perforated Seam + Die-Cut Notches */}
      <div className="relative hidden sm:flex flex-col items-center justify-between py-2 bg-white z-10">
        <div className="w-5 h-5 rounded-full bg-[#FAFAF7] border border-[#E7E5E0] -mt-4.5" />
        <div className="flex-1 border-l-2 border-dashed border-[#D6D3CC] my-1 relative flex items-center justify-center">
          <span className="bg-white p-1 rounded-full text-[#5C6570]/60">
            <Scissors className="w-3 h-3 rotate-90" strokeWidth={1.75} />
          </span>
        </div>
        <div className="w-5 h-5 rounded-full bg-[#FAFAF7] border border-[#E7E5E0] -mb-4.5" />
      </div>

      {/* Horizontal Perforation on Small Viewports */}
      <div className="sm:hidden border-t-2 border-dashed border-[#D6D3CC] mx-4" />

      {/* Right Detachable Gate QR Stub */}
      <div className="sm:w-[214px] shrink-0 bg-[#FAFAF7]/90 p-5 flex flex-row sm:flex-col items-center justify-between gap-3 text-center relative z-10">
        <div className="num text-[10px] font-semibold tracking-widest uppercase text-[#5C6570]">
          Admit {seatCount} · Tear at Gate
        </div>

        <div className="p-2 rounded-[10px] bg-white border border-[#E7E5E0]">
          <QRCodeSVG value={ticket.qrToken} size={86} bgColor="#FFFFFF" fgColor="#0F1419" />
        </div>

        <div className="w-full space-y-2">
          <div className="num text-[11px] font-medium text-[#0F1419]">{ticket.code}</div>
          {onAction && actionLabel
            ? (
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                isLoading={actionLoading}
                onClick={() => onAction(ticket)}
              >
                {actionLabel}
              </Button>
            )
            : onShowQr
            ? (
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => onShowQr(ticket)}
              >
                <QrCode className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Open Pass</span>
              </Button>
            )
            : null}
        </div>
      </div>
    </motion.article>
  );
};
