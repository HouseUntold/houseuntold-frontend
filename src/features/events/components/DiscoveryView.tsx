import { motion } from "motion/react";
import React, { useMemo } from "react";
import { Button } from "../../../components/ui/Button";
import { STAGGER_CONTAINER } from "../../../lib/motion/variants";
import { useEvents } from "../hooks/useEvents";
import { EventCard } from "./EventCard";

interface DiscoveryViewProps {
  onSelectEvent: (eventId: string) => void;
  onSelectSeats: (eventId: string) => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  onSelectEvent,
}) => {
  const { data: events = [], isLoading, isError, refetch } = useEvents();

  const visibleEvents = useMemo(() => {
    return events.filter((evt) => evt.status !== "DRAFT" && evt.status !== "PAUSED");
  }, [events]);

  return (
    <div className="max-w-[1280px] mx-auto px-5 sm:px-10 pt-8 sm:pt-12 pb-16 space-y-8 bg-[#360D19] text-[#F1DAA5]">
      {/* Clean Patron Events Catalog Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#875931]/40">
        <div>
          <p className="text-[12px] font-medium tracking-[0.06em] uppercase text-[#CFB790]">
            Season 2026 · Curated Live Lineup
          </p>
          <h1 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#F1DAA5] mt-1">
            Upcoming Events
          </h1>
          <p className="text-[14px] text-[#CFB790] mt-1">
            Select any show to view event details and book exact floor seats.
          </p>
        </div>
      </section>

      {isLoading
        ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-[410px] rounded-[14px] bg-[#5B342E]/50 border border-[#875931]/40 animate-pulse"
              />
            ))}
          </div>
        )
        : isError
        ? (
          <div className="rounded-[14px] bg-[#5B342E]/65 border border-[#875931]/50 p-8 text-center space-y-3">
            <p className="text-[15px] text-[#F1DAA5] font-medium">
              Could not load upcoming events.
            </p>
            <Button
              variant="secondary"
              onClick={() => refetch()}
              className="!bg-[#360D19] !text-[#F1DAA5] !border-[#875931] hover:!bg-[#875931]"
            >
              Retry
            </Button>
          </div>
        )
        : visibleEvents.length === 0
        ? (
          <div className="rounded-[14px] bg-[#5B342E]/65 border border-[#875931]/50 p-10 text-center space-y-3">
            <p className="text-[16px] font-medium text-[#F1DAA5]">
              No upcoming shows are available right now.
            </p>
          </div>
        )
        : (
          <motion.div
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="show"
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${visibleEvents.length === 4 ? "" : "lg:grid-cols-3"}`}
          >
            {visibleEvents.map((evt, idx) => {
              const isDisabled = idx >= visibleEvents.length - 2;
              return (
                <EventCard
                  key={evt.id}
                  event={evt}
                  disabled={isDisabled}
                  onSelect={onSelectEvent}
                />
              );
            })}
          </motion.div>
        )}
    </div>
  );
};
