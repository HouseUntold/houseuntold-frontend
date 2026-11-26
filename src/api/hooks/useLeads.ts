import { useQuery } from "@tanstack/react-query";
import { leadsApi } from "../endpoints/leads";

export function useCheckoutLeads(params: { q?: string; eventId?: string; includeCompleted?: boolean; limit?: number; offset?: number }, enabled = true) {
  return useQuery({
    queryKey: ["admin", "leads", params],
    queryFn: () => leadsApi.list(params),
    enabled,
    refetchInterval: 15_000,
  });
}
