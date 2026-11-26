import { useEvent } from "@/api/hooks/useEvents";
import { useCheckout, useSubmitUtr } from "@/api/hooks/useTickets";
import { FormattedText } from "@/components/ui/FormattedText";
import { Modal } from "@/components/ui/Modal";
import { formatCurrencyINR, formatDateTime } from "@/lib/utils";
import { limitDigits, normalizeIndianMobile, normalizeUtr } from "@/lib/validation";
import type { TicketTier } from "@/models/event.schema";
import type { InitCheckoutResponse } from "@/models/ticket.schema";
import { useUiStore } from "@/stores/ui.store";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  GlassWater,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Train,
  Users,
  Wallet,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

export const CustomerEventDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, error } = useEvent(id || "");
  const checkoutMutation = useCheckout();
  const submitUtrMutation = useSubmitUtr();
  const { showToast } = useUiStore();

  // Selection states
  const [selectedTierType, setSelectedTierType] = useState<
    "TABLE" | "COUPLE" | "STAG" | "GROUP"
  >("TABLE");
  const [tableSize, setTableSize] = useState<5 | 8 | 10 | 15>(5);
  const [tableCategory, setTableCategory] = useState<"A" | "B" | "C">("A");
  const [isLayoutOpen, setLayoutOpen] = useState(false);
  const [couples, setCouples] = useState(0);
  const [stagMale, setStagMale] = useState(0);
  const [stagFemale, setStagFemale] = useState(0);

  // Single Lead Booker Details
  const [primaryName, setPrimaryName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [contactEmail] = useState("");
  const [primaryAge, setPrimaryAge] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");

  // Hold Timer: 9 minutes
  const [secondsLeft, setSecondsLeft] = useState(9 * 60);

  // Payment & UTR State
  const [checkoutResult, setCheckoutResult] = useState<InitCheckoutResponse | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [utrError, setUtrError] = useState<string | null>(null);
  const [utrSubmitted, setUtrSubmitted] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [utrSubmitError, setUtrSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading event" className="space-y-6 max-w-7xl mx-auto py-8 text-left animate-pulse">
        <div className="h-12 w-full rounded-xl bg-[var(--color-surface)]/60" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-80 rounded-2xl bg-[var(--color-surface)]/60" />
            <div className="h-44 rounded-2xl bg-[var(--color-surface)]/60" />
          </div>
          <div className="lg:col-span-5 h-[520px] rounded-2xl bg-[var(--color-surface)]/60" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-[var(--color-surface)] p-8 rounded-2xl border border-[var(--color-hairline)] shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-center justify-center mx-auto text-[var(--color-danger)]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-ink)]">
          Event unavailable
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          This event may have ended, or the link may be incorrect. Browse upcoming events to keep booking.
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] font-bold text-sm hover:bg-[var(--color-brand-hover)] active:scale-[0.97] transition-[background-color,transform] cursor-pointer"
        >
          Browse Upcoming Events
        </Link>
      </div>
    );
  }

  const tierName = (t: TicketTier) => t.name.trim().toUpperCase();
  const tierPrice = (t?: TicketTier) => t?.effective_price ?? t?.price ?? 0;
  const tierBasePrice = (t?: TicketTier) => t?.base_price ?? tierPrice(t);
  const payableTierPrice = (t?: TicketTier) => tierPrice(t);
  const groupTier = (size: number, section: string) =>
    event.ticketTiers.find(
      (t) =>
        tierName(t).startsWith("GROUP_")
        && t.entry_count === size
        && (t.category || "").toUpperCase() === section,
    );
  const seatGroup = (size: number, section: string) =>
    (event.seats || []).find((s) => s.table_size === size && String(s.section).toUpperCase() === section);
  const tableAvailable = (size: number, section: string) => {
    const seat = seatGroup(size, section);
    if (seat) return Number(seat.available_tables || 0);
    return groupTier(size, section)?.available ?? 0;
  };
  const coupleTier = event.ticketTiers.find(
    (t) => tierName(t) === "COUPLE" || tierName(t).includes("COUPLE"),
  );
  const stagTier = (g: "MALE" | "FEMALE") =>
    event.ticketTiers.find(
      (t) => tierName(t) === (g === "FEMALE" ? "STAG_FEMALE" : "STAG_MALE"),
    ) || event.ticketTiers.find((t) => tierName(t).includes("STAG"));

  const groupCategory = coupleTier || event.ticketTiers[0];
  const couplePrice = tierBasePrice(coupleTier);
  const malePrice = tierBasePrice(stagTier("MALE"));
  const femaleTier = stagTier("FEMALE");
  const femalePrice = tierBasePrice(femaleTier);
  const femaleFirst99Price = tierPrice(femaleTier);
  const femaleSlotsLeft = femaleTier?.free_slots_remaining;
  const first99FemaleActive = Boolean(
    event.is_first_99_active && femaleTier?.first_99_applied && femaleSlotsLeft !== 0,
  );
  const womenOnlyGroup = couples === 0 && stagMale === 0 && stagFemale > 0;
  const groupFemalePrice = !first99FemaleActive ? femalePrice : womenOnlyGroup ? 1 : 0;
  const groupFemaleTotal = womenOnlyGroup && first99FemaleActive
    ? 1
    : stagFemale * groupFemalePrice;
  const groupGuestCount = couples * 2 + stagMale + stagFemale;
  const groupTotal = couples * couplePrice
    + stagMale * malePrice
    + groupFemaleTotal;

  const matchedTier = selectedTierType === "TABLE"
    ? groupTier(tableSize, tableCategory)
    : selectedTierType === "COUPLE"
    ? coupleTier
    : selectedTierType === "GROUP"
    ? groupCategory
    : stagTier(gender);
  const isGroupTier = matchedTier
    ? tierName(matchedTier).startsWith("GROUP_")
    : false;
  const effectivePrice = selectedTierType === "GROUP" ? groupTotal : payableTierPrice(matchedTier);
  const tierPrices = event.ticketTiers
    .map(payableTierPrice)
    .filter((p) => p > 0);
  const minPrice = tierPrices.length ? Math.min(...tierPrices) : 0;
  const maxPrice = tierPrices.length ? Math.max(...tierPrices) : 0;
  const stag = stagTier(gender);
  const tierAvailability = (t?: TicketTier) =>
    !t ? "Unavailable" : t.available === 0 ? "Sold out" : `${t.available} left`;

  const stepper = (
    label: string,
    value: number,
    onChange: (value: number) => void,
  ) => (
    <div className="flex items-center justify-between py-2 border-b border-[var(--color-hairline)]/40 last:border-b-0">
      <span className="text-[var(--color-ink)] font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Remove one ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-lg border border-[var(--color-hairline)] text-[var(--color-ink)] cursor-pointer transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-surface-hover)] active:scale-95"
        >
          −
        </button>
        <span className="num font-bold w-5 text-center">{value}</span>
        <button
          type="button"
          aria-label={`Add one ${label}`}
          onClick={() => onChange(Math.min(50, value + 1))}
          className="w-7 h-7 rounded-lg border border-[var(--color-hairline)] text-[var(--color-ink)] cursor-pointer transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-surface-hover)] active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );

  const handleCheckoutInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    if (!primaryName.trim()) {
      setCheckoutError("Lead guest name is required.");
      showToast("Lead guest name is required", "warning");
      return;
    }
    const phoneResult = normalizeIndianMobile(whatsappPhone);
    if (phoneResult.error) {
      setWhatsappError(phoneResult.error);
      setCheckoutError(phoneResult.error);
      showToast(phoneResult.error, "warning");
      return;
    }
    setWhatsappError(null);
    setWhatsappPhone(phoneResult.value);
    if (
      selectedTierType === "GROUP"
      && (groupGuestCount < 1 || groupGuestCount > 50)
    ) {
      setCheckoutError("Choose between 1 and 50 guests.");
      showToast("Choose between 1 and 50 guests", "warning");
      return;
    }
    if (!matchedTier) {
      const msg = selectedTierType === "TABLE"
        ? `A table for ${tableSize} in section ${tableCategory} is not available.`
        : "This ticket type is not available for this event.";
      setCheckoutError(msg);
      showToast(msg, "warning");
      return;
    }
    const soldOut = selectedTierType === "TABLE"
      ? tableAvailable(tableSize, tableCategory) <= 0
      : matchedTier.available === 0;
    if (soldOut) {
      setCheckoutError("This ticket is sold out. Pick another option.");
      showToast("This ticket is sold out. Pick another option.", "warning");
      return;
    }

    try {
      const formattedPhone = phoneResult.value;

      setCheckoutPhone(formattedPhone);

      const payload: any = {
        event_id: event.id,
        category_id: matchedTier.id,
        contact_phone: formattedPhone,
        contact_email: contactEmail.trim()
          || `${formattedPhone.replace(/\D/g, "")}@patron.houseuntold.com`,
        primary_name: primaryName.trim(),
        whatsapp_number: formattedPhone,
        gender,
      };

      if (primaryAge.trim()) {
        payload.primary_age = Number(primaryAge);
      }
      if (selectedTierType === "GROUP") {
        payload.group = {
          couples,
          stag_male: stagMale,
          stag_female: stagFemale,
        };
      } else if (isGroupTier) {
        payload.seat_selection = {
          section: tableCategory,
          table_size: tableSize,
        };
      }

      const res = await checkoutMutation.mutateAsync(payload);
      setCheckoutResult(res);
      setUtrSubmitted(false);
      setCheckoutError(null);
      showToast(
        res.status === "CONFIRMED"
          ? "Booking confirmed. Your ticket is ready."
          : "Payment QR generated. Complete payment and submit the payment reference.",
        "success",
      );
    } catch (err: any) {
      const msg = err.response?.data?.error
        || err.response?.data?.message
        || err.message
        || "Could not start checkout. Please try again.";
      setCheckoutError(msg);
      showToast(msg, "danger");
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    setUtrSubmitError(null);
    if (!checkoutResult) return;
    const utrResult = normalizeUtr(utrNumber);
    if (utrResult.error) {
      setUtrError(utrResult.error);
      showToast(utrResult.error, "warning");
      return;
    }
    setUtrError(null);
    setUtrNumber(utrResult.value);

    try {
      const phoneResult = normalizeIndianMobile(checkoutPhone || whatsappPhone);
      if (phoneResult.error) {
        setWhatsappError(phoneResult.error);
        showToast(phoneResult.error, "warning");
        return;
      }

      await submitUtrMutation.mutateAsync({
        booking_id: checkoutResult.booking_id,
        upi_transaction_id: utrResult.value,
        phone: phoneResult.value,
      });
      setUtrSubmitted(true);
      showToast(
        "Payment reference submitted! Verification in progress.",
        "success",
      );
    } catch (err: any) {
      const msg = err.response?.data?.error
        || err.response?.data?.message
        || err.message
        || "Could not submit your payment reference. Please try again.";
      setUtrSubmitError(msg);
      showToast(msg, "danger");
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    showToast("UPI ID copied to clipboard", "info");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // UPI Payment URL
  const upiId = event.upiVpa || "houseuntold@icici";
  const payableAmount = checkoutResult?.total_amount ?? effectivePrice;
  const upiPayUrl = checkoutResult?.payment_qr_data
    || `upi://pay?pa=${upiId}&pn=HouseUntold&am=${payableAmount}&cu=INR&tn=Booking-${event.title.substring(0, 10)}`;

  const bookingStep = !checkoutResult
    ? 1
    : checkoutResult.status === "CONFIRMED" || utrSubmitted
    ? 3
    : 2;

  return (
    <div className="space-y-6 animate-fade-in text-left max-w-7xl mx-auto pb-20">
      {/* Top Navigation & Hold Timer Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-hairline)]/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-brand)]/50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Events</span>
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-ink)] truncate">
              {event.title}
            </h1>
            <p className="text-xs text-[var(--color-muted)] truncate">
              {formatDateTime(event.startsAt)} &bull; {event.venue?.name || "Venue to be announced"}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-ink)] num shrink-0">
          <Clock className="w-4 h-4 text-[var(--color-brand)]" />
          <span className="text-[var(--color-muted)] font-medium">
            Time left to book
          </span>
          <span className="font-bold text-[var(--color-brand)]">
            {formatTimer(secondsLeft)}
          </span>
        </div>
      </div>

      {/* Main Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Event Overview & Venue Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Event Card */}
          <div className="rounded-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 shadow-lg">
            {event.coverImage && (
              <div className="relative aspect-[16/9] w-full bg-[var(--color-canvas)] overflow-hidden">
                <img
                  src={event.coverImage}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
              </div>
            )}

            <div className="p-6 sm:p-8 space-y-5">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-ink)] tracking-tight leading-tight">
                  {event.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/50">
                  <Calendar className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Date &amp; Time
                    </span>
                    <span className="text-xs font-bold text-[var(--color-ink)] num">
                      {formatDateTime(event.startsAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/50">
                  <MapPin className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Venue
                    </span>
                    <span className="text-xs font-bold text-[var(--color-ink)] truncate block">
                      {event.venue?.name || "Venue to be announced"}
                      {event.location ? `, ${event.location}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What to Expect */}
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]/50">
              <h3 className="text-base font-bold text-[var(--color-ink)]">
                About this event
              </h3>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                HouseUntold
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto pr-2">
              <FormattedText
                text={event.description
                  || "Event details will be shared here closer to the date."}
                className="text-sm leading-relaxed text-[var(--color-muted)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/50 flex items-start gap-3">
                <GlassWater className="w-4 h-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[var(--color-ink)] block">
                    Bar credit included
                  </span>
                  <span className="text-[var(--color-muted)]">
                    Redeem drinks and food with your ticket's bar code.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/50 flex items-start gap-3">
                <Shield className="w-4 h-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[var(--color-ink)] block">
                    Photo ID at entry
                  </span>
                  <span className="text-[var(--color-muted)]">
                    A valid government photo ID is required at the door.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Venue & Arrival Info */}
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 p-6 sm:p-7 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-[var(--color-ink)] pb-3 border-b border-[var(--color-hairline)]/50">
              Venue &amp; Arrival Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/50">
                <MapPin className="w-4 h-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[var(--color-ink)]">
                    {event.venue?.name || "Venue to be announced"}
                  </div>
                  <div className="text-[var(--color-muted)] mt-0.5">
                    {event.location || event.locationArea || "Location to be announced"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/50">
                <Train className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[var(--color-ink)]">
                    {event.venue?.address || "Address shared after booking"}
                  </div>
                  <div className="text-[var(--color-muted)] mt-0.5">
                    {event.transitInfo || "Check local travel options"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/50">
                <Shield className="w-4 h-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
                <div className="text-[var(--color-muted)] leading-relaxed">
                  {event.advisoryNotice
                    || "A valid government photo ID is required."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking & Checkout Terminal */}
        <div className="order-first lg:order-none lg:col-span-5 lg:sticky lg:top-20">
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 shadow-xl overflow-hidden">
            {/* Booking Card Header + Step Indicator */}
            <div className="px-6 py-5 border-b border-[var(--color-hairline)]/60 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand)]">
                    Step {bookingStep} of 3 · {bookingStep === 1 ? "Ticket & details" : bookingStep === 2 ? "Payment" : "Pass ready"}
                  </p>
                  <div className="text-xl font-bold text-[var(--color-ink)] num mt-0.5">
                    {minPrice
                      ? `${formatCurrencyINR(minPrice)} – ${formatCurrencyINR(maxPrice)}`
                      : "Coming soon"}
                  </div>
                </div>
              </div>

              {/* 3-Step Progress Bar */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { num: 1, label: "Ticket & details", short: "Details" },
                  { num: 2, label: "Pay by UPI", short: "Pay" },
                  { num: 3, label: "Get pass", short: "Pass" },
                ].map((s) => (
                  <div key={s.num} className="space-y-1">
                    <div
                      className={`h-1 rounded-full transition-colors ${
                        bookingStep >= s.num
                          ? "bg-[var(--color-brand)]"
                          : "bg-[var(--color-hairline)]/60"
                      }`}
                    />
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-wider ${
                        bookingStep >= s.num
                          ? "text-[var(--color-ink)]"
                          : "text-[var(--color-muted)]"
                      }`}
                    >
                      {s.num}. <span className="sm:hidden">{s.short}</span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {event.ticketTiers.length === 0
                ? (
                  <div className="p-8 rounded-2xl bg-[var(--color-canvas)] border border-dashed border-[var(--color-hairline)] text-center space-y-3 animate-fade-in">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] flex items-center justify-center mx-auto text-[var(--color-brand)]">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-ink)]">
                      Tickets aren't on sale yet
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] max-w-xs mx-auto">
                      No ticket tiers are available for this event. Check back closer to the date.
                    </p>
                    <Link
                      to="/events"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-brand)] active:scale-[0.97] transition-[border-color,transform] cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> All events
                    </Link>
                  </div>
                )
                : !checkoutResult
                ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[var(--color-ink)]">Choose your ticket</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                        Step 1 of 3
                      </span>
                    </div>

                    {/* Tier Type Tabs with Smooth Sliding Pill */}
                    <div className="space-y-3 ">
                      <div
                        role="tablist"
                        aria-label="Booking type"
                        className="relative grid grid-cols-2 p-1 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]"
                      >
                        {/* Smooth Sliding Active Indicator */}
                        <span
                          aria-hidden="true"
                          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[var(--color-brand)] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                            selectedTierType === "GROUP"
                              ? "translate-x-full"
                              : "translate-x-0"
                          }`}
                        />

                        {(
                          [
                            { id: "TABLE", label: "Table" },
                            { id: "GROUP", label: "Group" },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={selectedTierType === tab.id}
                            onClick={() => setSelectedTierType(tab.id)}
                            className={`relative z-10 w-full py-2 px-3 rounded-lg text-xs font-bold transition-[color,transform] duration-200 active:scale-[0.97] cursor-pointer ${
                              selectedTierType === tab.id
                                ? "text-[var(--color-brand-text)]"
                                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Smooth Sliding Panel Container for TABLE & GROUP */}
                      {(selectedTierType === "TABLE"
                        || selectedTierType === "GROUP") && (
                        <div className="overflow-hidden rounded-xl">
                          <div
                            className={`flex w-[200%] items-start transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                              selectedTierType === "GROUP"
                                ? "-translate-x-1/2"
                                : "translate-x-0"
                            }`}
                          >
                            {/* TABLE Options */}
                            <div
                              className={`w-1/2 shrink-0 pr-0.5 transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                selectedTierType === "TABLE"
                                  ? "max-h-[500px] opacity-100"
                                  : "max-h-0 opacity-0 overflow-hidden pointer-events-none"
                              }`}
                            >
                              <div className="p-4 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/60 space-y-4 text-xs">
                                <div className="space-y-2">
                                  <span className="font-bold text-[var(--color-muted)] uppercase tracking-wider text-[10px] block">
                                    Table Capacity
                                  </span>
                                  <div className="grid grid-cols-4 gap-2">
                                    {([5, 8, 10, 15] as const).map((size) => (
                                      <button
                                        key={size}
                                        type="button"
                                        onClick={() => setTableSize(size)}
                                        disabled={!((["A","B","C"] as const).some((c) => tableAvailable(size, c) > 0))}
                                        className={`py-2 rounded-lg border text-center font-bold text-xs transition-[background-color,border-color,transform] active:scale-[0.97] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                                          tableSize === size
                                            ? "bg-[var(--color-brand)] text-[var(--color-brand-text)] border-[var(--color-brand)]"
                                            : "bg-[var(--color-surface)] border-[var(--color-hairline)] text-[var(--color-ink)] hover:border-[var(--color-brand)]/50"
                                        }`}
                                      >
                                        {size} Guests
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <span className="font-bold text-[var(--color-muted)] uppercase tracking-wider text-[10px] block">
                                    Zone Pricing (Table of {tableSize})
                                  </span>
                                  <div className="grid grid-cols-3 gap-2">
                                    {(["A", "B", "C"] as const).map((cat) => {
                                      const tier = groupTier(tableSize, cat);
                                      return (
                                        <button
                                          key={cat}
                                          type="button"
                                          onClick={() => setTableCategory(cat)}
                                          disabled={tier?.available === 0}
                                          className={`p-2.5 rounded-lg border text-left transition-[background-color,border-color,transform] active:scale-[0.97] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                                            tableCategory === cat
                                              ? "bg-[var(--color-brand)] text-[var(--color-brand-text)] border-[var(--color-brand)]"
                                              : "bg-[var(--color-surface)] border-[var(--color-hairline)] text-[var(--color-ink)] hover:border-[var(--color-brand)]/50"
                                          }`}
                                        >
                                          <div
                                            className={`text-[10px] font-semibold uppercase ${
                                              tableCategory === cat
                                                ? "text-[var(--color-brand-text)]/80"
                                                : "text-[var(--color-muted)]"
                                            }`}
                                          >
                                            Zone {cat}
                                          </div>
                                          <div className="font-bold text-xs num mt-0.5">
                                            {tier
                                              ? formatCurrencyINR(
                                                payableTierPrice(tier),
                                              )
                                              : "—"}
                                          </div>
                                          <div
                                            className={`text-[9px] font-semibold mt-0.5 ${
                                              tableCategory === cat
                                                ? "text-[var(--color-brand-text)]/80"
                                                : tier?.available === 0
                                                ? "text-[var(--color-danger)]"
                                                : "text-[var(--color-muted)]"
                                            }`}
                                          >
                                            {tierAvailability(tier)}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                  {(!groupTier(tableSize, tableCategory) || tableAvailable(tableSize, tableCategory) <= 0) && (
                                    <p className="text-[11px] font-semibold text-[var(--color-danger)]">
                                      {tableAvailable(tableSize, tableCategory) <= 0 ? `Sold out for ${tableSize} guests in zone ${tableCategory}. Pick another size or zone.` : `No tables for ${tableSize} guests in zone ${tableCategory}. Try another size or zone.`}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-hairline)]/40 text-[11px] text-[var(--color-muted)]">
                                    <Wallet className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                                    <span>
                                      The full table amount becomes bar credit.
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setLayoutOpen(true)}
                                    className="min-h-[44px] w-full py-2.5 rounded-lg border border-[var(--color-brand)]/40 text-[var(--color-brand)] text-sm font-semibold hover:bg-[var(--color-brand)]/10 active:scale-[0.98] transition-[background-color,transform] duration-150 cursor-pointer"
                                  >
                                    Show layout
                                  </button>
                                </div>
                            </div>

                            {/* GROUP Options */}
                            <div
                              className={`w-1/2 shrink-0 pl-0.5 transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                selectedTierType === "GROUP"
                                  ? "max-h-[500px] opacity-100"
                                  : "max-h-0 opacity-0 overflow-hidden pointer-events-none"
                              }`}
                            >
                              <div className="p-4 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/60 space-y-3 text-xs">
                                {stepper("Couples", couples, setCouples)}
                                {stepper("Single - Men", stagMale, setStagMale)}
                                {stepper(
                                  "Single - Women",
                                  stagFemale,
                                  setStagFemale,
                                )}

                                <div className="pt-3 border-t border-[var(--color-hairline)]/40 space-y-1.5 text-[var(--color-muted)]">
                                  {couples > 0 && (
                                    <div className="flex justify-between">
                                      <span>{couples} couple{couples === 1 ? "" : "s"}</span>
                                      <span className="num">{formatCurrencyINR(couples * couplePrice)}</span>
                                    </div>
                                  )}
                                  {stagMale > 0 && (
                                    <div className="flex justify-between">
                                      <span>{stagMale} {stagMale === 1 ? "single man" : "single men"}</span>
                                      <span className="num">{formatCurrencyINR(stagMale * malePrice)}</span>
                                    </div>
                                  )}
                                  {stagFemale > 0 && (
                                    <div className="flex justify-between">
                                      <span>{stagFemale} single {stagFemale === 1 ? "woman" : "women"}</span>
                                      <span className="num">{formatCurrencyINR(groupFemaleTotal)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-[var(--color-ink)] pt-1.5 border-t border-[var(--color-hairline)]/40">
                                    <span>
                                      {groupGuestCount} guest
                                      {groupGuestCount === 1 ? "" : "s"}
                                    </span>
                                    <span className="num">
                                      {formatCurrencyINR(groupTotal)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* COUPLE Options */}
                      {selectedTierType === "COUPLE" && (
                        <div className="p-4 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/60 space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--color-muted)]">
                              Couple Entry (2 Guests)
                            </span>
                            <span className="text-sm font-bold text-[var(--color-ink)] num">
                              {coupleTier
                                ? formatCurrencyINR(tierPrice(coupleTier))
                                : "Unavailable"}
                            </span>
                          </div>
                          <p className={`text-[10px] font-semibold ${
                            coupleTier?.available === 0 ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"
                          }`}>
                            {tierAvailability(coupleTier)}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--color-muted)]">
                              Included bar credit
                            </span>
                            <span className="font-bold text-[var(--color-success)] num">
                              {formatCurrencyINR(coupleTier?.fnb_credit || 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-hairline)]/40 text-[11px] text-[var(--color-muted)]">
                            <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                            <span>
                              Valid photo ID required
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Single Options */}
                      {selectedTierType === "STAG" && (
                        <div className="p-4 rounded-xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)]/60 space-y-3 text-xs">
                          {first99FemaleActive && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-success-bg)]/80 border border-[var(--color-success)]/35 text-[var(--color-success)]">
                              <Users className="w-4 h-4 shrink-0" />
                              <span className="font-bold">
                                {couples > 0 || stagMale > 0
                                  ? "Women are free in mixed groups"
                                  : femaleFirst99Price === 0
                                  ? "First 99 women enter free"
                                  : `First 99 women at ${formatCurrencyINR(femaleFirst99Price)}`}
                                 {femaleSlotsLeft !== undefined ? ` · ${femaleSlotsLeft} slots left` : ""}
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setGender("MALE")}
                              className={`p-3 rounded-lg border text-left transition-[background-color,border-color,transform] active:scale-[0.98] cursor-pointer ${
                                gender === "MALE"
                                  ? "bg-[var(--color-brand)] text-[var(--color-brand-text)] border-[var(--color-brand)]"
                                  : "bg-[var(--color-surface)] border-[var(--color-hairline)] text-[var(--color-ink)]"
                              }`}
                            >
                              <div className="font-bold text-xs">
                                Single - Men
                              </div>
                              <div className="font-extrabold num text-sm mt-0.5">
                                {stagTier("MALE")
                                  ? formatCurrencyINR(tierPrice(stagTier("MALE")))
                                  : "—"}
                              </div>
                              <div
                                className={`text-[10px] mt-1 ${
                                  gender === "MALE"
                                    ? "text-[var(--color-brand-text)]/80"
                                    : "text-[var(--color-muted)]"
                                }`}
                              >
                                {formatCurrencyINR(stagTier("MALE")?.fnb_credit || 0)} bar credit
                                <span className="block mt-0.5">{tierAvailability(stagTier("MALE"))}</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setGender("FEMALE")}
                              className={`p-3 rounded-lg border text-left transition-[background-color,border-color,transform] active:scale-[0.98] cursor-pointer ${
                                gender === "FEMALE"
                                  ? "bg-[var(--color-brand)] text-[var(--color-brand-text)] border-[var(--color-brand)]"
                                  : "bg-[var(--color-surface)] border-[var(--color-hairline)] text-[var(--color-ink)]"
                              }`}
                            >
                              <div className="font-bold text-xs">
                                Single — Women
                              </div>
                              <div className="font-extrabold num text-sm mt-0.5">
                                {stagTier("FEMALE")
                                  ? formatCurrencyINR(
                                    tierPrice(stagTier("FEMALE")),
                                  )
                                  : "—"}
                              </div>
                              <div
                                className={`text-[10px] mt-1 ${
                                  gender === "FEMALE"
                                    ? "text-[var(--color-brand-text)]/80"
                                    : "text-[var(--color-muted)]"
                                }`}
                              >
                                {formatCurrencyINR(femaleTier?.fnb_credit || 0)} bar credit
                                {femaleTier?.includes_free_shot && <span> + 1 tequila shot</span>}
                                <span className="block mt-0.5">{tierAvailability(femaleTier)}</span>
                              </div>
                            </button>
                          </div>

                          {stag && (
                            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-hairline)]/40 text-[11px] text-[var(--color-muted)]">
                              <span>Bar credit included</span>
                              <span className="font-bold text-[var(--color-success)] num">
                                {formatCurrencyINR(stag.fnb_credit || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Lead Attendee Form */}
                    <form
                      onSubmit={handleCheckoutInit}
                      className="space-y-4 pt-4 border-t border-[var(--color-hairline)]/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                          Lead guest details
                        </h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                          Step 1 of 3
                        </span>
                      </div>

                      {checkoutError && (
                        <p
                          role="alert"
                          className="p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/35 text-[11px] font-semibold text-[var(--color-danger)]"
                        >
                          {checkoutError}
                        </p>
                      )}

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[var(--color-muted)] mb-1 font-semibold">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Kumar Kartik"
                            value={primaryName}
                            onChange={(e) => setPrimaryName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)] placeholder-[var(--color-muted)]/50 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10 focus:outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[var(--color-muted)] mb-1 font-semibold">
                            WhatsApp Number *
                          </label>
                          <input
                            type="tel"
                            required
                            maxLength={12}
                            inputMode="numeric"
                            placeholder="919876543210 (Ticket sent on WhatsApp)"
                            value={whatsappPhone}
                            onChange={(e) => {
                              setWhatsappPhone(limitDigits(e.target.value));
                              setWhatsappError(null);
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-canvas)] border text-[var(--color-ink)] placeholder-[var(--color-muted)]/50 focus:outline-none transition-colors ${
                              whatsappError
                                ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]"
                                : "border-[var(--color-hairline)] focus:border-[var(--color-brand)]"
                            }`}
                          />
                          {whatsappError && (
                            <p className="mt-1 text-[11px] font-semibold text-[var(--color-danger)]">
                              {whatsappError}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                            Saved as +91 followed by your 10-digit number.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[var(--color-muted)] mb-1 font-semibold">
                              Age *
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={primaryAge}
                              onChange={(e) => setPrimaryAge(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/10 focus:outline-none num"
                            />
                          </div>
                          <div>
                            <label className="block text-[var(--color-muted)] mb-1 font-semibold">
                              Gender
                            </label>
                            <div
                              role="radiogroup"
                              aria-label="Gender"
                              className="relative grid grid-cols-2 p-1 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] h-[42px]"
                            >
                              {/* Sliding Active Indicator */}
                              <span
                                aria-hidden="true"
                                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[var(--color-brand)] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                                  gender === "FEMALE"
                                    ? "translate-x-full"
                                    : "translate-x-0"
                                }`}
                              />

                              <button
                                type="button"
                                role="radio"
                                aria-checked={gender === "MALE"}
                                onClick={() => setGender("MALE")}
                                className={`relative z-10 flex items-center justify-center gap-1.5 text-xs font-bold transition-[color,transform] duration-200 active:scale-95 cursor-pointer ${
                                  gender === "MALE"
                                    ? "text-[var(--color-brand-text)]"
                                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                }`}
                              >
                                <svg
                                  className="w-3.5 h-3.5 shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <circle cx="10" cy="14" r="5" />
                                  <path d="M19 5l-5.4 5.4" />
                                  <path d="M15 5h4v4" />
                                </svg>
                                <span>Male</span>
                              </button>

                              <button
                                type="button"
                                role="radio"
                                aria-checked={gender === "FEMALE"}
                                onClick={() => setGender("FEMALE")}
                                className={`relative z-10 flex items-center justify-center gap-1.5 text-xs font-bold transition-[color,transform] duration-200 active:scale-95 cursor-pointer ${
                                  gender === "FEMALE"
                                    ? "text-[var(--color-brand-text)]"
                                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                }`}
                              >
                                <svg
                                  className="w-3.5 h-3.5 shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <circle cx="12" cy="9" r="5" />
                                  <path d="M12 14v7" />
                                  <path d="M9 18h6" />
                                </svg>
                                <span>Female</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--color-hairline)]/50 space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-[var(--color-muted)]">
                            Total Payable
                          </span>
                          <span className="text-2xl font-extrabold text-[var(--color-ink)] num">
                            {formatCurrencyINR(payableAmount)}
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={checkoutMutation.isPending}
                          className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] font-bold text-sm hover:bg-[var(--color-brand-hover)] active:scale-[0.98] transition-[background-color,transform] shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                          <span>
                            {checkoutMutation.isPending
                              ? "Preparing payment QR..."
                              : "Proceed to UPI Payment"}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </>
                )
                : checkoutResult.status === "CONFIRMED"
                ? (
                  /* Instant Confirmation State (₹0 / Free Pass) */
                  <div className="p-6 rounded-2xl bg-[var(--color-success-bg)]/80 border border-[var(--color-success)]/50 text-center space-y-4 animate-fade-in">
                    <CheckCircle2 className="w-12 h-12 text-[var(--color-success)] mx-auto" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)]">
                        Step 3 of 3 · Pass ready
                      </span>
                      <h4 className="text-lg font-bold text-[var(--color-ink)]">
                        Booking confirmed
                      </h4>
                      <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                        No payment was needed. Your entry QR and bar code are ready in My Ticket.
                      </p>
                      <p className="text-[11px] font-semibold text-[var(--color-ink)] num">
                        Ticket {checkoutResult.ticket_id.slice(0, 8).toUpperCase()}
                        {checkoutResult.bar_code ? ` · Bar code ${checkoutResult.bar_code}` : ""}
                        {checkoutResult.tequila_eligible_count
                          ? ` · ${checkoutResult.tequila_eligible_count} tequila shot${checkoutResult.tequila_eligible_count === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                    <Link
                      to={`/orders/track?ticket_id=${checkoutResult.ticket_id}`}
                      className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] font-bold text-sm hover:bg-[var(--color-brand-hover)] active:scale-[0.98] transition-[background-color,transform] cursor-pointer"
                    >
                      <span>View my ticket</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )
                : !utrSubmitted
                ? (
                  /* Step 2: UPI QR & UTR Submission */
                  <div className="space-y-5 text-center animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand)]">
                        Step 2 of 3 · Payment
                      </span>
                      <h4 className="text-base font-bold text-[var(--color-ink)]">
                        Scan &amp; pay via UPI
                      </h4>
                      <p className="text-xs text-[var(--color-muted)]">
                        Pay{" "}
                        <span className="font-bold text-[var(--color-ink)] num">
                          {formatCurrencyINR(payableAmount)}
                        </span>
                        , then add your payment reference below.
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto border-2 border-[var(--color-hairline)]">
                      <QRCodeSVG
                        value={upiPayUrl}
                        size={184}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    <div className="px-3.5 py-2.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-xs flex items-center justify-between gap-2">
                      <span className="text-[var(--color-ink)] truncate font-mono">
                        {upiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-brand)] hover:border-[var(--color-brand)] active:scale-[0.97] transition-[border-color,transform] duration-150 shrink-0 cursor-pointer"
                      >
                        {copiedUpi
                          ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                              <span>Copied</span>
                            </>
                          )
                          : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                      </button>
                    </div>

                    <form
                      onSubmit={handleSubmitUtr}
                      className="space-y-3 text-left pt-2 border-t border-[var(--color-hairline)]/50"
                    >
                      <label className="block text-xs font-bold text-[var(--color-ink)]">
                        12-Digit Payment Reference *
                      </label>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={12}
                        placeholder="e.g. 432109876543"
                        value={utrNumber}
                        onChange={(e) => {
                          setUtrNumber(limitDigits(e.target.value));
                          setUtrError(null);
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-canvas)] border text-[var(--color-ink)] placeholder-[var(--color-muted)]/50 text-sm font-mono focus:ring-2 focus:ring-[var(--color-brand)]/10 focus:outline-none ${
                          utrError
                            ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]"
                            : "border-[var(--color-hairline)] focus:border-[var(--color-brand)]"
                        }`}
                      />
                      {utrError && (
                        <p className="text-[11px] font-semibold text-[var(--color-danger)]">
                          {utrError}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--color-muted)]">
                        Enter the 12 digits from your UPI receipt, without letters or symbols.
                      </p>
                      {utrSubmitError && (
                        <p
                          role="alert"
                          className="p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/35 text-[11px] font-semibold text-[var(--color-danger)]"
                        >
                          {utrSubmitError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitUtrMutation.isPending}
                        className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] font-bold text-sm hover:bg-[var(--color-brand-hover)] active:scale-[0.98] transition-[background-color,transform] shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                      >
                        {submitUtrMutation.isPending
                          ? "Submitting reference..."
                          : "Submit Payment Reference"}
                      </button>
                    </form>
                  </div>
                )
                : (
                  /* Step 3: UTR Submitted State */
                  <div className="p-6 rounded-2xl bg-[var(--color-success-bg)]/80 border border-[var(--color-success)]/50 text-center space-y-4 animate-fade-in">
                    <CheckCircle2 className="w-12 h-12 text-[var(--color-success)] mx-auto" />
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)]">
                        Step 3 of 3 · Verification
                      </span>
                      <h4 className="text-lg font-bold text-[var(--color-ink)]">
                        Payment reference saved
                      </h4>
                      <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                        Reference{" "}
                        <span className="font-mono font-bold text-[var(--color-success)]">
                          {utrNumber}
                        </span>{" "}
                        is under review. Your pass appears in My Ticket once payment is approved. Updates go to{" "}
                        <span className="font-semibold text-[var(--color-ink)]">
                          {checkoutPhone || whatsappPhone}
                        </span>
                        .
                      </p>
                    </div>

                    <Link
                      to={`/orders/track?ticket_id=${checkoutResult.ticket_id}`}
                      className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] font-bold text-sm hover:bg-[var(--color-brand-hover)] active:scale-[0.98] transition-[background-color,transform] cursor-pointer"
                    >
                      <span>View my ticket</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {isLayoutOpen && (
        <EventLayoutModal
          isOpen={isLayoutOpen}
          onClose={() => setLayoutOpen(false)}
          title="Venue Layout"
          layoutType={event.layoutType}
          venueName={event.venueName || event.venue?.name}
        />
      )}
    </div>
  );
};

const SECTION_LABEL_CLASS =
  "text-[18px] sm:text-[20px] font-extrabold uppercase leading-none tracking-[0.12em] text-[var(--color-hairline)] text-center select-none";

type EventLayoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  layoutType?: "CLUB" | "Lounge" | "PROSCENIUM";
  venueName?: string;
};

const EventLayoutModal: React.FC<EventLayoutModalProps> = ({
  isOpen,
  onClose,
  title,
  layoutType,
  venueName,
}) => {
  const [zoom, setZoom] = useState(1);
  const isClub = layoutType !== "PROSCENIUM";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="!max-w-6xl p-4 sm:p-6">
      <div className="min-w-0 space-y-4 text-[var(--color-hairline)]">
        <div className="flex items-center justify-between gap-3 text-[13px] text-[var(--color-hairline)]">
          <span>{isClub ? `Venue Floor Plan — ${venueName || "Club"}` : "Acoustic Hall Proscenium Layout"}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.1).toFixed(2))))}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--color-ink)] border border-[var(--color-brand-hover)]/50 flex items-center justify-center text-[var(--color-hairline)] hover:bg-[var(--color-brand-hover)]/40 cursor-pointer active:scale-[0.96] transition-[background-color,transform] duration-150"
              aria-label="Zoom out floor map"
            >
              <Minus className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <span className="num text-[12px] text-[var(--color-hairline)] w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.2, Number((z + 0.1).toFixed(2))))}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--color-ink)] border border-[var(--color-brand-hover)]/50 flex items-center justify-center text-[var(--color-hairline)] hover:bg-[var(--color-brand-hover)]/40 cursor-pointer active:scale-[0.96] transition-[background-color,transform] duration-150"
              aria-label="Zoom in floor map"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--color-ink)] border border-[var(--color-brand-hover)]/50 flex items-center justify-center text-[var(--color-hairline)] hover:bg-[var(--color-brand-hover)]/40 cursor-pointer active:scale-[0.96] ml-1 transition-[background-color,transform] duration-150"
              aria-label="Reset floor map zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="relative rounded-[14px] bg-[var(--color-ink)]/65 border border-[var(--color-brand-hover)]/50 shadow-card p-4 sm:p-6 overflow-x-auto">
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            className="transition-transform duration-200 min-w-[780px] select-none"
          >
            {isClub ? (
              <div className="max-w-5xl mx-auto space-y-3">
                <div className="grid grid-cols-12 gap-3 items-stretch">
                  <div className="col-span-3 p-3.5 rounded-[10px] bg-[var(--color-ink)]/75 border border-[var(--color-brand-hover)]/50 flex flex-col justify-center text-center">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-hairline)]">
                      W/C · G/W
                    </span>
                    <span className="text-[11px] text-[var(--color-hairline)]/75 mt-0.5">Restrooms</span>
                  </div>

                  <div className="col-span-9 py-5 px-6 rounded-[12px] bg-gradient-to-b from-[var(--color-brand-hover)]/65 to-[var(--color-ink)] border-2 border-[var(--color-hairline)] shadow-card flex items-center justify-center">
                    <div className="num text-[18px] sm:text-[20px] font-extrabold tracking-[0.28em] uppercase text-[var(--color-hairline)]">
                      STAGE
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-3" />
                  <div className="col-span-9 py-1.5 px-4 rounded-[6px] bg-[var(--color-brand-hover)]/25 border border-[var(--color-hairline)]/45 text-center text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--color-hairline)]">
                    Barricade
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-stretch">
                  <div className="col-span-3 flex flex-col justify-between p-3.5 rounded-[12px] bg-gradient-to-b from-[var(--color-ink)] to-[var(--color-ink)] border-2 border-[var(--color-hairline)]/80 shadow-card">
                    <div className="pb-2.5 border-b border-[var(--color-hairline)]/35 space-y-2">
                      <div className="text-[12px] font-extrabold uppercase tracking-wider text-[var(--color-hairline)] text-center">
                        RESTAURANT
                      </div>
                      <div className="py-1.5 px-2.5 rounded-[7px] bg-[var(--color-ink)] border-2 border-dashed border-[var(--color-hairline)] flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-hairline)]">
                        <span>ENTRY GATE</span>
                        <span>→</span>
                      </div>
                    </div>

                    <div className="my-auto py-6 px-3 rounded-[10px] bg-gradient-to-b from-[var(--color-brand-hover)]/45 to-[var(--color-ink)]/85 border-2 border-[var(--color-hairline)]/75 text-center space-y-1 shadow-card">
                      <div className="text-[15px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-hairline)]">
                        RESTAURANT
                      </div>
                      <div className="text-[11px] font-medium text-[var(--color-hairline)] leading-snug">
                        Dining &amp; Lounge Zone
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[var(--color-hairline)]/35">
                      <div className="w-full py-2.5 px-3 rounded-[9px] bg-[var(--color-ink)] border-2 border-dashed border-[var(--color-hairline)] text-center space-y-0.5">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-hairline)]">
                          GATEWAY
                        </div>
                        <div className="text-[12px] font-extrabold uppercase tracking-wider text-[var(--color-hairline)]">
                          ENTRY GATE
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-9 p-4 rounded-[12px] bg-[var(--color-ink)]/80 border border-[var(--color-brand-hover)]/55 relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 bottom-4 top-[240px] w-[calc(33.3333%-1.25rem)] rounded-t-[10px] rounded-br-[10px] bg-[var(--color-ink)] border-t border-r border-[var(--color-hairline)]/60 z-0"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 bottom-4 left-[calc(41.6667%+0.5rem)] h-[76px] rounded-b-[10px] rounded-tl-[10px] bg-[var(--color-ink)] border-b border-l border-r border-[var(--color-hairline)]/60 z-0"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 bottom-[74px] w-[calc(33.3333%-1.25rem)] h-3 bg-[var(--color-ink)] z-0"
                    />

                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="grid grid-cols-12 gap-3 items-stretch">
                        <div className="col-span-4 rounded-[10px] bg-[var(--color-ink)] border border-[var(--color-hairline)]/60 flex items-center justify-center min-h-[296px] p-3">
                          <span className={SECTION_LABEL_CLASS}>SECTION B</span>
                        </div>

                        <div className="col-span-4 rounded-[10px] bg-[var(--color-ink)]/85 border border-dashed border-[var(--color-brand-hover)]/40 flex flex-col items-center justify-center p-4 text-center min-h-[296px]">
                          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-hairline)]">
                            Main Floor
                          </span>
                          <span className="text-[11px] text-[var(--color-hairline)]/75 mt-1">
                            Open Dance &amp; Standing Zone
                          </span>
                        </div>

                        <div className="col-span-4 flex flex-col">
                          <div className="h-[208px] mb-4 rounded-[10px] bg-[var(--color-ink)] border border-[var(--color-hairline)]/60 flex items-center justify-center p-3">
                            <span className={SECTION_LABEL_CLASS}>SECTION C</span>
                          </div>

                          <div className="h-[72px] flex items-center justify-center px-3">
                            <span className={SECTION_LABEL_CLASS}></span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-3 items-stretch">
                        <div className="col-span-3 p-3.5 rounded-[10px] bg-gradient-to-b from-[var(--color-brand-hover)]/75 to-[var(--color-ink)] border-2 border-[var(--color-hairline)] shadow-card flex flex-col items-center justify-center text-center">
                          <div className="text-[17px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-hairline)]">
                            BAR
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-hairline)] mt-0.5">
                            Main Counter
                          </div>
                        </div>

                        <div className="col-span-2 p-3 rounded-[10px] bg-[var(--color-ink)] border border-[var(--color-hairline)]/55 flex flex-col items-center justify-center text-center">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-hairline)]">
                            Emergency Exit
                          </div>
                          <div className="text-[9.5px] text-[var(--color-hairline)] mt-0.5">Center Gate</div>
                        </div>

                        <div className="col-span-7 min-h-[76px] flex items-center justify-center p-3">
                          <span className={SECTION_LABEL_CLASS}>SECTION A</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="mx-auto max-w-lg text-center py-4 px-4 rounded-[12px] bg-gradient-to-b from-[var(--color-brand-hover)]/60 to-[var(--color-ink)] border-2 border-[var(--color-hairline)]">
                  <svg
                    viewBox="0 0 420 24"
                    className="w-full h-5 text-[var(--color-hairline)]"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 20 C 120 3, 300 3, 408 20"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="py-1 num text-[15px] font-extrabold tracking-[0.24em] uppercase text-[var(--color-hairline)]">
                    STAGE
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {["SECTION A", "SECTION B", "SECTION C"].map((section) => (
                    <div
                      key={section}
                      className="h-32 rounded-[12px] bg-[var(--color-ink)]/70 border border-[var(--color-hairline)]/55 flex items-center justify-center p-3"
                    >
                      <span className={SECTION_LABEL_CLASS}>{section}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-[var(--color-hairline)]">
          <strong className="text-[var(--color-hairline)]">SECTION A</strong>,{" "}
          <strong className="text-[var(--color-hairline)]">SECTION B</strong>, and{" "}
          <strong className="text-[var(--color-hairline)]">SECTION C</strong> floor overview.
        </p>
      </div>
    </Modal>
  );
};
