export const qk = {
  events: {
    all: ["events"] as const,
    list: (filters?: object) => [...qk.events.all, "list", filters] as const,
    detail: (id: string) => [...qk.events.all, "detail", id] as const,
    seats: (id: string) => [...qk.events.all, "seats", id] as const,
  },
  menu: {
    all: ["menu"] as const,
    list: () => [...qk.menu.all, "list"] as const,
    byVenue: (venueId: string) => [...qk.menu.all, "venue", venueId] as const,
  },
  orders: {
    all: ["orders"] as const,
    byUser: (userId: string) => [...qk.orders.all, "user", userId] as const,
    queue: (venueId?: string) => [...qk.orders.all, "queue", venueId || "default"] as const,
    history: (barcode: string) => [...qk.orders.all, "history", barcode] as const,
  },
  tickets: {
    all: ["tickets"] as const,
    detail: (id: string) => [...qk.tickets.all, "detail", id] as const,
    byEvent: (eventId: string) => [...qk.tickets.all, "event", eventId] as const,
    search: (barcode: string) => [...qk.tickets.all, "search", barcode] as const,
    adminSearch: (query: string, waPending = false, cursor = "") => [...qk.tickets.all, "admin-search", query, waPending, cursor] as const,
  },
  venues: {
    all: ["venues"] as const,
    list: () => [...qk.venues.all, "list"] as const,
    detail: (id: string) => [...qk.venues.all, "detail", id] as const,
  },
  users: {
    all: ["users"] as const,
    list: () => [...qk.users.all, "list"] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    stats: (eventId?: string) => [...qk.analytics.all, "stats", eventId || "all"] as const,
    logs: () => [...qk.analytics.all, "logs"] as const,
  },
  help: {
    all: ["help"] as const,
    list: (resolved?: boolean) => [...qk.help.all, "list", resolved ?? "all"] as const,
  },
};
