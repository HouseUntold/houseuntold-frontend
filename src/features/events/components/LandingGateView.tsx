import { ArrowRight, Building2, MapPin, ShieldCheck, Sparkles, Ticket as TicketIcon, Wallet } from "lucide-react";
import { motion } from "motion/react";
import React from "react";
import partyBgImage from "../../../assets/images/houseuntold_party.png";
import { Button } from "../../../components/ui/Button";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";

interface LandingGateViewProps {
  onBookNow: () => void;
}

const INSTAGRAM_URL = "https://instagram.com/house.untold";

const CURATED_VENUES = [
  {
    name: "31st with House Untold",
    city: "Ravet, Pune",
    layout: "Hotel Sky Blue",
    capacity: "574 Seats",
    note:
      "An electrifying party venue featuring live DJ beats, energetic music, and a vibrant dance floor for an unforgettable New Year’s Eve celebration.",
  },
];

export const LandingGateView: React.FC<LandingGateViewProps> = ({ onBookNow }) => {
  return (
    <div className="max-w-[1280px] mx-auto px-5 sm:px-10 pt-10 sm:pt-16 pb-20 space-y-14 bg-[#360D19] text-[#F1DAA5]">
      {/* Full-Width Hero Section with Maroon Gradient & Party Background */}
      <section className="relative overflow-hidden rounded-[24px] border border-[#875931]/50 bg-[#350D19] p-8 sm:p-14 lg:p-16 shadow-editorial">
        {/* Background Party Image */}
        <img
          src={partyBgImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-30 pointer-events-none"
        />

        {/* Maroon Gradient Overlay for Crisp Yellow Text Readability */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#360D19]/95 via-[#350D19]/80 to-[#5B342E]/45 pointer-events-none"
        />

        {/* Foreground Full-Width Content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_SPATIAL}
          className="relative z-10 max-w-3xl space-y-6"
        >
          <p className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[#CFB790]">
            Curated Parties &amp; Events · HouseUntold
          </p>
          <h1 className="text-[40px] sm:text-[56px] lg:text-[62px] font-bold leading-[1.05] tracking-[-0.03em] text-[#F1DAA5] text-balance">
            Big energy, unforgettable nights — without breaking the bank.
          </h1>
          <p className="text-[17px] sm:text-[18px] leading-[1.65] text-[#F1DAA5]/90 max-w-2xl">
            Hi! I’m Yash, founder of{" "}
            <span className="font-semibold text-[#F1DAA5]">HouseUntold</span>. I host vibrant, budget-friendly parties
            and events crafted to bring great people together. Check out our Instagram below to catch the vibe and see
            what’s coming up next.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#F1DAA5] px-6 py-3.5 text-[15px] font-semibold text-[#360D19] shadow-sm transition-all hover:bg-[#CFB790] active:scale-[0.99]"
            >
              <span>Follow HouseUntold on Instagram</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </a>

            <Button
              variant="secondary"
              size="lg"
              onClick={onBookNow}
              className="!bg-[#5B342E] !text-[#F1DAA5] !border-[#875931] hover:!bg-[#875931] hover:!text-[#F1DAA5]"
            >
              <span>Book Now</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Latest Event */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#F1DAA5] mt-1">
              Latest Event
            </h2>
          </div>
          <button
            type="button"
            onClick={onBookNow}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#F1DAA5] hover:text-[#CFB790] hover:underline cursor-pointer transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#F1DAA5]" strokeWidth={1.75} />
            <span>Explore upcoming season lineups →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CURATED_VENUES.map((room) => (
            <div
              key={room.name}
              className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 space-y-4 flex flex-col justify-between shadow-card"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Building2 className="w-5 h-5 text-[#F1DAA5]" strokeWidth={1.75} />
                  <span className="num text-[12px] font-medium text-[#CFB790]">
                    {room.capacity}
                  </span>
                </div>
                <h3 className="text-[18px] font-semibold text-[#F1DAA5]">{room.name}</h3>
                <div className="text-[12.5px] font-medium text-[#CFB790]">{room.layout}</div>
                <p className="text-[13px] text-[#F1DAA5]/85 leading-relaxed">{room.note}</p>
              </div>
              <div className="pt-3 border-t border-[#875931]/40 flex items-center gap-1.5 text-[12px] text-[#CFB790]">
                <MapPin className="w-3.5 h-3.5 text-[#F1DAA5]" strokeWidth={1.75} />
                <span>{room.city}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How House Untold Works — 3 Architectural Steps */}
      <section className="pt-12 border-t border-[#875931]/40 space-y-6">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#CFB790] num">
            From Seat Map to Door
          </p>
          <h2 className="text-[28px] font-semibold text-[#F1DAA5] mt-1">
            Built for calm arrivals and zero bar queues
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="num text-[12px] font-semibold text-[#F1DAA5]">01</span>
              <TicketIcon className="w-5 h-5 text-[#F1DAA5]" strokeWidth={1.75} />
            </div>
            <h3 className="text-[16px] font-semibold text-[#F1DAA5]">Exact Seat Selection</h3>
            <p className="text-[13px] text-[#F1DAA5]/85 leading-relaxed">
              Lock your preferred row, couple booth, or club table atomically for 9 minutes while entering verified
              guest details.
            </p>
          </div>

          <div className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="num text-[12px] font-semibold text-[#F1DAA5]">02</span>
              <Wallet className="w-5 h-5 text-[#F1DAA5]" strokeWidth={1.75} />
            </div>
            <h3 className="text-[16px] font-semibold text-[#F1DAA5]">Private Bar Wallet</h3>
            <p className="text-[13px] text-[#F1DAA5]/85 leading-relaxed">
              Open your digital pass to view your venue Wallet credit balance, validity window, and personal bar code.
            </p>
          </div>

          <div className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="num text-[12px] font-semibold text-[#F1DAA5]">03</span>
              <ShieldCheck className="w-5 h-5 text-[#F1DAA5]" strokeWidth={1.75} />
            </div>
            <h3 className="text-[16px] font-semibold text-[#F1DAA5]">Perforated Gate Pass</h3>
            <p className="text-[13px] text-[#F1DAA5]/85 leading-relaxed">
              Present your signed QR pass at entry. Once verified, only the entry QR stub tears away cleanly.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Book Now Editorial Banner */}
      <section className="bg-[#5B342E] rounded-[16px] border border-[#875931]/60 shadow-editorial p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <h2 className="text-[22px] sm:text-[26px] font-semibold text-[#F1DAA5]">
            Ready for tonight’s lineup?
          </h2>
          <p className="text-[14px] text-[#CFB790]">
            Explore upcoming parties, live concerts, comedy tapings, and acoustic sessions.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onBookNow}
          className="!bg-[#F1DAA5] !text-[#360D19] hover:!bg-[#CFB790]"
        >
          <span>Book Now</span>
          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
        </Button>
      </section>
    </div>
  );
};
