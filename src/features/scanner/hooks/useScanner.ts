import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { TICKETS_QUERY_KEY } from "../../booking/hooks/useCheckout";

export const RECENT_SCANS_KEY = ["scanner", "recent"] as const;

export function useScanner() {
  const queryClient = useQueryClient();

  const recentScansQuery = useQuery({
    queryKey: RECENT_SCANS_KEY,
    queryFn: () => api.listRecentScans(),
  });

  const ticketsQuery = useQuery({
    queryKey: TICKETS_QUERY_KEY,
    queryFn: () => api.listTickets(),
  });

  const lookupMutation = useMutation({
    mutationFn: (query: string) => api.lookupTicketByCodeOrJwt(query),
  });

  const admitMutation = useMutation({
    mutationFn: ({ ticketId, seatId }: { ticketId: string; seatId?: string }) => api.admitTicket(ticketId, seatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECENT_SCANS_KEY });
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });

  return {
    recentScans: recentScansQuery.data ?? [],
    allTickets: ticketsQuery.data ?? [],
    lookupTicket: lookupMutation,
    admitTicket: admitMutation,
  };
}
