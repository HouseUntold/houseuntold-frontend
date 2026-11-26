import { ArrowRight, Calendar, Clock, MapPin, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import React from "react";
import { TierBadge } from "../../../components/ui/TierBadge";
import type { VenuEvent } from "../../../lib/api/types";
import { formatINR } from "../../../lib/domain/rules";
import { SPRING_SPATIAL, STAGGER_ITEM } from "../../../lib/motion/variants";

interface EventCardProps {
  event: VenuEvent;
  onSelect: (eventId: string) => void;
  disabled?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelect,
  disabled = false,
}) => {
  const occupancyPct = Math.min(
    100,
    Math.round((event.bookedSeats / Math.max(1, event.totalSeats)) * 100),
  );
  const seatsLeft = Math.max(0, event.totalSeats - event.bookedSeats);

  return (
    <motion.article
      variants={STAGGER_ITEM}
      layoutId={`event-card-${event.id}`}
      transition={SPRING_SPATIAL}
      aria-disabled={disabled}
      className={`group rounded-[14px] overflow-hidden flex flex-col transition-all duration-300 ${
        disabled
          ? "bg-[#260811]/85 border border-[#875931]/25 shadow-none opacity-75 pointer-events-none select-none cursor-not-allowed"
          : "bg-[#5B342E]/65 border border-[#875931]/50 shadow-card hover:shadow-editorial hover:border-[#875931]"
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) onSelect(event.id);
        }}
        className={`text-left flex-1 flex flex-col focus-visible:outline-2 focus-visible:outline-[#F1DAA5] ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <motion.div
          layoutId={`event-image-${event.id}`}
          transition={SPRING_SPATIAL}
          className="relative aspect-[16/10] w-full bg-[#350D19] overflow-hidden"
        >
          <img
            src={event.imageUrl}
            alt={event.title}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-transform duration-500 ${
              disabled
                ? "grayscale-[55%] brightness-75"
                : "group-hover:scale-[1.03]"
            }`}
          />
          <div
            className={`absolute inset-0 ${
              disabled
                ? "bg-gradient-to-t from-[#260811]/90 via-[#260811]/45 to-[#260811]/25"
                : "bg-gradient-to-t from-[#360D19]/75 via-[#350D19]/15 to-transparent"
            }`}
          />

          {/* Crisp Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span
              className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold tracking-wide uppercase backdrop-blur-xs ${
                disabled
                  ? "bg-[#260811]/90 border border-[#875931]/25 text-[#CFB790]/55"
                  : "bg-[#360D19]/90 border border-[#875931]/50 text-[#F1DAA5]"
              }`}
            >
              {event.layoutType === "CLUB" ? "Club Floor" : "Seated Hall"}
            </span>

            {disabled
              ? (
                <span className="num px-2.5 py-1 rounded-[6px] bg-[#360D19]/90 border border-[#875931]/40 text-[#CFB790]/75 text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#CFB790]/65" strokeWidth={1.75} />
                  <span>Upcoming Soon</span>
                </span>
              )
              : (
                <span className="num px-2.5 py-1 rounded-[6px] bg-[#143D2B]/95 border border-[#2E7D5B]/70 backdrop-blur-xs text-[#A7F3D0] text-[11px] font-semibold uppercase tracking-wide">
                  TICKETS AVAILABLE
                </span>
              )}
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <span
              className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium ${
                disabled
                  ? "bg-[#260811]/90 border border-[#875931]/25 text-[#CFB790]/60"
                  : "bg-[#360D19]/90 border border-[#875931]/40 text-[#F1DAA5]"
              }`}
            >
              {event.category}
            </span>
            {/* {!disabled && event.fnbCreditPerVip > 0 && (
              <span className="num inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#F1DAA5] text-[#360D19] text-[11px] font-semibold">
                <Sparkles className="w-3 h-3" strokeWidth={1.75} />
                {formatINR(event.fnbCreditPerVip)} Bar Credit
              </span>
            )} */}
          </div>
        </motion.div>

        <div className="p-6 flex-1 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <motion.h3
              layoutId={`event-title-${event.id}`}
              transition={SPRING_SPATIAL}
              className={`text-[19px] font-semibold leading-[1.3] transition-colors ${
                disabled
                  ? "text-[#F1DAA5]/55"
                  : "text-[#F1DAA5] group-hover:text-[#CFB790]"
              }`}
            >
              {event.title}
            </motion.h3>

            <p
              className={`text-[13px] line-clamp-2 leading-relaxed ${
                disabled ? "text-[#CFB790]/45" : "text-[#CFB790]"
              }`}
            >
              {event.subtitle}
            </p>

            <div
              className={`space-y-1.5 text-[13px] ${disabled ? "text-[#CFB790]/45" : "text-[#CFB790]"}`}
            >
              <div className="flex items-center gap-2">
                <Calendar
                  className={`w-4 h-4 shrink-0 ${disabled ? "text-[#CFB790]/45" : "text-[#F1DAA5]"}`}
                  strokeWidth={1.75}
                />
                <span className="num text-[12.5px]">
                  {event.dateLabel} · {event.timeLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin
                  className={`w-4 h-4 shrink-0 ${disabled ? "text-[#CFB790]/45" : "text-[#F1DAA5]"}`}
                  strokeWidth={1.75}
                />
                <span>
                  {event.venueName}, {event.venueCity}
                </span>
              </div>
            </div>

            <div
              className={`flex flex-wrap items-center gap-1.5 pt-0.5 ${disabled ? "opacity-50" : ""}`}
            >
              {event.sections.map((section) => (
                <TierBadge
                  key={section.id}
                  tier={section.tier}
                  label={section.name}
                  isAlcoholic={section.isAlcoholic}
                />
              ))}
            </div>
          </div>

          <div
            className={`space-y-3 pt-4 border-t ${disabled ? "border-[#875931]/25" : "border-[#875931]/40"}`}
          >
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <span
                  className={`block text-[11px] font-medium uppercase tracking-wider ${
                    disabled ? "text-[#CFB790]/40" : "text-[#CFB790]"
                  }`}
                >
                  From
                </span>
                <span
                  className={`num text-[18px] font-semibold ${disabled ? "text-[#F1DAA5]/50" : "text-[#F1DAA5]"}`}
                >
                  {formatINR(event.startingPrice)}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold transition-all ${
                  disabled
                    ? "bg-[#260811] border border-[#875931]/25 text-[#CFB790]/50"
                    : "bg-[#360D19] border border-[#875931]/60 text-[#F1DAA5] group-hover:bg-[#F1DAA5] group-hover:text-[#360D19] group-hover:border-[#F1DAA5]"
                }`}
              >
                <span>{disabled ? "Upcoming Soon" : "Select Seats"}</span>
                {!disabled && <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />}
              </span>
            </div>
          </div>
        </div>
      </button>
    </motion.article>
  );
};
