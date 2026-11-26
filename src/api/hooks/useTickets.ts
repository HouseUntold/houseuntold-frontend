import { InitCheckoutInput, SubmitUtrInput } from "@/models/ticket.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../endpoints/tickets";
import { qk } from "../keys";
import { queryClient } from "../queryClient";

export function useTicket(id: string) {
  return useQuery({
    queryKey: qk.tickets.detail(id),
    queryFn: () => ticketsApi.detail(id),
    enabled: !!id,
  });
}

export function useTicketLookup(query: string) {
  return useQuery({
    queryKey: ["tickets", "lookup", query],
    queryFn: () => ticketsApi.lookup(query),
    enabled: !!query.trim(),
    retry: false,
  });
}

export function useTicketSearch(barcode: string) {
  return useQuery({
    queryKey: qk.tickets.search(barcode),
    queryFn: () => ticketsApi.searchByBarcode(barcode),
    enabled: !!barcode && barcode.length === 5,
  });
}

export function useAdminTicketSearch(query: string, waPending = false, cursor = "", enabled = true) {
  return useQuery({
    queryKey: qk.tickets.adminSearch(query, waPending, cursor),
    queryFn: () => ticketsApi.adminSearch(query, waPending, cursor),
    enabled,
  });
}

export function useMarkWaSent(current: { query: string; waPending: boolean; cursor: string } = { query: "", waPending: false, cursor: "" }) {
  return useMutation({
    mutationFn: (ticketId: string) => ticketsApi.markWaSent(ticketId),
    onSuccess: (_, ticketId) => {
      queryClient.setQueryData(qk.tickets.adminSearch(current.query, current.waPending, current.cursor), (old: unknown) => {
        if (!old || typeof old !== "object" || !("tickets" in old)) return old;
        const page = old as { tickets: { id: string }[]; nextCursor: string; hasMore: boolean };
        return { ...page, tickets: page.tickets.filter((ticket) => ticket.id !== ticketId) };
      });
      if (current.waPending) queryClient.invalidateQueries({ queryKey: qk.tickets.adminSearch(current.query, false, "") });
    },
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (input: InitCheckoutInput) => ticketsApi.checkout(input),
  });
}

export function useSubmitUtr() {
  return useMutation({
    mutationFn: (input: SubmitUtrInput) => ticketsApi.submitUtr(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}

export function useCheckInGate() {
  return useMutation({
    mutationFn: (qrToken: string) => ticketsApi.checkInGateTicket(qrToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tickets.all });
    },
  });
}
