import { PlaceOrderInput } from "@/models/order.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ordersApi } from "../endpoints/orders";
import { qk } from "../keys";
import { queryClient } from "../queryClient";

export function useTicketHistory(barCode: string) {
  return useQuery({
    queryKey: qk.orders.history(barCode),
    queryFn: () => ordersApi.history(barCode),
    enabled: !!barCode,
  });
}

export function useRedeemOrder() {
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => ordersApi.redeem(input),
    onSuccess: (order) => {
      if (order.barCode) {
        queryClient.invalidateQueries({ queryKey: qk.orders.history(order.barCode) });
        queryClient.invalidateQueries({ queryKey: qk.tickets.search(order.barCode) });
      }
    },
  });
}
