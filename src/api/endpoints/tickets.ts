import {
  InitCheckoutInput,
  InitCheckoutResponse,
  InitCheckoutResponseSchema,
  SubmitUtrInput,
  Ticket,
  TicketSchema,
  TicketSearchPage,
} from "@/models/ticket.schema";
import { api } from "../client";

export const ticketsApi = {
  checkout: async (input: InitCheckoutInput): Promise<InitCheckoutResponse> => {
    const res = await api.post("/checkout/init", input);
    return InitCheckoutResponseSchema.parse(res.data);
  },

  submitUtr: async (input: SubmitUtrInput) => {
    const bookingId = input.booking_id?.trim();
    if (!bookingId) {
      throw new Error("No active booking ID found. Please initiate ticket checkout first.");
    }
    const res = await api.post(`/checkout/${bookingId}/upi-reference`, {
      contact_phone: input.phone,
      upi_transaction_id: input.upi_transaction_id,
    });
    return res.data;
  },

  detail: async (ticketId: string): Promise<Ticket> => {
    const res = await api.get(`/tickets/${ticketId}`);
    return TicketSchema.parse(res.data);
  },

  lookup: async (query: string): Promise<Ticket> => {
    const res = await api.get("/tickets/lookup", { params: { q: query } });
    return TicketSchema.parse(res.data);
  },

  adminSearch: async (query: string, waPending = false, cursor = ""): Promise<TicketSearchPage> => {
    const res = await api.get("/admin/tickets/search", {
      params: { q: query, limit: 10, wa_pending: waPending ? "true" : undefined, cursor: cursor || undefined },
    });
    return {
      tickets: (res.data.tickets || []).map((ticket: unknown) => TicketSchema.parse(ticket)),
      nextCursor: res.data.next_cursor || "",
      hasMore: Boolean(res.data.has_more),
    };
  },

  exportSearch: async (): Promise<Ticket[]> => {
    const tickets: Ticket[] = [];
    let cursor = "";
    for (;;) {
      const res = await api.get("/admin/tickets/search", { params: { limit: 50, cursor: cursor || undefined } });
      const batch = res.data.tickets || [];
      tickets.push(...batch.map((ticket: unknown) => TicketSchema.parse(ticket)));
      cursor = res.data.next_cursor || "";
      if (!cursor || batch.length === 0) break;
    }
    return tickets;
  },

  markWaSent: async (ticketId: string) => {
    const res = await api.patch(`/admin/bookings/${ticketId}/wa-sent`);
    return res.data;
  },

  searchByBarcode: async (barcode: string) => {
    const res = await api.get(`/counter/search?bar_code=${barcode}`);
    return res.data;
  },

  verifyGateTicket: async (qrToken: string) => {
    const res = await api.post("/gate/validate", { qr_token: qrToken });
    return res.data;
  },

  checkInGateTicket: async (qrToken: string) => {
    const res = await api.post("/gate/check-in", { qr_token: qrToken });
    return res.data;
  },
};
