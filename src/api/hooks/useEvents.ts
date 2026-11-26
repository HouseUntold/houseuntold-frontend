import { CreateEventInput, Event as EventModel } from "@/models/event.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EventArtistInput, eventsApi, TierInput } from "../endpoints/events";
import { qk } from "../keys";
import { queryClient } from "../queryClient";

type EventUpdateInput = Partial<CreateEventInput> & { artists?: EventArtistInput[] };

export function useEvents() {
  return useQuery({
    queryKey: qk.events.list(),
    queryFn: () => eventsApi.list(),
    staleTime: 0,
    refetchInterval: 15_000,
  });
}

export function useAdminEvents() {
  return useQuery({
    queryKey: qk.events.list({ admin: true }),
    queryFn: () => eventsApi.adminList(),
    refetchInterval: 15_000,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: qk.events.detail(id),
    queryFn: () => eventsApi.detail(id),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: 15_000,
  });
}

export function useEventSeats(id: string) {
  return useQuery({
    queryKey: qk.events.seats(id),
    queryFn: () => eventsApi.seats(id),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  return useMutation({
    mutationFn: (input: CreateEventInput) => eventsApi.create(input),
    onSuccess: (newEvent) => {
      queryClient.setQueryData<EventModel[]>(qk.events.list(), (old = []) => [newEvent, ...old]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}

export function useUpdateEvent() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EventUpdateInput }) => eventsApi.update(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}

export function useDeleteEvent() {
  return useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}

export function useSetFirst99Active() {
  return useMutation({
    mutationFn: ({ eventId, isFirst99Active }: { eventId: string; isFirst99Active: boolean }) =>
      eventsApi.setFirst99Active(eventId, isFirst99Active),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}

export function useCreateTier() {
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: TierInput }) => eventsApi.createTier(eventId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}

export function useUpdateTier() {
  return useMutation({
    mutationFn: ({ tierId, data }: { tierId: string; data: Partial<TierInput> }) => eventsApi.updateTier(tierId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}

export function useUpdateTierPrice() {
  return useMutation({
    mutationFn: ({
      tierId,
      data,
    }: {
      tierId: string;
      data: { base_price: number; fnb_credit: number };
    }) => eventsApi.updateTierPrice(tierId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}

export function useCreateArtist() {
  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: { name: string; category: string; description?: string };
    }) => eventsApi.createArtist(eventId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}

export function useDeleteArtist() {
  return useMutation({
    mutationFn: (artistId: string) => eventsApi.deleteArtist(artistId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.events.all });
    },
  });
}
