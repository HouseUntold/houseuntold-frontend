import { useEvents } from "@/api/hooks/useEvents";
import comedyImage from "@/assets/images/event_comedy_stage_1795083465583.jpg";
import djImage from "@/assets/images/event_dj_club_1795083466509.jpg";
import qawwaliImage from "@/assets/images/event_qawwali_live_1795083463810.jpg";
import sitarImage from "@/assets/images/event_sitar_concert_1795083609947.jpg";
import partyBgImage from "@/assets/images/houseuntold_party.png";
import { formatCurrencyINR, formatDateTime } from "@/lib/utils";
import {
  ArrowRight,
  Calendar,
  Flame,
  GlassWater,
  Instagram,
  MapPin,
  Music,
  Shield,
  ShieldCheck,
  Ticket as TicketIcon,
  Train,
  Wallet,
} from "lucide-react";
import React from "react";
import { Link, useNavigate } from "react-router-dom";

const DEFAULT_EVENT_IMAGES = [djImage, comedyImage, qawwaliImage, sitarImage];
const INSTAGRAM_URL = "https://instagram.com/house.untold";

export const LandingView: React.FC = () => {
  const navigate = useNavigate();
  const { data: events = [], isLoading, isError } = useEvents();

  // Show only 3 events on landing page, rest in /events
  const displayEvents = events.slice(0, 3);
  const featuredEvent = displayEvents[0];

  return (
    <div className="max-w-7xl mx-auto space-y-16 animate-fade-in text-left pb-20">
      {/* 1. Full-Bleed Party Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-hairline)]/60 bg-[var(--color-canvas)] shadow-2xl min-h-[540px] lg:min-h-[600px] flex items-end">
        {/* Background Crowd Image + Atmospheric Gradients */}
        <img
          src={partyBgImage}
          alt="HouseUntold party crowd"
          className="absolute inset-0 h-full w-full object-cover object-center scale-[1.02]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/85 to-[var(--color-canvas)]/30"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)] via-transparent to-[var(--color-canvas)]/40"
        />

        {/* Hero Foreground Content */}
        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-end p-7 sm:p-10 lg:p-14">
          {/* Left Copy Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-hairline)]/70 bg-[var(--color-surface)]/80 px-3.5 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink)]">
                Pune Nightlife &bull; Season 2026
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-extrabold leading-[1.02] tracking-[-0.035em] text-[var(--color-ink)] text-balance">
              Great music. Good company.{" "}
              <span className="text-[var(--color-brand)]">Nights worth staying out for.</span>
            </h1>

            <p className="max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-[var(--color-muted)]">
              HouseUntold hosts live gigs and DJ sets across Pune, with clear ticket prices and no guest-list
              favouritism.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#upcoming-events"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] px-6 py-3.5 text-sm sm:text-[15px] font-semibold text-[var(--color-brand-text)] shadow-[0_8px_24px_rgba(64,16,33,0.18)] transition-[background-color,transform,box-shadow] duration-150 ease-[var(--ease-out)] hover:bg-[var(--color-brand-hover)] active:scale-[0.97]"
              >
                <span>See Upcoming Events</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </a>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)]/80 backdrop-blur-md px-6 py-3.5 text-sm sm:text-[15px] font-semibold text-[var(--color-ink)] transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-brand)]/45 active:scale-[0.97]"
              >
                <Instagram className="h-4 w-4 text-[var(--color-brand)]" strokeWidth={1.9} />
                <span>Instagram</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-2 text-xs font-medium text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <GlassWater className="h-4 w-4 text-[var(--color-brand)]" strokeWidth={2} />
                Bar Credit Included With Tickets
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-[var(--color-brand)]" strokeWidth={2} />
                Smooth Entry
              </span>
            </div>
          </div>

          {/* Right: Featured "Next Party" Glass Card */}
          {featuredEvent && (
            <div className="lg:col-span-5 lg:justify-self-end w-full max-w-md">
              <div className="rounded-2xl border border-[var(--color-hairline)]/70 bg-[var(--color-surface)]/90 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-brand)]">
                    <Flame className="h-3.5 w-3.5" /> Featured Event
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                    Booking Live
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-[var(--color-ink)] leading-snug line-clamp-2">
                    {featuredEvent.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1.5 num">
                      <Calendar className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                      {featuredEvent.startsAt
                        ? formatDateTime(featuredEvent.startsAt)
                        : "Coming soon"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                      {featuredEvent.venue?.name || "Venue to be announced"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-hairline)]/50 flex items-center justify-between gap-4">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      Tickets From
                    </span>
                    <span className="text-lg font-bold text-[var(--color-ink)] num">
                      {featuredEvent.ticketTiers?.length
                        ? formatCurrencyINR(
                          Math.min(...featuredEvent.ticketTiers.map((t) => t.price)),
                        )
                        : "Price to be announced"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/events/${featuredEvent.id}`)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-xs font-semibold text-[var(--color-brand-text)] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[var(--color-brand-hover)] active:scale-[0.97] cursor-pointer"
                  >
                    <span>Book Tickets</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Upcoming Nights (Top 3) */}
      <section id="upcoming-events" className="space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--color-hairline)]/50">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand)]">
              Coming Up &bull; Pune
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
              Upcoming Events
            </h2>
          </div>

          <Link
            to="/events"
            className="group inline-flex items-center gap-2 text-sm font-bold text-[var(--color-ink)] transition-colors hover:text-[var(--color-brand)]"
          >
            <span>View Full Calendar</span>
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        </div>

        {isLoading
          ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-[440px] animate-pulse rounded-2xl border border-[var(--color-hairline)]/40 bg-[var(--color-surface)]/50"
                />
              ))}
            </div>
          )
          : isError || displayEvents.length === 0
          ? (
            <div className="space-y-2 rounded-2xl border border-dashed border-[var(--color-hairline)] bg-[var(--color-surface)]/60 p-12 text-center">
              <p className="text-base font-bold text-[var(--color-ink)]">
                Events are being confirmed.
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Follow @house.untold on Instagram for updates when tickets go on sale.
              </p>
            </div>
          )
          : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {displayEvents.map((evt, idx) => {
                const cover = evt.coverImage || DEFAULT_EVENT_IMAGES[idx % DEFAULT_EVENT_IMAGES.length];
                const minPrice = evt.ticketTiers?.length
                  ? Math.min(...evt.ticketTiers.map((t) => t.price))
                  : 0;
                const formattedDate = evt.startsAt
                  ? formatDateTime(evt.startsAt)
                  : "Date to be announced";

                return (
                  <article
                    key={evt.id}
                    onClick={() => navigate(`/events/${evt.id}`)}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--color-hairline)]/60 bg-[var(--color-surface)] text-left shadow-[0_1px_2px_rgba(64,16,33,0.04)] transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[var(--color-brand)]/45 hover:shadow-[0_14px_32px_rgba(64,16,33,0.1)]"
                  >
                    {/* Event Cover */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-canvas)]">
                      <img
                        src={cover}
                        alt={evt.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)]/90 via-[var(--color-canvas)]/20 to-transparent" />

                      <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                        <span className="rounded-lg border border-[var(--color-hairline)]/60 bg-[var(--color-canvas)]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink)] backdrop-blur-md">
                          Seated &amp; Floor
                        </span>
                        <span className="num rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success-bg)]/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)]">
                          Tickets Available
                        </span>
                      </div>

                      <div className="pointer-events-none absolute bottom-3 left-3 right-3">
                        <span className="rounded-lg border border-[var(--color-hairline)]/50 bg-[var(--color-canvas)]/85 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink)] backdrop-blur-md">
                          DJ Night &amp; Lounge Session
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                      <div className="space-y-3">
                        <h3 className="text-lg font-bold leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-brand)]">
                          {evt.title}
                        </h3>

                        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">
                          {evt.description
                            || "Live music, a packed floor, and bar credit included with your ticket."}
                        </p>

                        <div className="space-y-1.5 pt-1 text-xs text-[var(--color-muted)]">
                          <div className="flex items-center gap-2">
                            <Calendar
                              className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]"
                              strokeWidth={2}
                            />
                            <span className="num font-medium">{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin
                              className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]"
                              strokeWidth={2}
                            />
                            <span className="truncate">
                              {evt.venue?.name || "Venue to be announced"}, {evt.location || "Pune"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="rounded-md border border-[var(--color-brand)]/35 bg-[var(--color-brand)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-brand)]">
                            Table Booking
                          </span>
                          <span className="rounded-md border border-[#F472B6]/35 bg-[#FCE7F0]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FBCFE8]">
                            Couple Entry
                          </span>
                          <span className="rounded-md border border-[var(--color-success)]/35 bg-[var(--color-success-bg)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                            Single Entry
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-auto flex items-center justify-between gap-4 border-t border-[var(--color-hairline)]/50 pt-4">
                        <div>
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            Starting From
                          </span>
                          <span className="num text-lg font-bold text-[var(--color-ink)]">
                            {minPrice ? formatCurrencyINR(minPrice) : "Price to be announced"}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3.5 py-2 text-xs font-bold text-[var(--color-ink)] transition-all group-hover:border-[var(--color-brand)] group-hover:bg-[var(--color-brand)] group-hover:text-[var(--color-brand-text)]">
                          <span>View Tickets</span>
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </section>

      {/* 3. How Your Night Flows — 3 Steps */}
      <section className="space-y-7 pt-4">
        <div className="max-w-2xl space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand)]">
            How It Works
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            Less waiting at the door. More time on the floor.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: TicketIcon,
              title: "Choose Your Ticket",
              body:
                "Pick a table, couple ticket, or single ticket in seconds. Your spot stays held while you check out.",
            },
            {
              icon: ShieldCheck,
              title: "Show Your Entry QR",
              body:
                "Show your entry QR code and a valid 21+ government photo ID at the door. There's no guest list to wait for.",
            },
            {
              icon: Wallet,
              title: "Use Your Bar Credit",
              body: "Show the bartender your 5-character bar code to redeem drinks and food from your included credit.",
            },
          ].map(({ icon: Icon, title, body }, idx) => (
            <div
              key={title || idx}
              className="group space-y-4 rounded-2xl border border-[var(--color-hairline)]/70 bg-[var(--color-surface)] p-6 shadow-sm transition-all hover:border-[var(--color-brand)]/50 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-brand)] transition-colors group-hover:bg-[var(--color-brand)] group-hover:text-[var(--color-brand-text)]">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[var(--color-ink)]">{title}</h3>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--color-muted)]">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Closing Party CTA Banner */}
      <section className="relative overflow-hidden rounded-[24px] border border-[var(--color-hairline)]/70 bg-[var(--color-surface)] p-8 sm:p-12 shadow-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--color-brand)]/15 blur-3xl"
        />
        <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand)]">
              Book Before It Fills Up
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-ink)]">
              Your weekend plans start here.
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Tables and early-bird tickets go fast. Book your place for the next HouseUntold event in Pune.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/events"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] px-6 py-3.5 text-sm font-bold text-[var(--color-brand-text)] shadow-lg transition-all hover:bg-[var(--color-brand-hover)] active:scale-[0.98]"
            >
              <span>Book Your Ticket</span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-5 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-surface-hover)]"
            >
              <Instagram className="h-4 w-4 text-[var(--color-brand)]" />
              <span>Follow on Instagram</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
