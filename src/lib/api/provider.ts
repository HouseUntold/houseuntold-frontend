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

export interface VenuApiProvider {
  // Auth, OAuth & Backend-Driven Role / Admin MFA + Auto Refresh
  getCurrentUser(): Promise<User | null>;
  getAccessExpiresAt(): string | null;
  refreshSession(): Promise<AuthSession>;
  logout(): Promise<{ loggedOut: boolean }>;
  loginWithGoogle(payload: GoogleAuthInput): Promise<AuthSession>;
  loginWithFirebasePhone(payload: FirebasePhoneAuthInput): Promise<AuthSession>;
  loginStaffOrAdmin(payload: AdminLoginForm): Promise<StaffAdminLoginResponse>;
  verifyAdminMfa(payload: AdminMfaInput): Promise<AuthSession>;
  enrollAdminMfa(): Promise<AdminMfaEnrollmentResponse>;
  sendPhoneOtp(phone: string): Promise<{ sent: boolean; maskedPhone: string }>;
  verifyPhoneOtp(phone: string, otp: string): Promise<{ verified: boolean }>;

  // Events & Seats (Zero-trust server pricing)
  listEvents(): Promise<VenuEvent[]>;
  getEventById(eventId: string): Promise<VenuEvent>;
  getSeatMap(eventId: string): Promise<SeatMapResponse>;
  toggleSeatHold(eventId: string, seatId: string): Promise<SeatMapResponse>;
  clearSeatHolds(eventId: string): Promise<SeatMapResponse>;
  quoteSeats(eventId: string, seatIds: string[]): Promise<ServerOrderBreakdown>;

  // Checkout & Tickets
  initCheckout(eventId: string, seatIds: string[]): Promise<CheckoutInitResponse>;
  confirmCheckout(payload: CheckoutConfirmRequest): Promise<Ticket>;
  listTickets(): Promise<Ticket[]>;
  getTicketQr(ticketId: string, options?: { rotating?: boolean }): Promise<TicketQrResponse>;

  // Gate Scanner (/scan) - Strict RBAC: SCANNER | ADMIN
  lookupTicketByCodeOrJwt(query: string): Promise<ScanLookupResult>;
  admitTicket(ticketId: string, seatId?: string): Promise<Ticket>;
  listRecentScans(): Promise<RecentScan[]>;

  // Bartender POS (/counter) - Strict RBAC: BARTENDER | ADMIN
  listFnbMenu(): Promise<FnbMenuItem[]>;
  addFnbMenuItem(payload: AddFnbMenuItemInput): Promise<FnbMenuItem>;
  listFnbTransactions(): Promise<FnbTransaction[]>;
  lookupTicketByBarCode(barCode: string): Promise<ScanLookupResult>;
  quoteFnbOrder(payload: FnbQuoteRequest): Promise<FnbQuoteResponse>;
  settleFnbOrder(payload: FnbSettleRequest): Promise<FnbSettleResponse>;

  // Admin Console (/admin) - Strict RBAC: ADMIN
  getAdminStats(): Promise<AdminOverviewStats>;
  updateEventStatus(eventId: string, status: EventStatus): Promise<VenuEvent>;
  createEvent(payload: CreateEventForm): Promise<VenuEvent>;
  listStaffUsers(): Promise<StaffUserSummary[]>;
  createStaffUser(payload: CreateStaffUserInput): Promise<StaffUserSummary>;
}
