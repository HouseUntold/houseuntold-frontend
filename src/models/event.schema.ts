import { z } from "zod";
import { VenueSummarySchema } from "./venue.schema";

export const TicketTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
  price: z.number().default(0),
  base_price: z.number().optional(),
  effective_price: z.number().optional(),
  fnb_credit: z.number().optional(),
  raw_fnb_credit: z.number().optional(),
  entry_count: z.number().default(1),
  available: z.number().default(100),
  first_99_applied: z.boolean().optional(),
  free_slots_remaining: z.number().optional(),
  includes_free_shot: z.boolean().optional(),
  is_gender_strict: z.boolean().optional(),
});
export type TicketTier = z.infer<typeof TicketTierSchema>;

export const ArtistSchema = z.object({
  id: z.string(),
  event_id: z.string().optional(),
  name: z.string(),
  category: z.string(),
  description: z.string().optional(),
});
export type Artist = z.infer<typeof ArtistSchema>;

export const SeatInventorySchema = z.object({
  section: z.string(),
  table_size: z.number(),
  total_tables: z.number(),
  reserved_tables: z.number().default(0),
  available_tables: z.number().default(0),
  table_total: z.number().optional(),
  fnb_credit: z.number().optional(),
});
export type SeatInventory = z.infer<typeof SeatInventorySchema>;

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  venue: VenueSummarySchema,
  venueName: z.string().optional(),
  locationArea: z.string().optional(),
  transitInfo: z.string().optional(),
  location: z.string().optional(),
  description: z.string().nullable().optional(),
  advisoryNotice: z.string().optional(),
  coverImage: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "LIVE", "ENDED", "ON_SALE", "SOLD_OUT"]),
  upiVpa: z.string().optional(),
  layoutType: z.enum(["CLUB", "Lounge", "PROSCENIUM"]).optional(),
  is_first_99_active: z.boolean().optional(),
  ticketTiers: z.array(TicketTierSchema),
  seats: z.array(SeatInventorySchema).optional(),
  artists: z.array(ArtistSchema).optional(),
});
export type Event = z.infer<typeof EventSchema>;

export const EventListSchema = z.array(EventSchema);
export type EventList = z.infer<typeof EventListSchema>;

export const EventArtistInputSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  category: z.string(),
  description: z.string().optional(),
});
export type EventArtistInput = z.infer<typeof EventArtistInputSchema>;

export const CreateEventInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startsAt: z.string().min(1, "Start time is required"),
  endsAt: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  venueName: z.string().optional(),
  locationArea: z.string().optional(),
  description: z.string().optional(),
  transitInfo: z.string().optional(),
  advisoryNotice: z.string().optional(),
  status: z.enum(["DRAFT", "ON_SALE", "SOLD_OUT", "ENDED", "LIVE"]).optional(),
  artists: z.array(EventArtistInputSchema).optional(),
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
