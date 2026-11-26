import { isValidIndianMobile, isValidUtr } from "@/lib/validation";
import { z } from "zod";

export const TicketGuestSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  age: z.number().optional(),
  gender: z.string().optional(),
  is_primary_contact: z.boolean().default(false),
  free_shot_redeemed: z.boolean().default(false),
});
export type TicketGuest = z.infer<typeof TicketGuestSchema>;

export const TicketSchema = z.object({
  id: z.string(),
  booking_id: z.string().optional(),
  event_id: z.string().optional(),
  event_title: z.string(),
  event_starts_at: z.string().optional(),
  event_ends_at: z.string().optional(),
  event_location: z.string().optional(),
  category_name: z.string(),
  entry_count: z.number().default(1),
  attendee_count: z.number().default(1),
  primary_guest_name: z.string().optional(),
  total_amount: z.number().default(0),
  bar_code: z.string().optional(),
  gate_qr_token: z.string().optional(),
  payment_qr_data: z.string().optional(),
  booking_status: z.enum(["PENDING", "CONFIRMED", "FAILED", "REJECTED"]).default("PENDING"),
  food_balance: z.number().default(0),
  initial_food_balance: z.number().default(0),
  fnb_expired: z.boolean().default(false),
  is_checked_in: z.boolean().default(false),
  checked_in_at: z.string().nullable().optional(),
  guests: z.array(TicketGuestSchema).optional(),
  contact_phone: z.string().optional(),
  upi_transaction_id: z.string().optional(),
  section: z.string().optional(),
  seat_table_size: z.number().optional(),
  seat_table_number: z.number().optional(),
  couple_count: z.number().default(0),
  stag_male_count: z.number().default(0),
  stag_female_count: z.number().default(0),
  is_whatsapp_sent: z.boolean().default(false),
  free_tequila_eligible_count: z.number().default(0),
  free_tequila_redeemed_count: z.number().default(0),
});
export type Ticket = z.infer<typeof TicketSchema>;

export const InitCheckoutInputSchema = z.object({
  event_id: z.string(),
  category_id: z.string(),
  contact_phone: z.string().refine(isValidIndianMobile, "Enter a valid Indian mobile number"),
  contact_email: z.string().email().optional(),
  primary_name: z.string().min(1, "Primary booker name is required"),
  primary_age: z.number().int().min(1).max(120).optional(),
  whatsapp_number: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("MALE"),
  upi_transaction_id: z.string().optional(),
  seat_selection: z.object({
    section: z.string(),
    table_size: z.number(),
  }).optional(),
  group: z.object({
    couples: z.number().int().min(0),
    stag_male: z.number().int().min(0),
    stag_female: z.number().int().min(0),
  }).optional(),
});
export type InitCheckoutInput = z.infer<typeof InitCheckoutInputSchema>;

export const InitCheckoutResponseSchema = z.object({
  booking_id: z.string(),
  ticket_id: z.string(),
  status: z.string(),
  total_amount: z.number(),
  currency: z.string().default("INR"),
  fnb_credit: z.number().default(0),
  entry_count: z.number().default(1),
  attendee_count: z.number().default(1),
  primary_guest_name: z.string().optional(),
  payment_qr_data: z.string().optional(),
  first_99_applied: z.boolean().optional(),
  upi_transaction_id: z.string().optional(),
  bar_code: z.string().optional(),
  gate_qr_token: z.string().optional(),
  seat_section: z.string().optional(),
  seat_table_size: z.number().optional(),
  seat_table_number: z.number().optional(),
  tequila_eligible_count: z.number().optional(),
});
export type InitCheckoutResponse = z.infer<typeof InitCheckoutResponseSchema>;

export const SubmitUtrInputSchema = z.object({
  booking_id: z.string(),
  phone: z.string().refine(isValidIndianMobile, "Enter a valid Indian mobile number"),
  upi_transaction_id: z.string().refine(isValidUtr, "Enter a valid 12-digit UTR"),
});
export type SubmitUtrInput = z.infer<typeof SubmitUtrInputSchema>;

export const TicketSearchPageSchema = z.object({
  tickets: z.array(TicketSchema),
  nextCursor: z.string().default(""),
  hasMore: z.boolean().default(false),
});
export type TicketSearchPage = z.infer<typeof TicketSearchPageSchema>;
