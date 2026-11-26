import { useMutation, useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../endpoints/analytics";
import { qk } from "../keys";
import { queryClient } from "../queryClient";

export function useAnalytics(eventId?: string) {
  return useQuery({
    queryKey: qk.analytics.stats(eventId),
    queryFn: () => analyticsApi.stats(eventId || ""),
    enabled: !!eventId,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: qk.analytics.stats("overview"),
    queryFn: () => analyticsApi.overview(),
    refetchInterval: 15_000,
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: qk.analytics.logs(),
    queryFn: () => analyticsApi.auditLogs(),
  });
}

export function useBookingsQueue() {
  return useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => analyticsApi.bookings(),
    refetchInterval: 15_000,
  });
}

export function useVerifyBooking() {
  return useMutation({
    mutationFn: ({ bookingId, action, reason }: { bookingId: string; action: "APPROVE" | "REJECT"; reason?: string }) =>
      analyticsApi.verifyBooking(bookingId, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
      queryClient.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}
