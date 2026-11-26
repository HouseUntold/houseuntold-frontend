import { ApiHttpError } from "./errors";
import type { VenuApiProvider } from "./provider";
import {
  AdminMfaEnrollmentResponseSchema,
  AuthSessionSchema,
  CheckoutInitResponseSchema,
  EventSchema,
  FnbMenuItemSchema,
  FnbQuoteResponseSchema,
  FnbSettleResponseSchema,
  FnbTransactionSchema,
  RecentScanSchema,
  SeatMapResponseSchema,
  ServerOrderBreakdownSchema,
  StaffAdminLoginResponseSchema,
  StaffUserSummarySchema,
  TicketQrResponseSchema,
  TicketSchema,
  UserSchema,
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
  SeatMapResponse,
  ServerOrderBreakdown,
  StaffAdminLoginResponse,
  StaffUserSummary,
  Ticket,
  TicketQrResponse,
  User,
  VenuEvent,
} from "./types";

const NO_REFRESH_PATHS = new Set([
  "/auth/refresh",
  "/auth/google",
  "/auth/admin/login",
  "/auth/admin/mfa",
  "/auth/logout",
]);

/**
 * Live Go Backend implementation (chi router + sqlc + pgx + HTTP-only JWT cookies).
 * Features single-flight 401 auto-refresh via POST /api/auth/refresh.
 * Activate in src/lib/api/index.ts by changing `new MockApi()` to `new RealApi()`.
 */
export class RealApi implements VenuApiProvider {
  private readonly baseUrl: string;
  private refreshInFlight: Promise<AuthSession> | null = null;
  private accessExpiresAt: string | null = null;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  getAccessExpiresAt(): string | null {
    return this.accessExpiresAt;
  }

  private async extractError(response: Response): Promise<ApiHttpError> {
    const raw = (await response.json().catch(() => ({}))) as {
      error?: string | { code?: string; message?: string };
    };
    if (typeof raw.error === "object" && raw.error !== null) {
      return new ApiHttpError(
        response.status,
        raw.error.code ?? `http_${response.status}`,
        raw.error.message ?? `Request failed (${response.status})`,
      );
    }
    return new ApiHttpError(
      response.status,
      `http_${response.status}`,
      typeof raw.error === "string" ? raw.error : `Request failed (${response.status})`,
    );
  }

  private async request<T>(path: string, init?: RequestInit, retriedAfterRefresh = false): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    if (response.status === 401 && !retriedAfterRefresh && !NO_REFRESH_PATHS.has(path)) {
      try {
        await this.refreshSession();
        return this.request<T>(path, init, true);
      } catch {
        // Refresh failed or token family revoked; surface original 401 cleanly
      }
    }

    if (!response.ok) {
      throw await this.extractError(response);
    }
    return response.json() as Promise<T>;
  }

  async refreshSession(): Promise<AuthSession> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = (async () => {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          this.accessExpiresAt = null;
          throw await this.extractError(response);
        }
        const parsed = AuthSessionSchema.parse(await response.json());
        this.accessExpiresAt = parsed.accessExpiresAt;
        return parsed;
      })().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  async logout(): Promise<{ loggedOut: boolean }> {
    this.accessExpiresAt = null;
    return this.request("/auth/logout", { method: "POST" }, true);
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await this.request<unknown>("/auth/me");
      return UserSchema.parse(data);
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 401) {
        return null;
      }
      throw err;
    }
  }

  async loginWithGoogle(payload: GoogleAuthInput): Promise<AuthSession> {
    const data = await this.request<unknown>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken: payload.idToken ?? payload.email }),
    });
    const session = AuthSessionSchema.parse(data);
    this.accessExpiresAt = session.accessExpiresAt;
    return session;
  }

  async loginWithFirebasePhone(payload: FirebasePhoneAuthInput): Promise<AuthSession> {
    const data = await this.request<unknown>("/auth/firebase/phone", {
      method: "POST",
      body: JSON.stringify({
        idToken: payload.idToken ?? "",
        name: payload.name,
        email: payload.email ?? "",
      }),
    });
    const session = AuthSessionSchema.parse(data);
    this.accessExpiresAt = session.accessExpiresAt;
    return session;
  }

  async loginStaffOrAdmin(payload: AdminLoginForm): Promise<StaffAdminLoginResponse> {
    const data = await this.request<unknown>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: payload.email, password: payload.password }),
    });
    const parsed = StaffAdminLoginResponseSchema.parse(data);
    if (!parsed.requires_mfa) {
      this.accessExpiresAt = parsed.accessExpiresAt;
    }
    return parsed;
  }

  async verifyAdminMfa(payload: AdminMfaInput): Promise<AuthSession> {
    const data = await this.request<unknown>("/auth/admin/mfa", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const session = AuthSessionSchema.parse(data);
    this.accessExpiresAt = session.accessExpiresAt;
    return session;
  }

  async enrollAdminMfa(): Promise<AdminMfaEnrollmentResponse> {
    const data = await this.request<unknown>("/admin/mfa/enroll", {
      method: "POST",
    });
    return AdminMfaEnrollmentResponseSchema.parse(data);
  }

  async sendPhoneOtp(phone: string): Promise<{ sent: boolean; maskedPhone: string }> {
    return this.request("/auth/phone/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  async verifyPhoneOtp(phone: string, otp: string): Promise<{ verified: boolean }> {
    return this.request("/auth/firebase/link-phone", {
      method: "POST",
      body: JSON.stringify({ idToken: otp, name: "", email: phone }),
    });
  }

  async listEvents(): Promise<VenuEvent[]> {
    const data = await this.request<unknown[]>("/events");
    return data.map((item) => EventSchema.parse(item));
  }

  async getEventById(eventId: string): Promise<VenuEvent> {
    const data = await this.request<{ event?: unknown }>(`/events/${encodeURIComponent(eventId)}`);
    return EventSchema.parse(data.event ?? data);
  }

  async getSeatMap(eventId: string): Promise<SeatMapResponse> {
    const data = await this.request<unknown>(`/events/${encodeURIComponent(eventId)}/seats`);
    return SeatMapResponseSchema.parse(data);
  }

  async toggleSeatHold(eventId: string, seatId: string): Promise<SeatMapResponse> {
    const data = await this.request<unknown>("/checkout/hold", {
      method: "POST",
      body: JSON.stringify({ eventId, seatId }),
    });
    return SeatMapResponseSchema.parse(data);
  }

  async clearSeatHolds(eventId: string): Promise<SeatMapResponse> {
    const data = await this.request<unknown>(`/checkout/hold/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
    return SeatMapResponseSchema.parse(data);
  }

  async quoteSeats(eventId: string, seatIds: string[]): Promise<ServerOrderBreakdown> {
    const data = await this.request<unknown>(`/events/${encodeURIComponent(eventId)}/quote`, {
      method: "POST",
      body: JSON.stringify({ seatIds }),
    });
    return ServerOrderBreakdownSchema.parse(data);
  }

  async initCheckout(eventId: string, seatIds: string[]): Promise<CheckoutInitResponse> {
    const data = await this.request<unknown>("/checkout/pay", {
      method: "POST",
      body: JSON.stringify({ eventId, seatIds }),
    });
    return CheckoutInitResponseSchema.parse(data);
  }

  async confirmCheckout(payload: CheckoutConfirmRequest): Promise<Ticket> {
    const data = await this.request<unknown>("/checkout/confirm", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return TicketSchema.parse(data);
  }

  async listTickets(): Promise<Ticket[]> {
    const data = await this.request<unknown[]>("/tickets");
    return data.map((t) => TicketSchema.parse(t));
  }

  async getTicketQr(ticketId: string, options?: { rotating?: boolean }): Promise<TicketQrResponse> {
    const suffix = options?.rotating ? "?mode=rotating" : "";
    const data = await this.request<unknown>(`/tickets/${encodeURIComponent(ticketId)}/qr${suffix}`);
    return TicketQrResponseSchema.parse(data);
  }

  async lookupTicketByCodeOrJwt(query: string): Promise<ScanLookupResult> {
    return this.request("/scan/validate", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  async admitTicket(ticketId: string, seatId?: string): Promise<Ticket> {
    const data = await this.request<{ ticket?: unknown }>("/scan/check-in", {
      method: "POST",
      body: JSON.stringify({ ticketId, seatId }),
    });
    return TicketSchema.parse(data.ticket ?? data);
  }

  async listRecentScans(): Promise<RecentScan[]> {
    const data = await this.request<unknown[]>("/scan/recent");
    return data.map((s) => RecentScanSchema.parse(s));
  }

  async listFnbMenu(): Promise<FnbMenuItem[]> {
    const data = await this.request<unknown[]>("/counter/menu");
    return data.map((m) => FnbMenuItemSchema.parse(m));
  }

  async addFnbMenuItem(payload: AddFnbMenuItemInput): Promise<FnbMenuItem> {
    const data = await this.request<unknown>("/counter/items", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return FnbMenuItemSchema.parse(data);
  }

  async lookupTicketByBarCode(barCode: string): Promise<ScanLookupResult> {
    return this.request("/counter/validate", {
      method: "POST",
      body: JSON.stringify({ query: barCode }),
    });
  }

  async quoteFnbOrder(payload: FnbQuoteRequest): Promise<FnbQuoteResponse> {
    const data = await this.request<unknown>("/counter/quote", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return FnbQuoteResponseSchema.parse(data);
  }

  async listFnbTransactions(): Promise<FnbTransaction[]> {
    const data = await this.request<unknown[]>("/counter/transactions");
    return data.map((tx) => FnbTransactionSchema.parse(tx));
  }

  async settleFnbOrder(payload: FnbSettleRequest): Promise<FnbSettleResponse> {
    const data = await this.request<unknown>("/counter/redeem", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return FnbSettleResponseSchema.parse(data);
  }

  async getAdminStats(): Promise<AdminOverviewStats> {
    return this.request("/admin/stats");
  }

  async listStaffUsers(): Promise<StaffUserSummary[]> {
    const data = await this.request<unknown[]>("/admin/staff");
    return data.map((u) => StaffUserSummarySchema.parse(u));
  }

  async createStaffUser(payload: CreateStaffUserInput): Promise<StaffUserSummary> {
    const data = await this.request<unknown>("/admin/staff", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return StaffUserSummarySchema.parse(data);
  }

  async updateEventStatus(eventId: string, status: EventStatus): Promise<VenuEvent> {
    const data = await this.request<unknown>(`/admin/events/${encodeURIComponent(eventId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return EventSchema.parse(data);
  }

  async createEvent(payload: CreateEventForm): Promise<VenuEvent> {
    const data = await this.request<{ event?: unknown }>("/admin/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return EventSchema.parse(data.event ?? data);
  }
}
