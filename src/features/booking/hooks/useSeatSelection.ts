import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { SeatMapResponse } from "../../../lib/api/types";

export function seatMapQueryKey(eventId: string) {
  return ["seat-map", eventId] as const;
}

export function useSeatSelection(
  eventId: string,
  onNotify: (title: string, tone: "success" | "error" | "info") => void,
) {
  const queryClient = useQueryClient();
  const key = seatMapQueryKey(eventId);

  const seatMapQuery = useQuery({
    queryKey: key,
    queryFn: () => api.getSeatMap(eventId),
    enabled: Boolean(eventId),
  });

  const toggleSeatMutation = useMutation({
    mutationFn: (seatId: string) => api.toggleSeatHold(eventId, seatId),
    onMutate: async (seatId: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: key });

      // Snapshot the previous seat map state
      const previous = queryClient.getQueryData<SeatMapResponse>(key);

      if (previous) {
        const nextSeats = previous.seats.map((seat) => {
          if (seat.id !== seatId) return seat;
          if (seat.status === "AVAILABLE") {
            return { ...seat, status: "SELECTED_BY_ME" as const };
          }
          if (seat.status === "SELECTED_BY_ME") {
            return { ...seat, status: "AVAILABLE" as const };
          }
          return seat;
        });

        queryClient.setQueryData<SeatMapResponse>(key, {
          ...previous,
          seats: nextSeats,
        });
      }

      return { previous };
    },
    onError: (err, _seatId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      onNotify(
        err instanceof Error ? err.message : "Seat no longer available, please select another.",
        "error",
      );
    },
    onSuccess: (serverData) => {
      queryClient.setQueryData(key, serverData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const clearHoldsMutation = useMutation({
    mutationFn: () => api.clearSeatHolds(eventId),
    onSuccess: (serverData) => {
      queryClient.setQueryData(key, serverData);
    },
  });

  return {
    data: seatMapQuery.data,
    isLoading: seatMapQuery.isLoading,
    toggleSeat: toggleSeatMutation,
    clearHolds: clearHoldsMutation,
  };
}
