import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  Clock,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
  Train,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { TierBadge, ZoneComplianceMarker } from "../../../components/ui/TierBadge";
import { formatINR } from "../../../lib/domain/rules";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";
import { useEventDetail } from "../hooks/useEvents";

interface EventDetailViewProps {
  eventId: string;
  onBack: () => void;
  onSelectSeats: (eventId: string) => void;
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  eventId,
  onBack,
  onSelectSeats,
  onNotify,
}) => {
  const { data: event, isLoading } = useEventDetail(eventId);
  const [saved, setSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (isLoading || !event) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-10 bg-[#360D19]">
        <div className="h-[420px] rounded-[14px] bg-[#5B342E]/50 border border-[#875931]/40 animate-pulse" />
      </div>
    );
  }

  const renderExpandedBreakdown = (section: (typeof event.sections)[number]) => {
    const isTable = section.tier === "TABLE"
      || section.name.toLowerCase().includes("table");
    const isCouple = section.tier === "COUPLE"
      || section.name.toLowerCase().includes("couple");
    const isStag = section.tier === "STAG"
      || section.name.toLowerCase().includes("stag");

    if (isTable) {
      return (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 p-3.5 rounded-[10px] bg-[#360D19]/85 border border-[#875931]/45 space-y-3 text-[12.5px]"
        >
          <div>
            <div className="font-semibold text-[#F1DAA5] uppercase tracking-wider text-[11px] mb-1.5">
              Table of 5
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category A</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(14999)}
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category B</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(18999)}
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category C</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(21999)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-[#F1DAA5] uppercase tracking-wider text-[11px] mb-1.5">
              Table of 8
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category A</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(19999)}
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category B</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(22999)}
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category C</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(24999)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-[#F1DAA5] uppercase tracking-wider text-[11px] mb-1.5">
              Table of 10
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category A</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(24999)}
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category B</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(27999)}
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category C</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(29999)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-[#F1DAA5] uppercase tracking-wider text-[11px] mb-1.5">
              Table of 15
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category A</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(31999)}
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category B</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(32999)}
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-[8px] bg-[#5B342E]/60 border border-[#875931]/35">
                <div className="text-[#CFB790] text-[11px]">Category C</div>
                <div className="num font-semibold text-[#F1DAA5] mt-0.5">
                  {formatINR(34999)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#875931]/35 text-[#F1DAA5] font-medium">
            <Wallet className="w-3.5 h-3.5 text-[#CFB790] shrink-0" strokeWidth={1.75} />
            <span>Entire amount is converted into wallet amount.</span>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => onSelectSeats(event.id)}
            className="w-full !bg-[#F1DAA5] !text-[#360D19] hover:!bg-[#CFB790] mt-1"
          >
            <span>Select Table</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
          </Button>
        </div>
      );
    }

    if (isCouple) {
      return (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 p-3.5 rounded-[10px] bg-[#360D19]/85 border border-[#875931]/45 space-y-2 text-[12.5px]"
        >
          <div className="flex items-center justify-between text-[#CFB790]">
            <span>Couple Entry Price</span>
            <span className="num font-semibold text-[#F1DAA5]">{formatINR(3299)}</span>
          </div>
          <div className="flex items-center justify-between text-[#CFB790]">
            <span>Wallet Balance Included</span>
            <span className="num font-semibold text-[#F1DAA5]">{formatINR(3000)}</span>
          </div>
        </div>
      );
    }

    if (isStag) {
      return (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 p-3.5 rounded-[10px] bg-[#360D19]/85 border border-[#875931]/45 space-y-2.5 text-[12.5px]"
        >
          {/* Special Offer Highlight */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-[#143D2B]/80 border border-[#2E7D5B]/60 text-[12.5px] text-[#A7F3D0]">
            <Users className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span className="font-medium">First 100 females entry free</span>
          </div>
          <div className="p-2.5 rounded-[8px] bg-[#5B342E]/55 border border-[#875931]/35 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#F1DAA5]">Male</span>
              <span className="num font-semibold text-[#F1DAA5]">{formatINR(1999)}</span>
            </div>
            <div className="text-[#CFB790] text-[12px]">Full cover wallet balance</div>
          </div>

          <div className="p-2.5 rounded-[8px] bg-[#5B342E]/55 border border-[#875931]/35 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#F1DAA5]">Female</span>
              <span className="num font-semibold text-[#F1DAA5]">{formatINR(999)}</span>
            </div>
            <div className="text-[#CFB790] text-[12px]">
              Full cover wallet balance + 1 tequila shot free
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-3 p-3.5 rounded-[10px] bg-[#360D19]/85 border border-[#875931]/45 space-y-1.5 text-[12.5px] text-[#CFB790]"
      >
        <div>
          Tier Price:{" "}
          <span className="num font-semibold text-[#F1DAA5]">
            {typeof section.price === "number" ? formatINR(section.price) : section.price}
          </span>
        </div>
        {section.fnbCredit && (
          <div>
            Bar / Wallet Credit:{" "}
            <span className="num font-semibold text-[#F1DAA5]">
              {typeof section.fnbCredit === "number"
                ? formatINR(section.fnbCredit)
                : section.fnbCredit}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1280px] mx-auto px-5 sm:px-10 pt-6 pb-16 bg-[#360D19] text-[#F1DAA5]">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between gap-4 pb-6">
        <div className="flex items-center gap-3 text-[13px] text-[#CFB790] min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#5B342E]/75 border border-[#875931]/50 text-[#F1DAA5] font-medium hover:bg-[#5B342E] hover:border-[#875931] cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            <span>Back</span>
          </button>
          <span className="hidden sm:inline truncate">
            Events / {event.category} / <span className="text-[#F1DAA5]">{event.title}</span>
          </span>
        </div>
      </div>

      {/* Two-Column Split: 7-col primary + 5-col sticky pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          <motion.div
            layoutId={`event-card-${event.id}`}
            transition={SPRING_SPATIAL}
            className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 overflow-hidden shadow-card"
          >
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#CFB790]">
                <span className="font-semibold text-[#F1DAA5]">{event.category}</span>
                <span aria-hidden="true">·</span>
                <span>{event.venueName}</span>
                <span aria-hidden="true">·</span>
                <span className="num">{event.doorsOpenLabel}</span>
              </div>

              <motion.h1
                layoutId={`event-title-${event.id}`}
                transition={SPRING_SPATIAL}
                className="text-[28px] sm:text-[34px] font-bold leading-[1.15] text-[#F1DAA5]"
              >
                {event.title}
              </motion.h1>

              <p className="text-[16px] leading-[1.6] text-[#CFB790]">{event.subtitle}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#875931]/40">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <Calendar className="w-4 h-4 text-[#F1DAA5]" strokeWidth={1.75} />
                  <span className="num font-medium text-[#F1DAA5]">{event.dateLabel}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px]">
                  <Clock className="w-4 h-4 text-[#F1DAA5]" strokeWidth={1.75} />
                  <span className="num font-medium text-[#F1DAA5]">{event.timeLabel}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px]">
                  <MapPin className="w-4 h-4 text-[#F1DAA5]" strokeWidth={1.75} />
                  <span className="font-medium text-[#F1DAA5]">{event.venueCity}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* About the Experience */}
          <section className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 sm:p-8 space-y-5">
            <h2 className="text-[22px] font-semibold text-[#F1DAA5]">About the Experience</h2>
            <div className="space-y-4 text-[15px] leading-[1.7] text-[#CFB790]">
              {event.aboutParagraphs.map((para, idx) => <p key={idx}>{para}</p>)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {event.highlights.map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-[10px] bg-[#360D19]/75 border border-[#875931]/40"
                >
                  <div className="flex items-center gap-2 text-[14px] font-semibold text-[#F1DAA5]">
                    <Sparkles className="w-4 h-4 text-[#CFB790]" strokeWidth={1.75} />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[13px] text-[#CFB790] mt-1">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Artists & Performers */}
          <section className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 sm:p-8 space-y-5">
            <h2 className="text-[22px] font-semibold text-[#F1DAA5]">Artists &amp; Performers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {event.artists.map((artist) => (
                <div
                  key={artist.name}
                  className="p-4 rounded-[10px] bg-[#360D19]/75 border border-[#875931]/40 space-y-1.5"
                >
                  <div className="text-[15px] font-semibold text-[#F1DAA5]">{artist.name}</div>
                  <div className="text-[12px] font-medium text-[#CFB790]">{artist.role}</div>
                  <p className="text-[13px] text-[#CFB790]/90 leading-relaxed pt-1">
                    {artist.bio}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Venue & Arrival Info */}
          <section className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 sm:p-8 space-y-4">
            <h2 className="text-[22px] font-semibold text-[#F1DAA5]">Venue &amp; Arrival Info</h2>
            <div className="space-y-3 text-[14px]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#F1DAA5] mt-1 shrink-0" strokeWidth={1.75} />
                <div>
                  <div className="font-medium text-[#F1DAA5]">{event.venueName}</div>
                  <div className="text-[#CFB790]">{event.venueAddress}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Train className="w-4 h-4 text-[#A7F3D0] mt-1 shrink-0" strokeWidth={1.75} />
                <div className="text-[#CFB790]">{event.transitNote}</div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#F1DAA5] mt-1 shrink-0" strokeWidth={1.75} />
                <div className="text-[#CFB790]">
                  Valid government photo ID required.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Right Pricing & Primary CTA Rail */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="bg-[#5B342E]/75 rounded-[14px] border border-[#875931]/50 shadow-card p-6 sm:p-7 space-y-6">
            <div>
              <div className="text-[12px] font-medium text-[#CFB790] uppercase tracking-wider">
                Ticket Tiers
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num text-[28px] font-semibold text-[#F1DAA5]">
                  {formatINR(event.startingPrice)}
                </span>
                <span className="text-[14px] text-[#CFB790]">to</span>
                <span className="num text-[22px] font-medium text-[#F1DAA5]">
                  {formatINR(event.maxPrice)}
                </span>
              </div>
              <p className="text-[13px] text-[#CFB790] mt-1">
                <span className="num font-medium text-[#F1DAA5]">
                  {Math.max(0, event.totalSeats - event.bookedSeats)}
                </span>{" "}
                seats remaining across {event.sections.length} zones
              </p>
            </div>

            <div className="divide-y divide-[#875931]/40 border-y border-[#875931]/40">
              {event.sections.map((section) => {
                const isExpanded = !!expandedSections[section.id];
                return (
                  <div key={section.id} className="py-4">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isExpanded}
                      className="w-full text-left space-y-1.5 cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#F1DAA5] rounded-[6px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TierBadge tier={section.tier} label={section.name} />
                          <ChevronDown
                            className={`w-4 h-4 text-[#CFB790] group-hover:text-[#F1DAA5] transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-[#F1DAA5]" : ""
                            }`}
                            strokeWidth={1.75}
                          />
                        </div>
                        <span className="num text-[16px] font-semibold text-[#F1DAA5]">
                          {typeof section.price === "number"
                            ? formatINR(section.price)
                            : section.price}
                        </span>
                      </div>

                      <p className="text-[13px] text-[#CFB790]">{section.description}</p>

                      <div className="flex items-center justify-between pt-0.5">
                        <ZoneComplianceMarker
                          isAlcoholic={section.isAlcoholic}
                          minAge={section.minAge}
                        />
                        {section.fnbCredit && (
                          <span className="num text-[12px] font-medium text-[#F1DAA5]">
                            {typeof section.fnbCredit === "number"
                              ? section.fnbCredit > 0
                                && `+${formatINR(section.fnbCredit)} F&B credit`
                              : `${section.fnbCredit} F&B credit`}
                          </span>
                        )}
                      </div>
                    </button>

                    {isExpanded && renderExpandedBreakdown(section)}
                  </div>
                );
              })}
            </div>

            {/* ONE Primary CTA */}
            <Button
              variant="primary"
              size="lg"
              className="w-full !bg-[#F1DAA5] !text-[#360D19] hover:!bg-[#CFB790]"
              onClick={() => onSelectSeats(event.id)}
            >
              <span>Select Seats &amp; Book</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href).catch(() => {});
                  }
                  onNotify("Event link copied to clipboard.", "info");
                }}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#CFB790] hover:text-[#F1DAA5] cursor-pointer active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" strokeWidth={1.75} />
                <span>Share event</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaved((prev) => !prev);
                  onNotify(saved ? "Removed from saved" : "Saved to your shortlist", "info");
                }}
                className="text-[13px] font-medium text-[#CFB790] hover:text-[#F1DAA5] cursor-pointer active:scale-95 transition-all"
              >
                {saved ? "Saved ✓" : "Save for later"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
