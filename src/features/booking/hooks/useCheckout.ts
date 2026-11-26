import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { CheckoutConfirmRequest } from "../../../lib/api/types";
import { EVENTS_QUERY_KEY } from "../../events/hooks/useEvents";
import { seatMapQueryKey } from "./useSeatSelection";

export const TICKETS_QUERY_KEY = ["tickets"] as const;

export function useTickets() {
  return useQuery({
    queryKey: TICKETS_QUERY_KEY,
    queryFn: () => api.listTickets(),
  });
}

export function useCheckout(eventId: string) {
  const queryClient = useQueryClient();

  const initCheckoutMutation = useMutation({
    mutationFn: (seatIds: string[]) => api.initCheckout(eventId, seatIds),
  });

  const sendOtpMutation = useMutation({
    mutationFn: (phone: string) => api.sendPhoneOtp(phone),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ phone, otp }: { phone: string; otp: string }) => api.verifyPhoneOtp(phone, otp),
  });

  const confirmCheckoutMutation = useMutation({
    mutationFn: (payload: CheckoutConfirmRequest) => api.confirmCheckout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: seatMapQueryKey(eventId) });
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });

  return {
    initCheckout: initCheckoutMutation,
    sendOtp: sendOtpMutation,
    verifyOtp: verifyOtpMutation,
    confirmCheckout: confirmCheckoutMutation,
  };
}
