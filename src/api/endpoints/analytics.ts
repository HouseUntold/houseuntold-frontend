import { api } from "../client";

export interface AnalyticsStats {
  event_id: string;
  total_revenue: number;
  total_confirmed_tickets: number;
  total_attendees: number;
  fnb_credit_allocated: number;
  fnb_wallet_deducted: number;
  fnb_delta_collected: number;
  free_tequila_shots_redeemed: number;
  gate_checked_in_count: number;
  total_couples?: number;
  total_stag_male?: number;
  total_stag_female?: number;
  total_tequila_redeemed?: number;
  total_fnb_credit_used?: number;
  extra_cash_collected?: number;
  extra_upi_collected?: number;
}

export interface AdminTableBookingBreakdown {
  section: string;
  table_size: number;
  total_tables: number;
  reserved_tables: number;
}

export interface AdminEventPerformance {
  event_id: string;
  event_title: string;
  confirmed_bookings: number;
  ticket_revenue: number;
  total_tickets: number;
  checked_in_tickets: number;
  total_fnb_redeemed: number;
  total_fnb_remaining: number;
  bar_transactions: number;
  total_bar_bill: number;
  total_guests: number;
  total_couples: number;
  total_stag_male: number;
  total_stag_female: number;
  total_tequila_redeemed: number;
  total_fnb_credit_used: number;
  extra_cash_collected: number;
  extra_upi_collected: number;
  table_booking_breakdown?: AdminTableBookingBreakdown[];
}

export interface AdminTopBarItem {
  item_name: string;
  item_category: string;
  quantity: number;
  unit_price_at_sale: number;
  revenue: number;
}

export interface AdminRecentGateEntry {
  ticket_id: string;
  bar_code: string;
  checked_in_at?: string;
  primary_guest?: string;
  gatekeeper_username?: string;
  category_name: string;
}

export interface AdminStats {
  total_revenue: number;
  confirmed_bookings: number;
  total_tickets: number;
  checked_in_tickets: number;
  fnb_redeemed: number;
  fnb_remaining: number;
  bar_transactions: number;
  total_guests: number;
  total_couples: number;
  total_stag_male: number;
  total_stag_female: number;
  total_tequila_redeemed: number;
  total_fnb_credit_used: number;
  extra_cash_collected: number;
  extra_upi_collected: number;
  active_events: number;
  table_booking_breakdown: AdminTableBookingBreakdown[];
  per_event_performance: AdminEventPerformance[];
  top_bar_items: AdminTopBarItem[];
  recent_gate_entries: AdminRecentGateEntry[];
}

const numberOrZero = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const normalizeTableBreakdown = (rows: any): AdminTableBookingBreakdown[] =>
  Array.isArray(rows)
    ? rows.map((row) => ({
      section: String(row?.section || ""),
      table_size: numberOrZero(row?.table_size),
      total_tables: numberOrZero(row?.total_tables),
      reserved_tables: numberOrZero(row?.reserved_tables),
    }))
    : [];

const normalizeEventPerformance = (row: any): AdminEventPerformance => ({
  ...row,
  total_couples: numberOrZero(row?.total_couples),
  total_stag_male: numberOrZero(row?.total_stag_male),
  total_stag_female: numberOrZero(row?.total_stag_female),
  total_tequila_redeemed: numberOrZero(row?.total_tequila_redeemed),
  total_fnb_credit_used: numberOrZero(row?.total_fnb_credit_used),
  extra_cash_collected: numberOrZero(row?.extra_cash_collected),
  extra_upi_collected: numberOrZero(row?.extra_upi_collected),
  table_booking_breakdown: normalizeTableBreakdown(row?.table_booking_breakdown),
});

const normalizeAdminStats = (data: any): AdminStats => ({
  ...data,
  total_revenue: numberOrZero(data?.total_revenue),
  confirmed_bookings: numberOrZero(data?.confirmed_bookings),
  total_tickets: numberOrZero(data?.total_tickets),
  checked_in_tickets: numberOrZero(data?.checked_in_tickets),
  fnb_redeemed: numberOrZero(data?.fnb_redeemed),
  fnb_remaining: numberOrZero(data?.fnb_remaining),
  bar_transactions: numberOrZero(data?.bar_transactions),
  total_guests: numberOrZero(data?.total_guests),
  total_couples: numberOrZero(data?.total_couples),
  total_stag_male: numberOrZero(data?.total_stag_male),
  total_stag_female: numberOrZero(data?.total_stag_female),
  total_tequila_redeemed: numberOrZero(data?.total_tequila_redeemed),
  total_fnb_credit_used: numberOrZero(data?.total_fnb_credit_used),
  extra_cash_collected: numberOrZero(data?.extra_cash_collected),
  extra_upi_collected: numberOrZero(data?.extra_upi_collected),
  active_events: numberOrZero(data?.active_events),
  table_booking_breakdown: normalizeTableBreakdown(data?.table_booking_breakdown),
  per_event_performance: Array.isArray(data?.per_event_performance)
    ? data.per_event_performance.map(normalizeEventPerformance)
    : [],
  top_bar_items: Array.isArray(data?.top_bar_items) ? data.top_bar_items : [],
  recent_gate_entries: Array.isArray(data?.recent_gate_entries) ? data.recent_gate_entries : [],
});

export const analyticsApi = {
  stats: async (eventId: string): Promise<AnalyticsStats> => {
    const res = await api.get(`/admin/stats/${eventId}`);
    return res.data;
  },

  overview: async (): Promise<AdminStats> => {
    const res = await api.get("/admin/stats");
    return normalizeAdminStats(res.data);
  },

  auditLogs: async () => {
    const res = await api.get("/admin/audit-logs");
    return res.data.logs || [];
  },

  bookings: async () => {
    const res = await api.get("/admin/bookings");
    return res.data.bookings || [];
  },

  verifyBooking: async (bookingId: string, action: "APPROVE" | "REJECT", reason?: string) => {
    const res = await api.post(`/admin/bookings/${bookingId}/verify`, {
      action,
      rejection_reason: reason,
    });
    return res.data;
  },
};
