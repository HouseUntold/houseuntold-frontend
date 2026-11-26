import type { AttendeeInput, EventSection, FnbMenuItem, Seat, ServerOrderBreakdown, Ticket } from "../api/types";

/**
 * Pure server-side order breakdown calculation.
 * Never called in UI components—only invoked inside MockApi / Go backend services.
 */
export function calculateServerOrderBreakdown(
  eventId: string,
  selectedSeats: Seat[],
  sections: EventSection[],
  holdExpiresAt: string | null = null,
): ServerOrderBreakdown {
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  let baseAmount = 0;
  let fnbCreditTotal = 0;

  for (const seat of selectedSeats) {
    const sec = sectionMap.get(seat.sectionId);
    if (sec) {
      baseAmount += sec.price;
      fnbCreditTotal += sec.fnbCredit;
    }
  }

  // 6% venue & platform convenience fee, 18% GST on convenience fee + 5% entertainment levy
  const convenienceFee = selectedSeats.length > 0 ? Math.round(baseAmount * 0.06) : 0;
  const gstAmount = selectedSeats.length > 0 ? Math.round(convenienceFee * 0.18 + baseAmount * 0.05) : 0;
  const totalPayable = baseAmount + convenienceFee + gstAmount;

  return {
    eventId,
    seatIds: selectedSeats.map((s) => s.id),
    seatCount: selectedSeats.length,
    baseAmount,
    convenienceFee,
    gstAmount,
    fnbCreditTotal,
    totalPayable,
    holdExpiresAt,
  };
}

export interface AgeValidationIssue {
  seatId: string;
  seatLabel: string;
  minAge: number;
  providedAge: number;
  message: string;
}

/**
 * Validates attendee ages against each selected seat's section minimum age rule.
 */
export function validateAttendeeAgesForSections(
  attendees: AttendeeInput[],
  seats: Seat[],
  sections: EventSection[],
): AgeValidationIssue[] {
  const seatMap = new Map(seats.map((s) => [s.id, s]));
  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const issues: AgeValidationIssue[] = [];

  for (const attendee of attendees) {
    const seat = seatMap.get(attendee.seatId);
    if (!seat) continue;
    const section = sectionMap.get(seat.sectionId);
    if (!section || section.minAge <= 0) continue;

    if (attendee.age < section.minAge) {
      issues.push({
        seatId: seat.id,
        seatLabel: seat.label,
        minAge: section.minAge,
        providedAge: attendee.age,
        message: `${section.name} (${seat.label}) requires minimum age ${section.minAge}+ for alcohol zone entry.`,
      });
    }
  }

  return issues;
}

export interface CoupleValidationIssue {
  message: string;
}

/**
 * Enforces Couple zone rule: whenever any COUPLE seats are booked,
 * Couple guests must be booked in pairs of 2 (1 Male + 1 Female).
 */
export function validateCoupleComposition(
  attendees: Array<{ seatId: string; gender?: "MALE" | "FEMALE" | "OTHER" }>,
  seats: Seat[],
): CoupleValidationIssue | null {
  const seatMap = new Map(seats.map((s) => [s.id, s]));
  const coupleAttendees = attendees.filter((a) => seatMap.get(a.seatId)?.tier === "COUPLE");

  if (coupleAttendees.length === 0) {
    return null;
  }

  if (coupleAttendees.length % 2 !== 0) {
    return {
      message: "Couple section bookings require 2 guests (1 Male and 1 Female) per pair.",
    };
  }

  const males = coupleAttendees.filter((a) => a.gender === "MALE").length;
  const females = coupleAttendees.filter((a) => a.gender === "FEMALE").length;
  const expectedPairs = coupleAttendees.length / 2;

  if (males !== expectedPairs || females !== expectedPairs) {
    return {
      message:
        `Couple section strictly requires 1 Male and 1 Female per pair (${expectedPairs} Male, ${expectedPairs} Female).`,
    };
  }

  return null;
}

export interface FnbSettlementSplit {
  cartTotal: number;
  walletDeduction: number;
  upiDeltaRequired: number;
  remainingBalance: number;
  exceedsWallet: boolean;
}

/**
 * Computes atomic F&B settlement split between ticket foodBalance and UPI delta.
 */
export function computeFnbSettlementSplit(
  foodBalance: number,
  cartItems: Array<{ item: FnbMenuItem; quantity: number }>,
): FnbSettlementSplit {
  const cartTotal = cartItems.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  const walletDeduction = Math.min(foodBalance, cartTotal);
  const upiDeltaRequired = Math.max(0, cartTotal - foodBalance);
  const remainingBalance = Math.max(0, foodBalance - walletDeduction);

  return {
    cartTotal,
    walletDeduction,
    upiDeltaRequired,
    remainingBalance,
    exceedsWallet: upiDeltaRequired > 0,
  };
}

export function isTicketExpired(ticket: Pick<Ticket, "expiresAt">, nowMs = Date.now()): boolean {
  if (!ticket.expiresAt) return false;
  const expMs = Date.parse(ticket.expiresAt);
  if (Number.isNaN(expMs)) return false;
  return expMs <= nowMs;
}

export function sortIncomingTicketsByDate(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const aMs = Date.parse(a.eventStartsAt ?? a.expiresAt ?? "") || Number.MAX_SAFE_INTEGER;
    const bMs = Date.parse(b.eventStartsAt ?? b.expiresAt ?? "") || Number.MAX_SAFE_INTEGER;
    return aMs - bMs;
  });
}

export function partitionTicketsByLifecycle(
  tickets: Ticket[],
  nowMs = Date.now(),
): { incoming: Ticket[]; used: Ticket[] } {
  const incoming: Ticket[] = [];
  const used: Ticket[] = [];

  for (const t of tickets) {
    if (t.checkedIn || isTicketExpired(t, nowMs)) {
      used.push(t);
    } else {
      incoming.push(t);
    }
  }

  return {
    incoming: sortIncomingTicketsByDate(incoming),
    used: sortIncomingTicketsByDate(used).reverse(),
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTimerClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
