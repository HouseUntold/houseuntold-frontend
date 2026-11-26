import seedData from "../../data/data.json";
import {
  calculateServerOrderBreakdown,
  computeFnbSettlementSplit,
  isTicketExpired,
  validateAttendeeAgesForSections,
  validateCoupleComposition,
} from "../domain/rules";
import {
  buildOtpAuthUri,
  computeTicketDigest,
  constantTimeEqual,
  createTicketQrToken,
  generateBase32Secret,
  verifyTicketQrToken,
  verifyTotpWithReplayProtection,
} from "../domain/security";
import { ApiHttpError } from "./errors";
import type { VenuApiProvider } from "./provider";
import {
  AddFnbMenuItemSchema,
  AdminLoginFormSchema,
  AdminMfaInputSchema,
  CheckoutConfirmSchema,
  CreateEventFormSchema,
  CreateStaffUserInputSchema,
  FirebasePhoneAuthInputSchema,
  FnbQuoteRequestSchema,
  FnbSettleRequestSchema,
  GoogleAuthInputSchema,
} from "./schemas";
import type {
  AddFnbMenuItemInput,
  AdminLoginForm,
  AdminMfaEnrollmentResponse,
  AdminMfaInput,
  AdminOverviewStats,
  AuthSession,
  CheckoutConfirmRequest,
  CheckoutInitResponse,
  CreateEventForm,
  CreateStaffUserInput,
  EventStatus,
  FirebasePhoneAuthInput,
  FnbMenuItem,
  FnbQuoteRequest,
  FnbQuoteResponse,
  FnbSettleRequest,
  FnbSettleResponse,
  FnbTransaction,
  GoogleAuthInput,
  RecentScan,
  ScanLookupResult,
  Seat,
  SeatMapResponse,
  ServerOrderBreakdown,
  StaffAdminLoginResponse,
  StaffUserSummary,
  Ticket,
  TicketQrResponse,
  User,
  UserRole,
  VenuEvent,
} from "./types";

interface MockDbState {
  users: User[];
  staffPasswordsByEmail: Record<string, string>;
  currentUserId: string | null;
  accessExpiresAt: string | null;
  pendingMfaUserId: string | null;
  pendingMfaToken: string | null;
  totpSecretsByUserId: Record<string, string>;
  totpCustomEnrolledByUserId: Record<string, boolean>;
  totpLastAcceptedStepByUserId: Record<string, number | null>;
  ticketDigestsById: Record<string, string>;
  ticketOtpSecretsById: Record<string, string>;
  ticketExpiresAtSecById: Record<string, number>;
  refreshGeneration: number;
  events: VenuEvent[];
  seats: Seat[];
  tickets: Ticket[];
  fnbMenu: FnbMenuItem[];
  fnbTransactions: FnbTransaction[];
  recentScans: RecentScan[];
  holdExpiryByEvent: Record<string, string>;
}

const STORAGE_KEY = "venu_mock_state_v5";
const ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
const MOCK_QR_HMAC_SECRET = "venu_hmac_sha256_qr_signing_secret_v1";
const SEEDED_ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

function signTicketOnDemand(
  ticket: Ticket,
  expiresAtSec: number,
  rotatingSecret?: string,
): Ticket {
  const qrToken = createTicketQrToken(
    {
      ticketId: ticket.id,
      orderId: ticket.orderId,
      eventId: ticket.eventId,
      code: ticket.code,
      expiresAtSec,
      rotatingOtpSecret: rotatingSecret,
    },
    MOCK_QR_HMAC_SECRET,
  );
  return { ...ticket, qrToken };
}

function cloneSeed(): MockDbState {
  const raw = JSON.parse(JSON.stringify(seedData)) as Omit<
    MockDbState,
    | "staffPasswordsByEmail"
    | "currentUserId"
    | "holdExpiryByEvent"
    | "accessExpiresAt"
    | "refreshGeneration"
    | "pendingMfaUserId"
    | "pendingMfaToken"
    | "totpSecretsByUserId"
    | "totpCustomEnrolledByUserId"
    | "totpLastAcceptedStepByUserId"
    | "ticketDigestsById"
    | "ticketOtpSecretsById"
    | "ticketExpiresAtSecById"
  >;

  const defaultExpSec = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
  const ticketDigestsById: Record<string, string> = {};
  const ticketOtpSecretsById: Record<string, string> = {};
  const ticketExpiresAtSecById: Record<string, number> = {};

  const signedTickets = raw.tickets.map((t) => {
    const otpSecret = generateBase32Secret();
    const expSec = t.expiresAt ? Math.floor(Date.parse(t.expiresAt) / 1000) : defaultExpSec;
    ticketDigestsById[t.id] = computeTicketDigest(t.id, MOCK_QR_HMAC_SECRET);
    ticketOtpSecretsById[t.id] = otpSecret;
    ticketExpiresAtSecById[t.id] = Number.isFinite(expSec) ? expSec : defaultExpSec;
    return signTicketOnDemand(t, ticketExpiresAtSecById[t.id]);
  });

  const totpSecretsByUserId: Record<string, string> = {};
  const totpLastAcceptedStepByUserId: Record<string, number | null> = {};
  for (const u of raw.users) {
    if (u.role === "ADMIN") {
      totpSecretsByUserId[u.id] = SEEDED_ADMIN_TOTP_SECRET;
      totpLastAcceptedStepByUserId[u.id] = null;
    }
  }

  return {
    ...raw,
    staffPasswordsByEmail: {},
    tickets: signedTickets,
    currentUserId: null,
    accessExpiresAt: null,
    pendingMfaUserId: null,
    pendingMfaToken: null,
    totpSecretsByUserId,
    totpCustomEnrolledByUserId: {},
    totpLastAcceptedStepByUserId,
    ticketDigestsById,
    ticketOtpSecretsById,
    ticketExpiresAtSecById,
    refreshGeneration: 1,
    holdExpiryByEvent: {},
  };
}

function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockApi implements VenuApiProvider {
  private db: MockDbState;

  constructor() {
    this.db = this.loadState();
  }

  private loadState(): MockDbState {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved) as MockDbState;
        }
      } catch {
        // Ignore storage read errors and fall back to seed
      }
    }
    return cloneSeed();
  }

  private saveState(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      } catch {
        // Ignore storage write errors
      }
    }
  }

  private activeUser(): User | null {
    if (!this.db.currentUserId) return null;
    return this.db.users.find((u) => u.id === this.db.currentUserId) ?? null;
  }

  private requireRoles(...allowed: UserRole[]): User {
    const user = this.activeUser();
    if (!user) {
      throw new ApiHttpError(401, "unauthorized", "Authentication required.");
    }
    if (!allowed.includes(user.role)) {
      throw new ApiHttpError(
        403,
        "forbidden",
        `Strict RBAC denied (${user.role}). Required role: ${allowed.join(" or ")}.`,
      );
    }
    return user;
  }

  private issueMockSession(user: User): AuthSession {
    const exp = new Date(Date.now() + ACCESS_TTL_MS).toISOString();
    this.db.currentUserId = user.id;
    this.db.accessExpiresAt = exp;
    this.db.pendingMfaUserId = null;
    this.db.pendingMfaToken = null;
    this.db.refreshGeneration += 1;
    this.saveState();
    return {
      user: { ...user },
      accessExpiresAt: exp,
    };
  }

  getAccessExpiresAt(): string | null {
    return this.db.accessExpiresAt;
  }

  async getCurrentUser(): Promise<User | null> {
    await delay(40);
    const u = this.activeUser();
    return u ? { ...u } : null;
  }

  async refreshSession(): Promise<AuthSession> {
    await delay(70);
    const user = this.activeUser();
    if (!user) {
      throw new ApiHttpError(401, "unauthorized", "No active session to refresh.");
    }
    return this.issueMockSession(user);
  }

  async logout(): Promise<{ loggedOut: boolean }> {
    await delay(60);
    this.db.currentUserId = null;
    this.db.accessExpiresAt = null;
    this.db.pendingMfaUserId = null;
    this.db.pendingMfaToken = null;
    this.saveState();
    return { loggedOut: true };
  }

  async loginWithGoogle(payload: GoogleAuthInput): Promise<AuthSession> {
    await delay(160);
    const parsed = GoogleAuthInputSchema.parse(payload);
    const existing = this.db.users.find(
      (u) => u.email.toLowerCase() === parsed.email.toLowerCase(),
    );
    // Google OAuth always assigns USER patron privileges cleanly
    if (existing && existing.role === "USER") {
      return this.issueMockSession({ ...existing, authProvider: "GOOGLE" });
    }
    const displayName = parsed.name?.trim()
      || parsed.email
        .split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: displayName,
      email: parsed.email,
      phone: "+91 98204 11220",
      phoneVerified: false,
      role: "USER",
      authProvider: "GOOGLE",
      age: 26,
    };
    this.db.users.push(newUser);
    return this.issueMockSession(newUser);
  }

  async loginWithFirebasePhone(payload: FirebasePhoneAuthInput): Promise<AuthSession> {
    await delay(180);
    const parsed = FirebasePhoneAuthInputSchema.parse(payload);
    if (parsed.otpCode && parsed.otpCode === "000000") {
      throw new ApiHttpError(401, "unauthorized", "Invalid Firebase SMS verification code.");
    }

    const normalizedPhone = parsed.phone.replace(/\s+/g, " ").trim();
    const existing = this.db.users.find((u) => u.phone === normalizedPhone && u.role === "USER");
    if (existing) {
      const updated = {
        ...existing,
        name: parsed.name || existing.name,
        phoneVerified: true,
      };
      this.db.users = this.db.users.map((u) => (u.id === existing.id ? updated : u));
      return this.issueMockSession(updated);
    }

    const fallbackEmail = parsed.email && parsed.email.length > 0
      ? parsed.email
      : `guest.${normalizedPhone.replace(/\D/g, "").slice(-6)}@phone.venu.live`;

    const newUser: User = {
      id: `usr_fb_${Date.now()}`,
      name: parsed.name,
      email: fallbackEmail,
      phone: normalizedPhone,
      phoneVerified: true,
      role: "USER",
      authProvider: "FIREBASE_PHONE",
      age: 25,
    };
    this.db.users.push(newUser);
    return this.issueMockSession(newUser);
  }

  /**
   * Unified Backend-Driven Staff / login:
   * - Client never selects a role.
   * - USER accounts are rejected (403) — patrons use Google OAuth.
   * - ADMIN accounts return { requires_mfa: true, mfa_challenge_token }.
   * - SCANNER & BARTENDER staff receive immediate JWT session with DB-assigned role.
   */
  async loginStaffOrAdmin(payload: AdminLoginForm): Promise<StaffAdminLoginResponse> {
    await delay(180);
    const parsed = AdminLoginFormSchema.parse(payload);
    const matched = this.db.users.find(
      (u) => u.email.toLowerCase() === parsed.email.toLowerCase(),
    );
    if (!matched) {
      throw new ApiHttpError(401, "unauthorized", "Invalid operator email or password.");
    }
    if (matched.role === "USER") {
      throw new ApiHttpError(
        403,
        "forbidden",
        "Patron accounts must sign in using Continue with Google.",
      );
    }
    const customPassword = this.db.staffPasswordsByEmail?.[parsed.email.toLowerCase()];
    if (customPassword !== undefined) {
      if (parsed.password !== customPassword) {
        throw new ApiHttpError(401, "unauthorized", "Invalid operator email or password.");
      }
    } else if (parsed.password === "wrongpass") {
      throw new ApiHttpError(401, "unauthorized", "Invalid operator email or password.");
    }

    if (matched.role === "ADMIN") {
      const mfaToken = `mfa_chal_${Date.now()}_${matched.id}`;
      this.db.pendingMfaUserId = matched.id;
      this.db.pendingMfaToken = mfaToken;
      this.saveState();
      return {
        requires_mfa: true,
        mfa_challenge_token: mfaToken,
      };
    }

    const session = this.issueMockSession({ ...matched, authProvider: "LOCAL_ADMIN" });
    return {
      requires_mfa: false,
      user: session.user,
      accessExpiresAt: session.accessExpiresAt,
    };
  }

  async verifyAdminMfa(payload: AdminMfaInput): Promise<AuthSession> {
    await delay(160);
    const parsed = AdminMfaInputSchema.parse(payload);
    if (
      !this.db.pendingMfaToken
      || !this.db.pendingMfaUserId
      || parsed.mfa_challenge_token !== this.db.pendingMfaToken
    ) {
      throw new ApiHttpError(401, "unauthorized", "MFA challenge expired or invalid.");
    }
    const admin = this.db.users.find(
      (u) => u.id === this.db.pendingMfaUserId && u.role === "ADMIN",
    );
    if (!admin) {
      throw new ApiHttpError(403, "forbidden", "Admin role verification failed.");
    }

    const secret = this.db.totpSecretsByUserId[admin.id] ?? SEEDED_ADMIN_TOTP_SECRET;
    const lastStep = this.db.totpLastAcceptedStepByUserId[admin.id] ?? null;
    const isCustomEnrolled = Boolean(this.db.totpCustomEnrolledByUserId[admin.id]);
    const nowMs = Date.now();
    const currentStep = Math.floor(nowMs / 1000 / 30);

    const verifyRes = verifyTotpWithReplayProtection(secret, parsed.totp_code, lastStep, nowMs);
    if (verifyRes.ok) {
      this.db.totpLastAcceptedStepByUserId[admin.id] = verifyRes.matchedStep;
      this.saveState();
      return this.issueMockSession({ ...admin, authProvider: "LOCAL_ADMIN" });
    }

    if (verifyRes.reason === "REPLAYED_CODE") {
      throw new ApiHttpError(
        401,
        "totp_reused",
        "TOTP code already used; wait for the next 30-second code.",
      );
    }

    // Before custom enrollment, also allow demo code '420911' ONCE per 30-second step
    if (!isCustomEnrolled && parsed.totp_code === "420911") {
      if (lastStep !== null && currentStep <= lastStep) {
        throw new ApiHttpError(
          401,
          "totp_reused",
          "TOTP code already used; wait for the next 30-second code.",
        );
      }
      this.db.totpLastAcceptedStepByUserId[admin.id] = currentStep;
      this.saveState();
      return this.issueMockSession({ ...admin, authProvider: "LOCAL_ADMIN" });
    }

    throw new ApiHttpError(401, "unauthorized", "Invalid 6-digit authenticator TOTP code.");
  }

  async enrollAdminMfa(): Promise<AdminMfaEnrollmentResponse> {
    const admin = this.requireRoles("ADMIN");
    await delay(140);
    const secret = generateBase32Secret(20);
    this.db.totpSecretsByUserId[admin.id] = secret;
    this.db.totpCustomEnrolledByUserId[admin.id] = true;
    this.db.totpLastAcceptedStepByUserId[admin.id] = null;
    this.saveState();

    return {
      otpauthUri: buildOtpAuthUri("House Untold", admin.email, secret),
      secret,
      issuer: "House Untold",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    };
  }

  async sendPhoneOtp(phone: string): Promise<{ sent: boolean; maskedPhone: string }> {
    await delay(160);
    const cleaned = phone.trim();
    const last4 = cleaned.slice(-4);
    return { sent: true, maskedPhone: `•••• ••${last4}` };
  }

  async verifyPhoneOtp(_phone: string, otp: string): Promise<{ verified: boolean }> {
    await delay(140);
    if (otp.trim().length !== 6 || otp.trim() === "000000") {
      throw new ApiHttpError(400, "invalid_otp", "Enter a valid 6-digit Firebase SMS OTP code.");
    }
    return { verified: true };
  }

  async listEvents(): Promise<VenuEvent[]> {
    await delay(80);
    return this.db.events.map((e) => ({ ...e }));
  }

  async getEventById(eventId: string): Promise<VenuEvent> {
    await delay(80);
    const event = this.db.events.find((e) => e.id === eventId);
    if (!event) {
      throw new ApiHttpError(404, "not_found", "Event not found");
    }
    return { ...event };
  }

  private buildSeatMapResponse(eventId: string): SeatMapResponse {
    const event = this.db.events.find((e) => e.id === eventId);
    if (!event) {
      throw new ApiHttpError(404, "not_found", "Event not found");
    }
    const seats = this.db.seats.filter((s) => s.eventId === eventId).map((s) => ({ ...s }));
    const selectedSeats = seats.filter((s) => s.status === "SELECTED_BY_ME");
    const holdExpiresAt = selectedSeats.length > 0
      ? this.db.holdExpiryByEvent[eventId] ?? new Date(Date.now() + 9 * 60 * 1000).toISOString()
      : null;

    if (selectedSeats.length > 0 && !this.db.holdExpiryByEvent[eventId]) {
      this.db.holdExpiryByEvent[eventId] = holdExpiresAt!;
    }

    const breakdown = calculateServerOrderBreakdown(
      eventId,
      selectedSeats,
      event.sections,
      holdExpiresAt,
    );

    return {
      event: { ...event },
      seats,
      breakdown,
    };
  }

  async getSeatMap(eventId: string): Promise<SeatMapResponse> {
    await delay(100);
    return this.buildSeatMapResponse(eventId);
  }

  async toggleSeatHold(eventId: string, seatId: string): Promise<SeatMapResponse> {
    await delay(140);
    const seatIdx = this.db.seats.findIndex((s) => s.eventId === eventId && s.id === seatId);
    if (seatIdx === -1) {
      throw new ApiHttpError(404, "not_found", "Seat not found");
    }
    const seat = this.db.seats[seatIdx];

    if (seat.conflictDemo && seat.status === "AVAILABLE") {
      this.db.seats[seatIdx] = { ...seat, status: "SOLD", conflictDemo: false };
      this.saveState();
      throw new ApiHttpError(409, "conflict", "Seat no longer available — just booked by another guest.");
    }

    if (seat.status === "SOLD" || seat.status === "HELD") {
      throw new ApiHttpError(409, "conflict", "Seat no longer available.");
    }

    if (seat.status === "SELECTED_BY_ME") {
      this.db.seats[seatIdx] = { ...seat, status: "AVAILABLE" };
    } else {
      const currentSelected = this.db.seats.filter(
        (s) => s.eventId === eventId && s.status === "SELECTED_BY_ME",
      );
      if (currentSelected.length >= 12) {
        throw new ApiHttpError(400, "bad_request", "Maximum 12 seats per order.");
      }
      this.db.seats[seatIdx] = { ...seat, status: "SELECTED_BY_ME" };
      if (!this.db.holdExpiryByEvent[eventId]) {
        this.db.holdExpiryByEvent[eventId] = new Date(Date.now() + 9 * 60 * 1000).toISOString();
      }
    }

    const remainingSelected = this.db.seats.filter(
      (s) => s.eventId === eventId && s.status === "SELECTED_BY_ME",
    );
    if (remainingSelected.length === 0) {
      delete this.db.holdExpiryByEvent[eventId];
    }

    this.saveState();
    return this.buildSeatMapResponse(eventId);
  }

  async clearSeatHolds(eventId: string): Promise<SeatMapResponse> {
    await delay(80);
    this.db.seats = this.db.seats.map((s) =>
      s.eventId === eventId && s.status === "SELECTED_BY_ME" ? { ...s, status: "AVAILABLE" } : s
    );
    delete this.db.holdExpiryByEvent[eventId];
    this.saveState();
    return this.buildSeatMapResponse(eventId);
  }

  async quoteSeats(eventId: string, seatIds: string[]): Promise<ServerOrderBreakdown> {
    await delay(60);
    const event = this.db.events.find((e) => e.id === eventId);
    if (!event) {
      throw new ApiHttpError(404, "not_found", "Event not found");
    }
    const selectedSeats = this.db.seats.filter(
      (s) => s.eventId === eventId && seatIds.includes(s.id),
    );
    return calculateServerOrderBreakdown(
      eventId,
      selectedSeats,
      event.sections,
      this.db.holdExpiryByEvent[eventId] ?? null,
    );
  }

  async initCheckout(eventId: string, seatIds: string[]): Promise<CheckoutInitResponse> {
    await delay(150);
    const event = this.db.events.find((e) => e.id === eventId);
    if (!event) {
      throw new ApiHttpError(404, "not_found", "Event not found");
    }
    const selectedSeats = this.db.seats.filter(
      (s) => s.eventId === eventId && seatIds.includes(s.id),
    );
    if (selectedSeats.length === 0) {
      throw new ApiHttpError(400, "bad_request", "Select at least one seat before checkout.");
    }
    const breakdown = calculateServerOrderBreakdown(
      eventId,
      selectedSeats,
      event.sections,
      this.db.holdExpiryByEvent[eventId] ?? new Date(Date.now() + 9 * 60 * 1000).toISOString(),
    );

    return {
      razorpayOrderId: `order_VNU_${Date.now().toString().slice(-6)}`,
      amountPaise: breakdown.totalPayable * 100,
      currency: "INR",
      breakdown,
    };
  }

  async confirmCheckout(payload: CheckoutConfirmRequest): Promise<Ticket> {
    await delay(280);
    const parsed = CheckoutConfirmSchema.parse(payload);
    const eventIdx = this.db.events.findIndex((e) => e.id === parsed.eventId);
    if (eventIdx === -1) {
      throw new ApiHttpError(404, "not_found", "Event not found");
    }
    const event = this.db.events[eventIdx];
    const selectedSeats = this.db.seats.filter(
      (s) => s.eventId === parsed.eventId && parsed.seatIds.includes(s.id),
    );
    if (selectedSeats.length !== parsed.seatIds.length) {
      throw new ApiHttpError(409, "conflict", "One or more selected seats could not be locked.");
    }

    const ageIssues = validateAttendeeAgesForSections(
      parsed.attendees.map((a) => {
        const seat = selectedSeats.find((s) => s.id === a.seatId);
        const sec = event.sections.find((secItem) => secItem.id === seat?.sectionId);
        return {
          ...a,
          gender: a.gender ?? "OTHER",
          tier: seat?.tier ?? "GENERAL",
          minAge: sec?.minAge ?? 0,
        };
      }),
      selectedSeats,
      event.sections,
    );
    if (ageIssues.length > 0) {
      throw new ApiHttpError(400, "age_compliance", ageIssues[0].message);
    }

    const coupleIssue = validateCoupleComposition(parsed.attendees, selectedSeats);
    if (coupleIssue) {
      throw new ApiHttpError(400, "couple_composition", coupleIssue.message);
    }

    const breakdown = calculateServerOrderBreakdown(parsed.eventId, selectedSeats, event.sections);

    this.db.seats = this.db.seats.map((s) =>
      s.eventId === parsed.eventId && parsed.seatIds.includes(s.id) ? { ...s, status: "SOLD" } : s
    );
    delete this.db.holdExpiryByEvent[parsed.eventId];

    this.db.events[eventIdx] = {
      ...event,
      bookedSeats: event.bookedSeats + selectedSeats.length,
      grossRevenue: event.grossRevenue + breakdown.totalPayable,
    };

    const primaryTier = selectedSeats[0].tier;
    const primarySection = event.sections.find((sec) => sec.id === selectedSeats[0].sectionId);
    const randomSuffix = Math.floor(10000 + Math.random() * 89999);
    const code = `VNU-${randomSuffix}-${primaryTier.slice(0, 3)}`;
    const barCode = `BAR-${Math.floor(1000 + Math.random() * 8999)}`;
    const ticketId = `tkt_${randomSuffix}`;

    const startsMs = event.startsAt ? Date.parse(event.startsAt) : NaN;
    const expiresDate = Number.isFinite(startsMs)
      ? new Date(startsMs + 10.5 * 3600 * 1000)
      : new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const expiresAtSec = Math.floor(expiresDate.getTime() / 1000);
    const otpSecret = generateBase32Secret(20);

    this.db.ticketDigestsById[ticketId] = computeTicketDigest(ticketId, MOCK_QR_HMAC_SECRET);
    this.db.ticketOtpSecretsById[ticketId] = otpSecret;
    this.db.ticketExpiresAtSecById[ticketId] = expiresAtSec;

    const baseTicket: Ticket = {
      id: ticketId,
      code,
      barCode,
      orderId: parsed.razorpayOrderId,
      eventId: event.id,
      eventTitle: event.title,
      category: event.category,
      venueName: event.venueName,
      dateLabel: `${event.dateLabel} · ${event.timeLabel}`,
      eventStartsAt: event.startsAt,
      expiresAt: expiresDate.toISOString(),
      gate: primaryTier === "VIP" ? "Gate A · VIP Express" : "Gate B · Main Hall",
      tier: primaryTier,
      sectionName: primarySection?.name ?? primaryTier,
      seatLabels: selectedSeats.map((s) => s.label),
      foodBalance: breakdown.fnbCreditTotal,
      initialFoodBalance: breakdown.fnbCreditTotal,
      qrToken: "",
      checkedIn: false,
      checkedInAt: null,
      totalPaid: breakdown.totalPayable,
      attendees: parsed.attendees.map((a) => ({
        ...a,
        gender: a.gender ?? "MALE",
        admitted: false,
      })),
      contactEmail: parsed.contactEmail,
      contactPhone: parsed.contactPhone,
    };

    const newTicket = signTicketOnDemand(baseTicket, expiresAtSec);
    this.db.tickets.unshift(newTicket);
    this.saveState();
    return { ...newTicket };
  }

  async listTickets(): Promise<Ticket[]> {
    await delay(80);
    return this.db.tickets.map((t) => {
      const exp = this.db.ticketExpiresAtSecById[t.id] ?? Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      return signTicketOnDemand(t, exp);
    });
  }

  async getTicketQr(ticketId: string, options?: { rotating?: boolean }): Promise<TicketQrResponse> {
    this.requireRoles("USER", "ADMIN", "SCANNER", "BARTENDER");
    await delay(60);
    const tkt = this.db.tickets.find((t) => t.id === ticketId);
    if (!tkt) {
      throw new ApiHttpError(404, "not_found", "Ticket not found");
    }
    const exp = this.db.ticketExpiresAtSecById[tkt.id] ?? Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    const useRotating = Boolean(options?.rotating);
    let rotSecret: string | undefined;
    if (useRotating) {
      if (!this.db.ticketOtpSecretsById[tkt.id]) {
        this.db.ticketOtpSecretsById[tkt.id] = generateBase32Secret(20);
        this.saveState();
      }
      rotSecret = this.db.ticketOtpSecretsById[tkt.id];
    }

    const signed = signTicketOnDemand(tkt, exp, rotSecret);
    const remainingSec = 30 - (Math.floor(Date.now() / 1000) % 30);
    return {
      ticketId: tkt.id,
      code: tkt.code,
      qrToken: signed.qrToken,
      rotating: useRotating,
      ...(useRotating ? { expiresInSeconds: remainingSec } : {}),
    };
  }

  async lookupTicketByCodeOrJwt(query: string): Promise<ScanLookupResult> {
    this.requireRoles("ADMIN", "SCANNER");
    await delay(100);
    const cleaned = query.trim();
    if (!cleaned) {
      return { valid: false, reason: "NOT_FOUND", ticket: null };
    }

    const nowMs = Date.now();
    let ticket: Ticket | undefined;

    if (cleaned.includes(".")) {
      const verified = verifyTicketQrToken(cleaned, MOCK_QR_HMAC_SECRET, nowMs);
      if (!verified.ok) {
        return {
          valid: false,
          reason: verified.reason === "EXPIRED" ? "EXPIRED" : "INVALID_SIGNATURE",
          ticket: null,
        };
      }
      const expectedDigest = computeTicketDigest(verified.payload.ticket_id, MOCK_QR_HMAC_SECRET);
      ticket = this.db.tickets.find((t) => {
        const storedDigest = this.db.ticketDigestsById[t.id] ?? computeTicketDigest(t.id, MOCK_QR_HMAC_SECRET);
        return constantTimeEqual(storedDigest, expectedDigest);
      });
      if (!ticket) {
        return { valid: false, reason: "INVALID_SIGNATURE", ticket: null };
      }
      if (verified.payload.rot) {
        const rotSecret = this.db.ticketOtpSecretsById[ticket.id];
        if (!rotSecret) {
          return { valid: false, reason: "ROTATING_QR_EXPIRED", ticket: null };
        }
        const rotCheck = verifyTotpWithReplayProtection(
          rotSecret,
          verified.payload.rot,
          null,
          nowMs,
        );
        if (!rotCheck.ok) {
          return { valid: false, reason: "ROTATING_QR_EXPIRED", ticket: { ...ticket } };
        }
      }
    } else {
      ticket = this.db.tickets.find(
        (t) => t.code.toLowerCase() === cleaned.toLowerCase(),
      );
      if (!ticket) {
        return { valid: false, reason: "INVALID_SIGNATURE", ticket: null };
      }
    }

    const expSec = this.db.ticketExpiresAtSecById[ticket.id];
    if (expSec && expSec <= Math.floor(nowMs / 1000)) {
      return { valid: false, reason: "EXPIRED", ticket: { ...ticket } };
    }

    if (ticket.checkedIn) {
      return { valid: false, reason: "ALREADY_CHECKED_IN", ticket: { ...ticket } };
    }
    return { valid: true, reason: "VALID", ticket: { ...ticket } };
  }

  async admitTicket(ticketId: string, seatId?: string): Promise<Ticket> {
    this.requireRoles("ADMIN", "SCANNER");
    await delay(140);
    const idx = this.db.tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) {
      throw new ApiHttpError(404, "not_found", "Ticket not found");
    }
    const ticket = this.db.tickets[idx];
    if (ticket.checkedIn) {
      throw new ApiHttpError(
        409,
        "already_checked_in",
        "Ticket has already been scanned and admitted.",
      );
    }

    const updatedAttendees = ticket.attendees.map((att) =>
      !seatId || att.seatId === seatId ? { ...att, admitted: true } : att
    );
    const allAdmitted = updatedAttendees.every((att) => att.admitted);

    const updated: Ticket = {
      ...ticket,
      attendees: updatedAttendees,
      checkedIn: allAdmitted,
      checkedInAt: allAdmitted ? new Date().toISOString() : ticket.checkedInAt,
    };
    this.db.tickets[idx] = updated;

    const evtIdx = this.db.events.findIndex((e) => e.id === ticket.eventId);
    if (evtIdx !== -1) {
      this.db.events[evtIdx] = {
        ...this.db.events[evtIdx],
        admittedToday: this.db.events[evtIdx].admittedToday + (seatId ? 1 : ticket.attendees.length),
      };
    }

    const timeStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    this.db.recentScans.unshift({
      id: `scan_${Date.now()}`,
      ticketCode: updated.code,
      patronName: updated.attendees.map((a) => a.fullName).join(", "),
      tier: updated.tier,
      seatLabel: updated.seatLabels.join(", "),
      status: "VALID_ADMITTED",
      scannedAt: timeStr,
    });

    this.saveState();
    return { ...updated };
  }

  async listRecentScans(): Promise<RecentScan[]> {
    this.requireRoles("ADMIN", "SCANNER");
    await delay(70);
    return [...this.db.recentScans];
  }

  async listFnbMenu(): Promise<FnbMenuItem[]> {
    await delay(70);
    return [...this.db.fnbMenu];
  }

  async addFnbMenuItem(payload: AddFnbMenuItemInput): Promise<FnbMenuItem> {
    this.requireRoles("ADMIN", "BARTENDER");
    await delay(140);
    const parsed = AddFnbMenuItemSchema.parse(payload);
    const created: FnbMenuItem = {
      id: `fnb_${Date.now().toString().slice(-6)}`,
      name: parsed.name.trim(),
      category: parsed.category,
      price: parsed.price,
      isAlcoholic: parsed.isAlcoholic,
    };
    this.db.fnbMenu.push(created);
    this.saveState();
    return { ...created };
  }

  async lookupTicketByBarCode(barCode: string): Promise<ScanLookupResult> {
    this.requireRoles("ADMIN", "BARTENDER");
    await delay(100);
    const cleaned = barCode.trim().toLowerCase();
    if (!cleaned) {
      return { valid: false, reason: "NOT_FOUND", ticket: null };
    }
    const ticket = this.db.tickets.find(
      (t) =>
        (t.barCode && t.barCode.toLowerCase() === cleaned)
        || t.code.toLowerCase() === cleaned
        || t.id.toLowerCase() === cleaned,
    );
    if (!ticket) {
      return { valid: false, reason: "NOT_FOUND", ticket: null };
    }
    if (isTicketExpired(ticket)) {
      return { valid: false, reason: "EXPIRED", ticket: { ...ticket } };
    }
    return { valid: true, reason: "VALID", ticket: { ...ticket } };
  }

  async quoteFnbOrder(payload: FnbQuoteRequest): Promise<FnbQuoteResponse> {
    this.requireRoles("ADMIN", "BARTENDER");
    await delay(60);
    const parsed = FnbQuoteRequestSchema.parse(payload);
    const ticket = parsed.ticketId
      ? this.db.tickets.find((t) => t.id === parsed.ticketId)
      : undefined;

    if (parsed.ticketId && !ticket) {
      throw new ApiHttpError(404, "not_found", "Ticket pass not found");
    }
    const expired = ticket ? isTicketExpired(ticket) : false;

    const cartEntries = parsed.items.map((entry) => {
      const menuItem = this.db.fnbMenu.find((m) => m.id === entry.itemId);
      if (!menuItem) {
        throw new ApiHttpError(400, "bad_request", `Unknown F&B item: ${entry.itemId}`);
      }
      return { item: menuItem, quantity: entry.quantity };
    });

    const walletBalance = ticket && !expired ? ticket.foodBalance : 0;
    const split = computeFnbSettlementSplit(walletBalance, cartEntries);
    return {
      ...split,
      ticketExpired: expired,
    };
  }

  async listFnbTransactions(): Promise<FnbTransaction[]> {
    this.requireRoles("ADMIN", "BARTENDER");
    await delay(70);
    return [...this.db.fnbTransactions];
  }

  async settleFnbOrder(payload: FnbSettleRequest): Promise<FnbSettleResponse> {
    const bartender = this.requireRoles("ADMIN", "BARTENDER");
    await delay(180);
    const parsed = FnbSettleRequestSchema.parse(payload);
    const tktIdx = this.db.tickets.findIndex((t) => t.id === parsed.ticketId);
    if (tktIdx === -1) {
      throw new ApiHttpError(404, "not_found", "Ticket pass not found");
    }
    const ticket = this.db.tickets[tktIdx];
    if (isTicketExpired(ticket)) {
      throw new ApiHttpError(
        409,
        "ticket_expired",
        "Ticket has expired and F&B wallet credits are no longer redeemable.",
      );
    }

    const cartEntries = parsed.items.map((entry) => {
      const menuItem = this.db.fnbMenu.find((m) => m.id === entry.itemId);
      if (!menuItem) {
        throw new ApiHttpError(400, "bad_request", `Unknown F&B item: ${entry.itemId}`);
      }
      return { item: menuItem, quantity: entry.quantity };
    });

    const split = computeFnbSettlementSplit(ticket.foodBalance, cartEntries);
    if (split.exceedsWallet && !parsed.upiDeltaConfirmed) {
      throw new ApiHttpError(
        409,
        "upi_delta_required",
        `Cart exceeds wallet by ₹${split.upiDeltaRequired}. Confirm UPI delta payment to settle.`,
      );
    }

    const updatedTicket: Ticket = {
      ...ticket,
      foodBalance: split.remainingBalance,
    };
    this.db.tickets[tktIdx] = updatedTicket;

    const tx: FnbTransaction = {
      id: `fnbt_${Date.now()}`,
      ticketId: ticket.id,
      ticketCode: ticket.code,
      patronName: ticket.attendees[0]?.fullName ?? "Guest",
      itemsSummary: cartEntries.map((e) => `${e.quantity}x ${e.item.name}`).join(", "),
      totalAmount: split.cartTotal,
      walletDeducted: split.walletDeduction,
      upiDeltaPaid: split.upiDeltaRequired,
      bartenderName: bartender.name,
      createdAt: new Date().toISOString(),
    };
    this.db.fnbTransactions.unshift(tx);
    this.saveState();

    return {
      ticket: { ...updatedTicket },
      transaction: { ...tx },
    };
  }

  async getAdminStats(): Promise<AdminOverviewStats> {
    this.requireRoles("ADMIN");
    await delay(90);
    const activeEvents = this.db.events.filter((e) => e.status !== "DRAFT").length;
    const seatsBooked = this.db.events.reduce((sum, e) => sum + e.bookedSeats, 0);
    const totalSeatsCapacity = this.db.events.reduce((sum, e) => sum + e.totalSeats, 0);
    const grossTicketRevenue = this.db.events.reduce((sum, e) => sum + e.grossRevenue, 0);
    const gateAdmittedToday = this.db.events.reduce((sum, e) => sum + e.admittedToday, 0);
    return {
      activeEvents,
      seatsBooked,
      totalSeatsCapacity,
      grossTicketRevenue,
      gateAdmittedToday,
    };
  }

  async updateEventStatus(eventId: string, status: EventStatus): Promise<VenuEvent> {
    this.requireRoles("ADMIN");
    await delay(120);
    const idx = this.db.events.findIndex((e) => e.id === eventId);
    if (idx === -1) {
      throw new ApiHttpError(404, "not_found", "Event not found");
    }
    this.db.events[idx] = { ...this.db.events[idx], status };
    this.saveState();
    return { ...this.db.events[idx] };
  }

  async listStaffUsers(): Promise<StaffUserSummary[]> {
    this.requireRoles("ADMIN");
    await delay(70);
    return this.db.users
      .filter((u) => u.role === "SCANNER" || u.role === "BARTENDER")
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as "SCANNER" | "BARTENDER",
      }));
  }

  async createStaffUser(payload: CreateStaffUserInput): Promise<StaffUserSummary> {
    this.requireRoles("ADMIN");
    await delay(160);
    const parsed = CreateStaffUserInputSchema.parse(payload);
    const existing = this.db.users.find(
      (u) => u.email.toLowerCase() === parsed.email.toLowerCase(),
    );
    if (existing) {
      throw new ApiHttpError(409, "conflict", "An account with this email already exists.");
    }
    const newUser: User = {
      id: `usr_staff_${Date.now().toString().slice(-6)}`,
      name: parsed.name.trim(),
      email: parsed.email.trim(),
      phone: "+91 98200 00000",
      phoneVerified: true,
      role: parsed.role,
      authProvider: "LOCAL_ADMIN",
      age: 28,
    };
    this.db.users.unshift(newUser);
    this.db.staffPasswordsByEmail[parsed.email.toLowerCase()] = parsed.password;
    this.saveState();
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: parsed.role,
    };
  }

  async createEvent(payload: CreateEventForm): Promise<VenuEvent> {
    this.requireRoles("ADMIN");
    await delay(180);
    const parsed = CreateEventFormSchema.parse(payload);
    const id = `evt_${Date.now().toString().slice(-6)}`;
    const newEvent: VenuEvent = {
      id,
      slug: parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: parsed.title,
      subtitle: parsed.subtitle,
      category: parsed.category,
      dateLabel: parsed.dateLabel,
      timeLabel: parsed.timeLabel,
      startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      doorsOpenLabel: "Doors open 45m prior",
      venueName: parsed.venueName,
      venueCity: "Mumbai",
      venueAddress: `${parsed.venueName}, Mumbai`,
      transitNote: "Valet & ride-share bay available at Main Gate",
      layoutType: parsed.layoutType,
      status: "ON_SALE",
      imageUrl: parsed.layoutType === "CLUB"
        ? "/src/assets/images/event_dj_club_1795083466509.jpg"
        : "/src/assets/images/event_sitar_concert_1795083609947.jpg",
      startingPrice: parsed.generalPrice,
      maxPrice: parsed.vipPrice,
      fnbCreditPerVip: 500,
      totalSeats: 24,
      bookedSeats: 0,
      grossRevenue: 0,
      admittedToday: 0,
      aboutParagraphs: [parsed.subtitle],
      highlights: [
        { title: "Curated Sound", detail: "Acoustically tuned room" },
        { title: "F&B Wallet", detail: "Pre-loaded credits on VIP passes" },
        { title: "Instant Entry", detail: "HMAC-Signed QR verification" },
      ],
      artists: [
        {
          name: parsed.title.split(":")[0],
          role: "Headline Act",
          bio: "Curated live performance presented on House Untold.",
        },
      ],
      sections: [
        {
          id: `${id}_vip`,
          name: "VIP / Stage",
          tier: "VIP",
          price: parsed.vipPrice,
          fnbCredit: 500,
          isAlcoholic: true,
          minAge: 21,
          description: "Front stage rows with ₹500 F&B credit",
        },
        {
          id: `${id}_gen`,
          name: "General",
          tier: "GENERAL",
          price: parsed.generalPrice,
          fnbCredit: 0,
          isAlcoholic: false,
          minAge: 0,
          description: "Main hall seating (All Ages)",
        },
      ],
    };

    const generatedSeats: Seat[] = [];
    const rows = ["A", "B", "C"];
    rows.forEach((row, rIdx) => {
      const isVip = rIdx === 0;
      for (let num = 1; num <= 8; num++) {
        generatedSeats.push({
          id: `${id}_${row}_${num}`,
          eventId: id,
          sectionId: isVip ? `${id}_vip` : `${id}_gen`,
          row,
          number: num,
          label: `${row}-${num}`,
          tier: isVip ? "VIP" : "GENERAL",
          status: "AVAILABLE",
          x: num,
          y: rIdx + 1,
        });
      }
    });

    this.db.events.unshift(newEvent);
    this.db.seats.push(...generatedSeats);
    this.saveState();
    return { ...newEvent };
  }
}
