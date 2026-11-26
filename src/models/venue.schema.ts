import { z } from "zod";

export const VenueSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string().optional(),
  transitInfo: z.string().optional(),
  advisoryNotice: z.string().optional(),
  capacity: z.number().optional(),
});

export const VenueSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
});

export const VenueListSchema = z.array(VenueSchema);

export type Venue = z.infer<typeof VenueSchema>;
export type VenueSummary = z.infer<typeof VenueSummarySchema>;
