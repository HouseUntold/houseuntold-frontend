import { api } from "../client";

export interface CheckoutLead {
  id: string;
  event_title: string;
  category_name: string;
  contact_phone: string;
  whatsapp_number?: string;
  contact_email?: string;
  primary_name?: string;
  primary_age?: number;
  gender?: string;
  couple_count: number;
  stag_male_count: number;
  stag_female_count: number;
  guest_count: number;
  seat_section?: string;
  seat_table_size?: number;
  upi_transaction_id?: string;
  booking_id?: string;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export const leadsApi = {
  list: async (params: { q?: string; eventId?: string; includeCompleted?: boolean; limit?: number; offset?: number } = {}) => {
    const res = await api.get("/admin/leads", {
      params: {
        q: params.q || undefined,
        event_id: params.eventId || undefined,
        include_completed: params.includeCompleted ? "true" : "false",
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      },
    });
    return (res.data.leads || []) as CheckoutLead[];
  },
};
