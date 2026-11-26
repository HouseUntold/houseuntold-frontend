export type {
  AddFnbMenuItemInput,
  AdminLoginForm,
  AdminMfaEnrollmentResponse,
  AdminMfaInput,
  AttendeeDetailsForm,
  AttendeeInput,
  AuthProvider,
  AuthSession,
  CheckoutConfirmRequest,
  CheckoutInitResponse,
  CreateEventForm,
  CreateStaffUserInput,
  EventSection,
  EventStatus,
  FirebasePhoneAuthInput,
  FnbMenuItem,
  FnbQuoteRequest,
  FnbQuoteResponse,
  FnbSettleRequest,
  FnbSettleResponse,
  FnbTransaction,
  Gender,
  GoogleAuthInput,
  LayoutType,
  PaymentMethod,
  RecentScan,
  Seat,
  SeatMapResponse,
  SeatStatus,
  ServerOrderBreakdown,
  StaffAdminLoginResponse,
  StaffUserSummary,
  Ticket,
  TicketAttendee,
  TicketQrResponse,
  TierType,
  User,
  UserRole,
  VenuEvent,
} from "./schemas";

export interface AdminOverviewStats {
  activeEvents: number;
  seatsBooked: number;
  totalSeatsCapacity: number;
  grossTicketRevenue: number;
  gateAdmittedToday: number;
}

export interface ScanLookupResult {
  valid: boolean;
  reason:
    | "VALID"
    | "ALREADY_CHECKED_IN"
    | "INVALID_SIGNATURE"
    | "EXPIRED"
    | "ROTATING_QR_EXPIRED"
    | "NOT_FOUND";
  ticket: import("./schemas").Ticket | null;
}
