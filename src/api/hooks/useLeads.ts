import { useInfiniteQuery } from "@tanstack/react-query";
import { leadsApi } from "../endpoints/leads";

export function useCheckoutLeads(params: { q?: string; eventId?: string; includeCompleted?: boolean; limit?: number }, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["admin", "leads", params],
    queryFn: ({ pageParam }) => leadsApi.list({ ...params, cursor: pageParam || undefined }),
    initialPageParam: "",
    getNextPageParam: (last) => (last.has_more && last.next_cursor ? last.next_cursor : undefined),
    enabled,
    refetchInterval: 15_000,
  });
}
