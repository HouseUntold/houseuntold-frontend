import { CreateEventInput, Event, EventListSchema, EventSchema } from "@/models/event.schema";
import { api } from "../client";

export interface EventArtistInput {
  id?: string;
  name: string;
  category: string;
  description?: string;
}

export interface TierInput {
  name: string;
  category?: string;
  base_price: number;
  fnb_credit: number;
  entry_count: number;
  is_gender_strict?: boolean;
}

function normalizeEvent(raw: any): Event {
  const tiers = (raw.tiers || raw.ticketTiers || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    price: t.effective_price ?? t.base_price ?? t.price ?? 0,
    base_price: t.base_price ?? t.price,
    effective_price: t.effective_price,
    fnb_credit: t.fnb_credit,
    raw_fnb_credit: t.raw_fnb_credit ?? t.fnb_credit,
    entry_count: t.entry_count ?? 1,
    available: t.available ?? 100,
    first_99_applied: t.first_99_applied,
    free_slots_remaining: t.free_slots_remaining,
    includes_free_shot: t.includes_free_shot,
    is_gender_strict: t.is_gender_strict,
  }));

  const venue = raw.venue || {
    id: raw.id || "venue-1",
    name: raw.venue_name || raw.venue?.name || "Hotel Sky Blue",
    address: [raw.location_area || "Ravet- Pune", raw.transit_info || "Near Ravet BRT Road"].filter(Boolean).join(", ")
      || raw.location || "Pune",
  };

  return EventSchema.parse({
    id: raw.id,
    title: raw.title,
    startsAt: raw.starts_at || raw.startsAt,
    endsAt: raw.ends_at || raw.endsAt,
    venue,
    venueName: raw.venue_name,
    locationArea: raw.location_area,
    transitInfo: raw.transit_info,
    location: raw.location_area || raw.location || raw.venue_name,
    description: raw.description,
    advisoryNotice: raw.advisory_notice || raw.advisoryNotice,
    coverImage: raw.coverImage || raw.cover_image || null,
    status: raw.status === "ON_SALE" ? "LIVE" : raw.status,
    upiVpa: raw.upi_vpa,
    layoutType: raw.layout_type || raw.layoutType,
    is_first_99_active: raw.is_first_99_active ?? false,
    ticketTiers: tiers,
    seats: (raw.seats || []).map((s: any) => ({
      section: String(s.section || ""),
      table_size: Number(s.table_size || 0),
      total_tables: Number(s.total_tables || 0),
      reserved_tables: Number(s.reserved_tables || 0),
      available_tables: Number(s.available_tables || 0),
      table_total: s.table_total != null ? Number(s.table_total) : undefined,
      fnb_credit: s.fnb_credit != null ? Number(s.fnb_credit) : undefined,
    })),
    artists: raw.artists || [],
  });
}

export const eventsApi = {
  list: async (): Promise<Event[]> => {
    const res = await api.get("/events");
    const rawEvents = Array.isArray(res.data) ? res.data : res.data.events || [];
    return EventListSchema.parse(rawEvents.map(normalizeEvent));
  },

  detail: async (id: string): Promise<Event> => {
    const res = await api.get(`/events/${id}`);
    return normalizeEvent(res.data);
  },

  adminList: async (): Promise<Event[]> => {
    const res = await api.get("/admin/events");
    const rawEvents = Array.isArray(res.data) ? res.data : res.data.events || [];
    return Promise.all(
      rawEvents.map(async (raw: any) => {
        const detail = await api.get(`/events/${raw.id}`);
        return normalizeEvent({ ...raw, ...detail.data });
      }),
    );
  },

  create: async (input: CreateEventInput): Promise<Event> => {
    const res = await api.post("/admin/events", {
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location,
      venue_name: input.venueName,
      location_area: input.locationArea,
      description: input.description,
      transit_info: input.transitInfo,
      advisory_notice: input.advisoryNotice,
      status: input.status || "ON_SALE",
      artists: input.artists,
    });
    return normalizeEvent(res.data);
  },

  update: async (id: string, input: Partial<CreateEventInput> & { artists?: EventArtistInput[] }): Promise<Event> => {
    const res = await api.put(`/admin/events/${id}`, {
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location,
      venue_name: input.venueName,
      location_area: input.locationArea,
      description: input.description,
      transit_info: input.transitInfo,
      advisory_notice: input.advisoryNotice,
      status: input.status,
      artists: input.artists,
    });
    return normalizeEvent(res.data);
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/events/${id}`);
    return res.data;
  },

  setFirst99Active: async (eventId: string, isFirst99Active: boolean) => {
    const res = await api.patch(`/admin/events/${eventId}/first-99`, {
      is_first_99_active: isFirst99Active,
    });
    return res.data;
  },

  seats: async (id: string) => {
    const res = await api.get(`/events/${id}/seats`);
    return res.data;
  },

  configureSeating: async (id: string, rows: { section: string; table_size: number; total_tables: number; table_total?: number; fnb_credit?: number }[]) => {
    const res = await api.put(`/admin/events/${id}/seating`, { rows });
    return res.data;
  },

  createTier: async (eventId: string, data: TierInput) => {
    const res = await api.post(`/admin/events/${eventId}/tiers`, data);
    return res.data;
  },

  updateTier: async (tierId: string, data: Partial<TierInput>) => {
    const res = await api.patch(`/admin/tiers/${tierId}`, data);
    return res.data;
  },

  updateTierPrice: async (tierId: string, data: { base_price: number; fnb_credit: number }) => {
    const res = await api.patch(`/admin/tiers/${tierId}/price`, data);
    return res.data;
  },

  createArtist: async (eventId: string, data: { name: string; category: string; description?: string }) => {
    const res = await api.post(`/admin/events/${eventId}/artists`, data);
    return res.data;
  },

  listArtists: async (eventId: string) => {
    const res = await api.get(`/admin/events/${eventId}/artists`);
    return res.data;
  },

  deleteArtist: async (artistId: string) => {
    const res = await api.delete(`/admin/artists/${artistId}`);
    return res.data;
  },
};
