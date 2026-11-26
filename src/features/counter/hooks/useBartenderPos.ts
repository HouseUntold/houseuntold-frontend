import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { AddFnbMenuItemInput, FnbQuoteRequest, FnbSettleRequest } from "../../../lib/api/types";
import { TICKETS_QUERY_KEY } from "../../booking/hooks/useCheckout";

export const FNB_MENU_KEY = ["counter", "menu"] as const;
export const FNB_TX_KEY = ["counter", "transactions"] as const;

export function useBartenderPos() {
  const queryClient = useQueryClient();

  const menuQuery = useQuery({
    queryKey: FNB_MENU_KEY,
    queryFn: () => api.listFnbMenu(),
  });

  const transactionsQuery = useQuery({
    queryKey: FNB_TX_KEY,
    queryFn: () => api.listFnbTransactions(),
  });

  const lookupBarCodeMutation = useMutation({
    mutationFn: (barCode: string) => api.lookupTicketByBarCode(barCode),
  });

  const addMenuItemMutation = useMutation({
    mutationFn: (payload: AddFnbMenuItemInput) => api.addFnbMenuItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FNB_MENU_KEY });
    },
  });

  const quoteOrderMutation = useMutation({
    mutationFn: (payload: FnbQuoteRequest) => api.quoteFnbOrder(payload),
  });

  const settleMutation = useMutation({
    mutationFn: (payload: FnbSettleRequest) => api.settleFnbOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FNB_TX_KEY });
    },
  });

  return {
    menu: menuQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    lookupBarCode: lookupBarCodeMutation,
    addMenuItem: addMenuItemMutation,
    quoteOrder: quoteOrderMutation,
    settleOrder: settleMutation,
  };
}
