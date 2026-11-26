import { Venue, VenueListSchema, VenueSchema } from "@/models/venue.schema";
import { api } from "../client";

export const venuesApi = {
  list: async (): Promise<Venue[]> => {
    try {
      const res = await api.get("/venues");
      return VenueListSchema.parse(res.data);
    } catch {
      // Return default venue if dedicated venues table is integrated inside events
      return [
        VenueSchema.parse({
          id: "sky-blue-ravet",
          name: "Hotel Sky Blue",
          address: "Ravet- Pune",
          city: "Pune",
          transitInfo: "Near Ravet BRT Road",
          advisoryNotice: "Valid government photo ID required.",
          capacity: 1000,
        }),
      ];
    }
  },

  detail: async (id: string): Promise<Venue> => {
    return VenueSchema.parse({
      id,
      name: "Hotel Sky Blue",
      address: "Ravet- Pune",
      city: "Pune",
      transitInfo: "Near Ravet BRT Road",
      advisoryNotice: "Valid government photo ID required.",
      capacity: 1000,
    });
  },
};
