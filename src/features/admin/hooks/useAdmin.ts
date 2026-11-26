import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { CreateEventForm, CreateStaffUserInput, EventStatus } from "../../../lib/api/types";
import { EVENTS_QUERY_KEY } from "../../events/hooks/useEvents";

export const ADMIN_STATS_KEY = ["admin", "stats"] as const;
export const ADMIN_STAFF_KEY = ["admin", "staff"] as const;

export function useAdmin() {
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ADMIN_STATS_KEY,
    queryFn: () => api.getAdminStats(),
  });

  const eventsQuery = useQuery({
    queryKey: EVENTS_QUERY_KEY,
    queryFn: () => api.listEvents(),
  });

  const staffQuery = useQuery({
    queryKey: ADMIN_STAFF_KEY,
    queryFn: () => api.listStaffUsers(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: EventStatus }) =>
      api.updateEventStatus(eventId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (payload: CreateEventForm) => api.createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: (payload: CreateStaffUserInput) => api.createStaffUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_STAFF_KEY });
    },
  });

  const enrollMfaMutation = useMutation({
    mutationFn: () => api.enrollAdminMfa(),
  });

  return {
    stats: statsQuery.data,
    events: eventsQuery.data ?? [],
    staffUsers: staffQuery.data ?? [],
    isLoading: statsQuery.isLoading || eventsQuery.isLoading,
    updateStatus: updateStatusMutation,
    createEvent: createEventMutation,
    createStaff: createStaffMutation,
    enrollMfa: enrollMfaMutation,
  };
}
