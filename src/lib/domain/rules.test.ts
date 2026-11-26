import assert from "node:assert/strict";
import test from "node:test";
import type { AttendeeInput, EventSection, FnbMenuItem, Seat, Ticket } from "../api/types";
import {
  calculateServerOrderBreakdown,
  computeFnbSettlementSplit,
  formatINR,
  formatTimerClock,
  isTicketExpired,
  partitionTicketsByLifecycle,
  validateAttendeeAgesForSections,
  validateCoupleComposition,
} from "./rules";

const sampleSections: EventSection[] = [
  {
    id: "sec_vip",
    name: "VIP / Stage",
    tier: "VIP",
    price: 1800,
    fnbCredit: 600,
    isAlcoholic: true,
    minAge: 21,
    description: "Front rows",
  },
  {
    id: "sec_gen",
    name: "General",
    tier: "GENERAL",
    price: 1200,
    fnbCredit: 0,
    isAlcoholic: false,
    minAge: 0,
    description: "Balcony",
  },
];

const sampleSeats: Seat[] = [
  {
    id: "s1",
    eventId: "evt_1",
    sectionId: "sec_vip",
    row: "A",
    number: 1,
    label: "A-1",
    tier: "VIP",
    status: "SELECTED_BY_ME",
    x: 1,
    y: 1,
  },
  {
    id: "s2",
    eventId: "evt_1",
    sectionId: "sec_gen",
    row: "E",
    number: 2,
    label: "E-2",
    tier: "GENERAL",
    status: "SELECTED_BY_ME",
    x: 2,
    y: 5,
  },
];

test("calculateServerOrderBreakdown computes base, convenience fee, GST, and F&B credit", () => {
  const result = calculateServerOrderBreakdown("evt_1", sampleSeats, sampleSections, null);
  assert.equal(result.seatCount, 2);
  assert.equal(result.baseAmount, 3000);
  assert.equal(result.convenienceFee, 180); // 6% of 3000
  assert.equal(result.gstAmount, Math.round(180 * 0.18 + 3000 * 0.05)); // 32 + 150 = 182
  assert.equal(result.fnbCreditTotal, 600);
  assert.equal(result.totalPayable, 3000 + 180 + 182);
});

test("validateAttendeeAgesForSections rejects underage attendees in 21+ alcohol zones", () => {
  const attendees: AttendeeInput[] = [
    {
      seatId: "s1",
      seatLabel: "A-1",
      tier: "VIP",
      minAge: 21,
      fullName: "Riya",
      age: 19,
      gender: "FEMALE",
    },
    {
      seatId: "s2",
      seatLabel: "E-2",
      tier: "GENERAL",
      minAge: 0,
      fullName: "Aman",
      age: 17,
      gender: "MALE",
    },
  ];
  const issues = validateAttendeeAgesForSections(attendees, sampleSeats, sampleSections);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].seatId, "s1");
  assert.equal(issues[0].minAge, 21);
});

test("validateAttendeeAgesForSections passes when all ages meet minimum thresholds", () => {
  const attendees: AttendeeInput[] = [
    {
      seatId: "s1",
      seatLabel: "A-1",
      tier: "VIP",
      minAge: 21,
      fullName: "Arjun",
      age: 24,
      gender: "MALE",
    },
    {
      seatId: "s2",
      seatLabel: "E-2",
      tier: "GENERAL",
      minAge: 0,
      fullName: "Pooja",
      age: 16,
      gender: "FEMALE",
    },
  ];
  const issues = validateAttendeeAgesForSections(attendees, sampleSeats, sampleSections);
  assert.equal(issues.length, 0);
});

test("validateCoupleComposition strictly requires 1 Male and 1 Female per pair for COUPLE seats", () => {
  const coupleSeats: Seat[] = [
    {
      id: "c1",
      eventId: "evt_1",
      sectionId: "sec_couple",
      row: "B",
      number: 1,
      label: "B-1",
      tier: "COUPLE",
      status: "SELECTED_BY_ME",
      x: 1,
      y: 2,
    },
    {
      id: "c2",
      eventId: "evt_1",
      sectionId: "sec_couple",
      row: "B",
      number: 2,
      label: "B-2",
      tier: "COUPLE",
      status: "SELECTED_BY_ME",
      x: 2,
      y: 2,
    },
  ];

  // Single seat rejected
  assert.ok(validateCoupleComposition([{ seatId: "c1", gender: "MALE" }], coupleSeats));

  // Two males rejected
  assert.ok(
    validateCoupleComposition(
      [
        { seatId: "c1", gender: "MALE" },
        { seatId: "c2", gender: "MALE" },
      ],
      coupleSeats,
    ),
  );

  // 1 Male + 1 Female passes
  assert.equal(
    validateCoupleComposition(
      [
        { seatId: "c1", gender: "MALE" },
        { seatId: "c2", gender: "FEMALE" },
      ],
      coupleSeats,
    ),
    null,
  );
});

test("partitionTicketsByLifecycle sorts incoming soonest-first and moves scanned/expired to used", () => {
  const baseTicket = {
    barCode: "BAR-1111",
    orderId: "ord_1",
    eventId: "evt_1",
    eventTitle: "Show",
    venueName: "Hall",
    dateLabel: "Date",
    gate: "Gate A",
    tier: "VIP" as const,
    sectionName: "VIP",
    seatLabels: ["A-1"],
    foodBalance: 500,
    initialFoodBalance: 500,
    qrToken: "tok",
    checkedInAt: null,
    totalPaid: 1000,
    attendees: [],
    contactEmail: "a@b.com",
    contactPhone: "+91 98204 11220",
  };

  const nowMs = Date.parse("2026-11-20T10:00:00Z");
  const tickets: Ticket[] = [
    {
      ...baseTicket,
      id: "later",
      code: "VNU-2",
      eventStartsAt: "2026-12-05T19:00:00Z",
      expiresAt: "2026-12-06T06:00:00Z",
      checkedIn: false,
    },
    {
      ...baseTicket,
      id: "scanned",
      code: "VNU-3",
      eventStartsAt: "2026-11-25T19:00:00Z",
      expiresAt: "2026-11-26T06:00:00Z",
      checkedIn: true,
    },
    {
      ...baseTicket,
      id: "expired",
      code: "VNU-4",
      eventStartsAt: "2026-11-10T19:00:00Z",
      expiresAt: "2026-11-11T06:00:00Z",
      checkedIn: false,
    },
    {
      ...baseTicket,
      id: "sooner",
      code: "VNU-1",
      eventStartsAt: "2026-11-22T19:00:00Z",
      expiresAt: "2026-11-23T06:00:00Z",
      checkedIn: false,
    },
  ];

  assert.equal(isTicketExpired(tickets[2], nowMs), true);
  assert.equal(isTicketExpired(tickets[3], nowMs), false);

  const { incoming, used } = partitionTicketsByLifecycle(tickets, nowMs);
  assert.deepEqual(
    incoming.map((t) => t.id),
    ["sooner", "later"],
  );
  assert.equal(used.length, 2);
  assert.ok(used.some((t) => t.id === "scanned"));
  assert.ok(used.some((t) => t.id === "expired"));
});

test("computeFnbSettlementSplit deducts from wallet and flags UPI delta when cart exceeds balance", () => {
  const lager: FnbMenuItem = {
    id: "f1",
    name: "Craft Lager",
    category: "Bar",
    price: 450,
    isAlcoholic: true,
  };
  const within = computeFnbSettlementSplit(1000, [{ item: lager, quantity: 2 }]);
  assert.equal(within.cartTotal, 900);
  assert.equal(within.walletDeduction, 900);
  assert.equal(within.upiDeltaRequired, 0);
  assert.equal(within.remainingBalance, 100);
  assert.equal(within.exceedsWallet, false);

  const over = computeFnbSettlementSplit(600, [{ item: lager, quantity: 2 }]);
  assert.equal(over.cartTotal, 900);
  assert.equal(over.walletDeduction, 600);
  assert.equal(over.upiDeltaRequired, 300);
  assert.equal(over.remainingBalance, 0);
  assert.equal(over.exceedsWallet, true);
});

test("formatINR and formatTimerClock format deterministically", () => {
  assert.equal(formatINR(1800), "₹1,800");
  assert.equal(formatTimerClock(522), "08:42");
  assert.equal(formatTimerClock(-5), "00:00");
});
