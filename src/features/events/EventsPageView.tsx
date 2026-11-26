import { useEvents } from "@/api/hooks/useEvents";
import comedyImage from "@/assets/images/event_comedy_stage_1795083465583.jpg";
import djImage from "@/assets/images/event_dj_club_1795083466509.jpg";
import qawwaliImage from "@/assets/images/event_qawwali_live_1795083463810.jpg";
import sitarImage from "@/assets/images/event_sitar_concert_1795083609947.jpg";
import { formatCurrencyINR, formatDateTime } from "@/lib/utils";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  Shield,
  Ticket,
  Train,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const DEFAULT_EVENT_IMAGES = [djImage, comedyImage, qawwaliImage, sitarImage];
const EVENTS_PER_PAGE = 6;

export const EventsPageView: React.FC = () => {
  const navigate = useNavigate();
  const { data: events = [], isLoading, isError, refetch } = useEvents();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter events by title, venue, or location
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return events;
    return events.filter((evt) => {
      const titleMatch = evt.title?.toLowerCase().includes(query);
      const descMatch = evt.description?.toLowerCase().includes(query);
      const venueMatch = evt.venue?.name?.toLowerCase().includes(query);
      const locationMatch = evt.location?.toLowerCase().includes(query);
      return titleMatch || descMatch || venueMatch || locationMatch;
    });
  }, [events, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Clamp current page if totalPages shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
    return filteredEvents.slice(startIndex, startIndex + EVENTS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  const startItem = filteredEvents.length === 0 ? 0 : (currentPage - 1) * EVENTS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * EVENTS_PER_PAGE, filteredEvents.length);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build compact page number list with ellipses
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in text-left pb-16">
      {/* Catalog Header & Search Bar */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[var(--color-hairline)]/60">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--color-brand)]">
            <span>Season 2026</span>
            <span className="text-[var(--color-hairline)]">&bull;</span>
            <span className="text-[var(--color-muted)]">Live Events</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
            Upcoming Events
          </h1>
          <p className="text-sm text-[var(--color-muted)] max-w-xl">
            Browse upcoming events, compare ticket options, and reserve your place.
          </p>
        </div>

        {/* Search & Count Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              placeholder="Search events or venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/65 transition-[border-color,box-shadow] duration-150 ease-[var(--ease-out)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/12"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!isLoading && !isError && (
            <div className="px-3.5 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-muted)] whitespace-nowrap text-center num">
              {filteredEvents.length} {filteredEvents.length === 1 ? "Event" : "Events"}
            </div>
          )}
        </div>
      </section>

      {/* Events Grid / States */}
      {isLoading
        ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: EVENTS_PER_PAGE }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl overflow-hidden bg-[var(--color-surface)]/50 border border-[var(--color-hairline)]/40 animate-pulse"
              >
                <div className="aspect-[16/10] bg-[var(--color-canvas)]/70" />
                <div className="p-6 space-y-4">
                  <div className="h-5 w-3/4 rounded bg-[var(--color-hairline)]/40" />
                  <div className="h-3.5 w-full rounded bg-[var(--color-hairline)]/30" />
                  <div className="h-3.5 w-2/3 rounded bg-[var(--color-hairline)]/30" />
                  <div className="pt-4 border-t border-[var(--color-hairline)]/30 flex justify-between items-center">
                    <div className="h-6 w-20 rounded bg-[var(--color-hairline)]/40" />
                    <div className="h-9 w-28 rounded-lg bg-[var(--color-hairline)]/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
        : isError
        ? (
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)] p-10 text-center space-y-4">
            <p className="text-base text-[var(--color-ink)] font-semibold">
              Could not load upcoming events.
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] font-semibold text-sm hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )
        : filteredEvents.length === 0
        ? (
          <div className="rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-hairline)] p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-muted)]">
              <Ticket className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-[var(--color-ink)]">
              {searchQuery
                ? `No events match "${searchQuery}"`
                : "No upcoming events are currently listed."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-brand)] transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        )
        : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedEvents.map((evt, idx) => {
                const globalIdx = (currentPage - 1) * EVENTS_PER_PAGE + idx;
                const cover = evt.coverImage
                  || DEFAULT_EVENT_IMAGES[globalIdx % DEFAULT_EVENT_IMAGES.length];
                const minPrice = evt.ticketTiers?.length
                  ? Math.min(...evt.ticketTiers.map((t) => t.price))
                  : 999;
                const formattedDate = evt.startsAt
                  ? formatDateTime(evt.startsAt)
                  : "Dec 31, 2026";

                return (
                  <article
                    key={evt.id}
                    onClick={() => navigate(`/events/${evt.id}`)}
                    className="group rounded-2xl overflow-hidden flex flex-col bg-[var(--color-surface)] border border-[var(--color-hairline)]/60 shadow-[0_1px_2px_rgba(64,16,33,0.04)] transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(64,16,33,0.1)] hover:border-[var(--color-brand)]/45 cursor-pointer text-left"
                  >
                    {/* Media Area */}
                    <div className="relative aspect-[16/10] w-full bg-[var(--color-canvas)] overflow-hidden">
                      <img
                        src={cover}
                        alt={evt.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)]/90 via-[var(--color-canvas)]/20 to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide uppercase bg-[var(--color-canvas)]/90 border border-[var(--color-hairline)]/60 text-[var(--color-ink)] backdrop-blur-sm">
                          Seated Hall
                        </span>
                        <span className="num px-2.5 py-1 rounded-lg bg-[var(--color-success-bg)]/95 border border-[var(--color-success)]/40 text-[var(--color-success)] text-[11px] font-semibold uppercase tracking-wide">
                          Tickets Available
                        </span>
                      </div>

                      {/* Bottom Category */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--color-canvas)]/90 border border-[var(--color-hairline)]/50 text-[var(--color-ink)] backdrop-blur-sm">
                          Live Music &amp; Club Sessions
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                      <div className="space-y-3">
                        <h3 className="text-lg font-bold leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-brand)] transition-colors">
                          {evt.title}
                        </h3>

                        <p className="text-xs line-clamp-2 leading-relaxed text-[var(--color-muted)]">
                          {evt.description
                            || "Live show with bar credit included in your ticket."}
                        </p>

                        <div className="space-y-1.5 pt-1 text-xs text-[var(--color-muted)]">
                          <div className="flex items-center gap-2">
                            <Calendar
                              className="w-3.5 h-3.5 shrink-0 text-[var(--color-brand)]"
                              strokeWidth={1.75}
                            />
                            <span className="num font-medium">{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin
                              className="w-3.5 h-3.5 shrink-0 text-[var(--color-brand)]"
                              strokeWidth={1.75}
                            />
                            <span className="truncate">
                              {evt.venue?.name || "Hotel Sky Blue"}, {evt.location || "Pune"}
                            </span>
                          </div>
                        </div>

                        {/* Tier Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="px-2 py-0.5 rounded-md border border-[var(--color-brand)]/35 bg-[var(--color-brand)]/10 text-[var(--color-brand)] text-[10px] font-semibold">
                            Table Booking
                          </span>
                          <span className="px-2 py-0.5 rounded-md border border-[#F472B6]/35 bg-[#FCE7F0]/10 text-[#FBCFE8] text-[10px] font-semibold">
                            Couple Entry
                          </span>
                          <span className="px-2 py-0.5 rounded-md border border-[var(--color-success)]/35 bg-[var(--color-success-bg)]/20 text-[var(--color-success)] text-[10px] font-semibold">
                            Single Entry
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-4 border-t border-[var(--color-hairline)]/50 flex items-center justify-between gap-4">
                        <div>
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            Starting From
                          </span>
                          <span className="num text-lg font-bold text-[var(--color-ink)]">
                            {formatCurrencyINR(minPrice)}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)] group-hover:bg-[var(--color-brand)] group-hover:text-[var(--color-brand-text)] group-hover:border-[var(--color-brand)] transition-all">
                          <span>View Tickets</span>
                          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <nav
                aria-label="Events pagination"
                className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--color-hairline)]/60"
              >
                <p className="text-xs text-[var(--color-muted)] num">
                  Showing{" "}
                  <span className="font-semibold text-[var(--color-ink)]">
                    {startItem}&ndash;{endItem}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-[var(--color-ink)]">
                    {filteredEvents.length}
                  </span>{" "}
                  events
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 max-w-full">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-9 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-brand)] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {pageNumbers.map((page, i) =>
                      page === "..."
                        ? (
                          <span
                            key={`ellipsis-${i}`}
                            className="w-8 h-9 flex items-center justify-center text-xs text-[var(--color-muted)]"
                          >
                            &hellip;
                          </span>
                        )
                        : (
                          <button
                            key={page}
                            type="button"
                            onClick={() => handlePageChange(page)}
                            aria-current={currentPage === page ? "page" : undefined}
                            className={`w-9 h-9 rounded-xl text-xs font-bold num transition-colors cursor-pointer ${
                              currentPage === page
                                ? "bg-[var(--color-brand)] text-[var(--color-brand-text)]"
                                : "bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-brand)]/60"
                            }`}
                          >
                            {page}
                          </button>
                        )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-9 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-brand)] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </nav>
            )}
          </div>
        )}
    </div>
  );
};
