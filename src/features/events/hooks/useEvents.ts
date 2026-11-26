import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

export const EVENTS_QUERY_KEY = ["events"] as const;

export function useEvents() {
  return useQuery({
    queryKey: EVENTS_QUERY_KEY,
    queryFn: () => api.listEvents(),
  });
}

export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: ["events", eventId],
    queryFn: () => api.getEventById(eventId),
    enabled: Boolean(eventId),
  });
}
