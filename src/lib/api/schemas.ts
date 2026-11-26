import { z } from "zod";

export const UserRoleSchema = z.enum(["USER", "ADMIN", "SCANNER", "BARTENDER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AuthProviderSchema = z.enum(["GOOGLE", "LOCAL_ADMIN", "FIREBASE_PHONE"]);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const TierTypeSchema = z.enum(["TABLE", "COUPLE", "STAG", "VIP", "GENERAL"]);
export type TierType = z.infer<typeof TierTypeSchema>;

export const GenderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);
export type Gender = z.infer<typeof GenderSchema>;

export const SeatStatusSchema = z.enum(["AVAILABLE", "HELD", "SELECTED_BY_ME", "SOLD"]);
export type SeatStatus = z.infer<typeof SeatStatusSchema>;

export const EventStatusSchema = z.enum(["ON_SALE", "ALMOST_FULL", "DRAFT", "PAUSED", "UPCOMING_SOON"]);
export type EventStatus = z.infer<typeof EventStatusSchema>;

export const LayoutTypeSchema = z.enum(["PROSCENIUM", "CLUB", "Lounge"]);
export type LayoutType = z.infer<typeof LayoutTypeSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  phoneVerified: z.boolean(),
  role: UserRoleSchema,
  authProvider: AuthProviderSchema.optional(),
  age: z.number().int().min(5),
});
export type User = z.infer<typeof UserSchema>;

export const StaffUserSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["SCANNER", "BARTENDER"]),
  createdAt: z.string().optional(),
});
export type StaffUserSummary = z.infer<typeof StaffUserSummarySchema>;

export const CreateStaffUserInputSchema = z.object({
  name: z.string().trim().min(2, "Full name is required (min 2 characters)"),
  email: z.string().trim().email("Valid staff login email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SCANNER", "BARTENDER"]),
});
export type CreateStaffUserInput = z.infer<typeof CreateStaffUserInputSchema>;

export const AuthSessionSchema = z.object({
  user: UserSchema,
  accessExpiresAt: z.string(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const GoogleAuthInputSchema = z.object({
  email: z.string().trim().email("Enter a valid Google email address"),
  name: z.string().trim().min(2, "Enter your full name").optional(),
  idToken: z.string().optional(),
});
export type GoogleAuthInput = z.infer<typeof GoogleAuthInputSchema>;

export const FirebasePhoneAuthInputSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Enter a valid 10-digit mobile number"),
  name: z.string().trim().min(2, "Full name is required (min 2 characters)"),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  otpCode: z.string().regex(/^\d{6}$/, "Enter the 6-digit SMS OTP code").optional(),
  idToken: z.string().optional(),
});
export type FirebasePhoneAuthInput = z.infer<typeof FirebasePhoneAuthInputSchema>;

export const EventSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: TierTypeSchema,
  price: z.number().int().nonnegative(),
  fnbCredit: z.number().int().nonnegative(),
  isAlcoholic: z.boolean(),
  minAge: z.number().int().nonnegative(),
  description: z.string(),
});
export type EventSection = z.infer<typeof EventSectionSchema>;

export const EventHighlightSchema = z.object({
  title: z.string(),
  detail: z.string(),
});

export const EventArtistSchema = z.object({
  name: z.string(),
  role: z.string(),
  bio: z.string(),
});

export const EventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string(),
  category: z.string(),
  dateLabel: z.string(),
  timeLabel: z.string(),
  startsAt: z.string().optional(),
  doorsOpenLabel: z.string(),
  venueName: z.string(),
  venueCity: z.string(),
  venueAddress: z.string(),
  transitNote: z.string(),
  layoutType: LayoutTypeSchema,
  status: EventStatusSchema,
  imageUrl: z.string(),
  startingPrice: z.number().int().nonnegative(),
  maxPrice: z.number().int().nonnegative(),
  fnbCreditPerVip: z.number().int().nonnegative(),
  totalSeats: z.number().int().positive(),
  bookedSeats: z.number().int().nonnegative(),
  grossRevenue: z.number().int().nonnegative(),
  admittedToday: z.number().int().nonnegative(),
  aboutParagraphs: z.array(z.string()),
  highlights: z.array(EventHighlightSchema),
  artists: z.array(EventArtistSchema),
  sections: z.array(EventSectionSchema),
});
export type VenuEvent = z.infer<typeof EventSchema>;

export const SeatSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  sectionId: z.string(),
  row: z.string(),
  number: z.number().int().positive(),
  label: z.string(),
  tier: TierTypeSchema,
  status: SeatStatusSchema,
  x: z.number(),
  y: z.number(),
  conflictDemo: z.boolean().optional(),
});
export type Seat = z.infer<typeof SeatSchema>;

export const ServerOrderBreakdownSchema = z.object({
  eventId: z.string(),
  seatIds: z.array(z.string()),
  seatCount: z.number().int().nonnegative(),
  baseAmount: z.number().int().nonnegative(),
  convenienceFee: z.number().int().nonnegative(),
  gstAmount: z.number().int().nonnegative(),
  fnbCreditTotal: z.number().int().nonnegative(),
  totalPayable: z.number().int().nonnegative(),
  holdExpiresAt: z.string().nullable(),
});
export type ServerOrderBreakdown = z.infer<typeof ServerOrderBreakdownSchema>;

export const SeatMapResponseSchema = z.object({
  event: EventSchema,
  seats: z.array(SeatSchema),
  breakdown: ServerOrderBreakdownSchema,
});
export type SeatMapResponse = z.infer<typeof SeatMapResponseSchema>;

export const AttendeeInputSchema = z.object({
  seatId: z.string(),
  seatLabel: z.string(),
  tier: TierTypeSchema,
  minAge: z.number().int().nonnegative(),
  fullName: z.string().trim().min(2, "Full name is required (min 2 characters)"),
  age: z
    .number({ message: "Valid age is required" })
    .int()
    .min(5, "Minimum age is 5")
    .max(110, "Enter a valid age"),
  gender: GenderSchema.default("MALE"),
});
export type AttendeeInput = z.infer<typeof AttendeeInputSchema>;

export const AttendeeDetailsFormSchema = z.object({
  contactEmail: z.string().trim().email("Enter a valid delivery email address"),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Enter a valid 10-digit mobile number"),
  phoneOtpVerified: z.literal(true, {
    message: "Verify your mobile number via SMS OTP before continuing",
  }),
  attendees: z.array(AttendeeInputSchema).min(1, "At least one attendee is required"),
});
export type AttendeeDetailsForm = z.infer<typeof AttendeeDetailsFormSchema>;

export const TicketAttendeeSchema = z.object({
  seatId: z.string(),
  seatLabel: z.string(),
  fullName: z.string(),
  age: z.number().int(),
  gender: GenderSchema.optional(),
  admitted: z.boolean(),
});
export type TicketAttendee = z.infer<typeof TicketAttendeeSchema>;

export const TicketSchema = z.object({
  id: z.string(),
  code: z.string(),
  barCode: z.string(),
  orderId: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  category: z.string().optional(),
  venueName: z.string(),
  dateLabel: z.string(),
  eventStartsAt: z.string().optional(),
  expiresAt: z.string(),
  gate: z.string(),
  tier: TierTypeSchema,
  sectionName: z.string(),
  seatLabels: z.array(z.string()),
  foodBalance: z.number().int().nonnegative(),
  initialFoodBalance: z.number().int().nonnegative(),
  qrToken: z.string(),
  checkedIn: z.boolean(),
  checkedInAt: z.string().nullable(),
  totalPaid: z.number().int().nonnegative(),
  attendees: z.array(TicketAttendeeSchema),
  contactEmail: z.string(),
  contactPhone: z.string(),
});
export type Ticket = z.infer<typeof TicketSchema>;

export const CheckoutInitResponseSchema = z.object({
  razorpayOrderId: z.string(),
  amountPaise: z.number().int().positive(),
  currency: z.literal("INR"),
  breakdown: ServerOrderBreakdownSchema,
});
export type CheckoutInitResponse = z.infer<typeof CheckoutInitResponseSchema>;

export const PaymentMethodSchema = z.enum(["UPI_QR", "UPI_VPA", "CARD"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const CheckoutConfirmSchema = z.object({
  eventId: z.string(),
  seatIds: z.array(z.string()).min(1),
  razorpayOrderId: z.string(),
  paymentMethod: PaymentMethodSchema,
  upiVpa: z.string().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  attendees: z.array(
    z.object({
      seatId: z.string(),
      seatLabel: z.string(),
      fullName: z.string(),
      age: z.number().int(),
      gender: GenderSchema.optional(),
    }),
  ),
});
export type CheckoutConfirmRequest = z.infer<typeof CheckoutConfirmSchema>;

export const FnbMenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number().int().positive(),
  isAlcoholic: z.boolean(),
});
export type FnbMenuItem = z.infer<typeof FnbMenuItemSchema>;

export const AddFnbMenuItemSchema = z.object({
  name: z.string().trim().min(2, "Item name must be at least 2 characters"),
  category: z.string().trim().min(2, "Category is required"),
  price: z
    .number({ message: "Valid price is required" })
    .int()
    .min(10, "Minimum price is ₹10"),
  isAlcoholic: z.boolean(),
});
export type AddFnbMenuItemInput = z.infer<typeof AddFnbMenuItemSchema>;

export const FnbTransactionSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  ticketCode: z.string(),
  patronName: z.string(),
  itemsSummary: z.string(),
  totalAmount: z.number().int().nonnegative(),
  walletDeducted: z.number().int().nonnegative(),
  upiDeltaPaid: z.number().int().nonnegative(),
  bartenderName: z.string(),
  createdAt: z.string(),
});
export type FnbTransaction = z.infer<typeof FnbTransactionSchema>;

export const FnbQuoteRequestSchema = z.object({
  ticketId: z.string().optional(),
  items: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().int().positive(),
    }),
  ),
});
export type FnbQuoteRequest = z.infer<typeof FnbQuoteRequestSchema>;

export const FnbQuoteResponseSchema = z.object({
  cartTotal: z.number().int().nonnegative(),
  walletDeduction: z.number().int().nonnegative(),
  upiDeltaRequired: z.number().int().nonnegative(),
  remainingBalance: z.number().int().nonnegative(),
  exceedsWallet: z.boolean(),
  ticketExpired: z.boolean(),
});
export type FnbQuoteResponse = z.infer<typeof FnbQuoteResponseSchema>;

export const FnbSettleRequestSchema = z.object({
  ticketId: z.string(),
  items: z
    .array(
      z.object({
        itemId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  upiDeltaConfirmed: z.boolean().optional(),
});
export type FnbSettleRequest = z.infer<typeof FnbSettleRequestSchema>;

export const FnbSettleResponseSchema = z.object({
  ticket: TicketSchema,
  transaction: FnbTransactionSchema,
});
export type FnbSettleResponse = z.infer<typeof FnbSettleResponseSchema>;

export const RecentScanSchema = z.object({
  id: z.string(),
  ticketCode: z.string(),
  patronName: z.string(),
  tier: TierTypeSchema,
  seatLabel: z.string(),
  status: z.enum(["VALID_ADMITTED", "ALREADY_USED", "INVALID"]),
  scannedAt: z.string(),
});
export type RecentScan = z.infer<typeof RecentScanSchema>;

export const CreateEventFormSchema = z.object({
  title: z.string().trim().min(4, "Event title must be at least 4 characters"),
  subtitle: z.string().trim().min(10, "Add a concise editorial subtitle"),
  category: z.string().trim().min(2, "Select a category"),
  venueName: z.string().trim().min(2, "Venue name is required"),
  dateLabel: z.string().trim().min(4, "Date is required"),
  timeLabel: z.string().trim().min(4, "Time is required"),
  layoutType: LayoutTypeSchema,
  vipPrice: z.number().int().min(500, "Minimum VIP price is ₹500"),
  generalPrice: z.number().int().min(300, "Minimum General price is ₹300"),
});
export type CreateEventForm = z.infer<typeof CreateEventFormSchema>;

export const AdminLoginFormSchema = z.object({
  email: z.string().trim().email("Valid operator email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type AdminLoginForm = z.infer<typeof AdminLoginFormSchema>;

export const AdminMfaInputSchema = z.object({
  mfa_challenge_token: z.string().min(1, "MFA challenge token missing"),
  totp_code: z.string().regex(/^\d{6}$/, "Enter 6-digit authenticator code"),
});
export type AdminMfaInput = z.infer<typeof AdminMfaInputSchema>;

export const StaffAdminLoginResponseSchema = z.discriminatedUnion("requires_mfa", [
  z.object({
    requires_mfa: z.literal(true),
    mfa_challenge_token: z.string(),
  }),
  z.object({
    requires_mfa: z.literal(false),
    user: UserSchema,
    accessExpiresAt: z.string(),
  }),
]);
export type StaffAdminLoginResponse = z.infer<typeof StaffAdminLoginResponseSchema>;

export const AdminMfaEnrollmentResponseSchema = z.object({
  otpauthUri: z.string(),
  secret: z.string(),
  issuer: z.string(),
  algorithm: z.string(),
  digits: z.number().int(),
  period: z.number().int(),
});
export type AdminMfaEnrollmentResponse = z.infer<typeof AdminMfaEnrollmentResponseSchema>;

export const TicketQrResponseSchema = z.object({
  ticketId: z.string(),
  code: z.string(),
  qrToken: z.string(),
  rotating: z.boolean().optional(),
  expiresInSeconds: z.number().int().optional(),
});
export type TicketQrResponse = z.infer<typeof TicketQrResponseSchema>;
