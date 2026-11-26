import assert from "node:assert/strict";
import test from "node:test";
import { ApiHttpError } from "../../../lib/api/errors";
import { MockApi } from "../../../lib/api/mockApi";
import { AttendeeDetailsFormSchema } from "../../../lib/api/schemas";

test("MockApi throws conflict error on conflictDemo seat and flips it to SOLD", async () => {
  const api = new MockApi();
  await assert.rejects(
    async () => {
      await api.toggleSeatHold("evt_anoushka_strings", "seat_b1_1");
    },
    (err: Error) => err.message.includes("Seat no longer available"),
  );

  const after = await api.getSeatMap("evt_anoushka_strings");
  const conflictSeat = after.seats.find((s) => s.id === "seat_b1_1");
  assert.equal(conflictSeat?.status, "SOLD");
});

test("MockApi atomic checkout marks seats SOLD, enforces RBAC on counter, and deducts F&B wallet via barCode & zero-trust quote", async () => {
  const api = new MockApi();
  await api.loginWithGoogle({ name: "Arjun Mehta", email: "arjun.mehta@gmail.com" });

  const held = await api.toggleSeatHold("evt_anoushka_strings", "seat_a1_3");
  assert.equal(held.breakdown.seatCount, 1);
  assert.ok(held.breakdown.totalPayable > 1800);

  const quoted = await api.quoteSeats("evt_anoushka_strings", ["seat_a1_3"]);
  assert.equal(quoted.totalPayable, held.breakdown.totalPayable);

  const order = await api.initCheckout("evt_anoushka_strings", ["seat_a1_3"]);
  assert.equal(order.currency, "INR");
  assert.equal(order.amountPaise, held.breakdown.totalPayable * 100);

  const ticket = await api.confirmCheckout({
    eventId: "evt_anoushka_strings",
    seatIds: ["seat_a1_3"],
    razorpayOrderId: order.razorpayOrderId,
    paymentMethod: "UPI_QR",
    contactEmail: "test@venu.live",
    contactPhone: "+91 98204 11220",
    attendees: [
      {
        seatId: "seat_a1_3",
        seatLabel: "A-3",
        fullName: "Rohan Sharma",
        age: 26,
        gender: "MALE",
      },
    ],
  });

  assert.equal(ticket.foodBalance, 600);
  assert.ok(ticket.barCode.startsWith("BAR-"));
  assert.deepEqual(ticket.seatLabels, ["A-3"]);

  // Strict RBAC: patron (USER) must be blocked from counter operations
  await assert.rejects(
    async () => {
      await api.settleFnbOrder({
        ticketId: ticket.id,
        items: [{ itemId: "fnb_craft_lager", quantity: 1 }],
      });
    },
    (err: unknown) => err instanceof ApiHttpError && err.status === 403,
  );

  // Bartender signs in via credentials (role assigned by backend)
  const barRes = await api.loginStaffOrAdmin({
    email: "bar04@venu.live",
    password: "bartender-password",
  });
  assert.equal(barRes.requires_mfa, false);

  // Bartender looks up ticket using secret barCode
  const lookup = await api.lookupTicketByBarCode(ticket.barCode);
  assert.equal(lookup.valid, true);
  assert.equal(lookup.ticket?.id, ticket.id);

  // Bartender adds a new menu item without quantity
  const addedItem = await api.addFnbMenuItem({
    name: "Saffron Tonic",
    category: "Zero-Proof",
    price: 250,
    isAlcoholic: false,
  });
  assert.equal(addedItem.price, 250);

  // Zero-trust server quote
  const fnbQuote = await api.quoteFnbOrder({
    ticketId: ticket.id,
    items: [{ itemId: "fnb_craft_lager", quantity: 1 }],
  });
  assert.equal(fnbQuote.cartTotal, 450);
  assert.equal(fnbQuote.walletDeduction, 450);
  assert.equal(fnbQuote.ticketExpired, false);

  // Settle deducts wallet cleanly
  const settled = await api.settleFnbOrder({
    ticketId: ticket.id,
    items: [{ itemId: "fnb_craft_lager", quantity: 1 }],
  });
  assert.equal(settled.ticket.foodBalance, 150);
  assert.equal(settled.transaction.walletDeducted, 450);

  // Expired ticket BAR-5109 is flagged EXPIRED and blocked from redemption
  const expiredLookup = await api.lookupTicketByBarCode("BAR-5109");
  assert.equal(expiredLookup.valid, false);
  assert.equal(expiredLookup.reason, "EXPIRED");
  await assert.rejects(
    () =>
      api.settleFnbOrder({
        ticketId: "tkt_51092",
        items: [{ itemId: addedItem.id, quantity: 1 }],
      }),
    (err: unknown) => err instanceof ApiHttpError && err.status === 409 && err.code === "ticket_expired",
  );
});

test("MockApi enforces Couple 1 Male + 1 Female composition on checkout", async () => {
  const api = new MockApi();
  await api.loginWithGoogle({ name: "Kabir Nair", email: "kabir.nair@gmail.com" });

  await api.toggleSeatHold("evt_virdas_comedy", "com_b1");
  await api.toggleSeatHold("evt_virdas_comedy", "com_b2");
  const order = await api.initCheckout("evt_virdas_comedy", ["com_b1", "com_b2"]);

  // Rejects 2 Males in COUPLE tier
  await assert.rejects(
    () =>
      api.confirmCheckout({
        eventId: "evt_virdas_comedy",
        seatIds: ["com_b1", "com_b2"],
        razorpayOrderId: order.razorpayOrderId,
        paymentMethod: "UPI_QR",
        contactEmail: "kabir.nair@gmail.com",
        contactPhone: "+91 98204 11220",
        attendees: [
          { seatId: "com_b1", seatLabel: "B-1", fullName: "Kabir Nair", age: 25, gender: "MALE" },
          { seatId: "com_b2", seatLabel: "B-2", fullName: "Rohan Das", age: 26, gender: "MALE" },
        ],
      }),
    (err: unknown) => err instanceof ApiHttpError && err.status === 400 && err.code === "couple_composition",
  );

  // Succeeds with 1 Male + 1 Female
  const coupleTicket = await api.confirmCheckout({
    eventId: "evt_virdas_comedy",
    seatIds: ["com_b1", "com_b2"],
    razorpayOrderId: order.razorpayOrderId,
    paymentMethod: "UPI_QR",
    contactEmail: "kabir.nair@gmail.com",
    contactPhone: "+91 98204 11220",
    attendees: [
      { seatId: "com_b1", seatLabel: "B-1", fullName: "Kabir Nair", age: 25, gender: "MALE" },
      { seatId: "com_b2", seatLabel: "B-2", fullName: "Ananya Rao", age: 24, gender: "FEMALE" },
    ],
  });
  assert.equal(coupleTicket.tier, "COUPLE");
  assert.equal(coupleTicket.attendees.length, 2);
});

test("AttendeeDetailsFormSchema rejects unverified phone OTP", () => {
  const parsed = AttendeeDetailsFormSchema.safeParse({
    contactEmail: "arjun@gmail.com",
    contactPhone: "+91 98204 11220",
    phoneOtpVerified: false,
    attendees: [
      {
        seatId: "seat_a1_3",
        seatLabel: "A-3",
        tier: "VIP",
        minAge: 21,
        fullName: "Arjun Mehta",
        age: 25,
        gender: "MALE",
      },
    ],
  });
  assert.equal(parsed.success, false);
});

test("MockApi generates HMAC-signed rotating QR tokens, rejects tampered signatures, and enforces single-scan atomic check-in", async () => {
  const api = new MockApi();
  await api.loginWithGoogle({ name: "Arjun Mehta", email: "arjun.mehta@gmail.com" });

  const qrStatic = await api.getTicketQr("tkt_89421", { rotating: false });
  assert.equal(qrStatic.rotating, false);
  assert.equal(qrStatic.qrToken.split(".").length, 2);

  const qrRotating = await api.getTicketQr("tkt_89421", { rotating: true });
  assert.equal(qrRotating.rotating, true);
  assert.ok((qrRotating.expiresInSeconds ?? 0) >= 1);

  // Switch to Gatekeeper (SCANNER)
  await api.loginStaffOrAdmin({ email: "gate01@venu.live", password: "staff-password" });

  // Valid HMAC rotating token passes backend lookup
  const validScan = await api.lookupTicketByCodeOrJwt(qrRotating.qrToken);
  assert.equal(validScan.valid, true);
  assert.equal(validScan.reason, "VALID");
  assert.equal(validScan.ticket?.id, "tkt_89421");

  // Tampered HMAC signature is rejected with INVALID_SIGNATURE
  const tamperedToken = `${qrRotating.qrToken.split(".")[0]}.forged_signature_xyz`;
  const tamperedScan = await api.lookupTicketByCodeOrJwt(tamperedToken);
  assert.equal(tamperedScan.valid, false);
  assert.equal(tamperedScan.reason, "INVALID_SIGNATURE");

  // First atomic admission succeeds
  const admitted = await api.admitTicket("tkt_89421");
  assert.equal(admitted.checkedIn, true);
  assert.ok(admitted.checkedInAt);

  // Subsequent scan lookup reports ALREADY_CHECKED_IN
  const secondLookup = await api.lookupTicketByCodeOrJwt(qrStatic.qrToken);
  assert.equal(secondLookup.valid, false);
  assert.equal(secondLookup.reason, "ALREADY_CHECKED_IN");

  // Second atomic admit fails with 409 Conflict
  await assert.rejects(
    () => api.admitTicket("tkt_89421"),
    (err: unknown) => err instanceof ApiHttpError && err.status === 409,
  );
});
