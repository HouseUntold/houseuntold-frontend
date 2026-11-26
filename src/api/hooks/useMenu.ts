import { CreateMenuItemInput, MenuItem } from "@/models/menu.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { menuApi } from "../endpoints/menu";
import { qk } from "../keys";
import { queryClient } from "../queryClient";

export function useMenu() {
  return useQuery({
    queryKey: qk.menu.list(),
    queryFn: () => menuApi.list(),
    refetchInterval: 15_000,
  });
}

export function useCreateMenuItem() {
  return useMutation({
    mutationFn: (input: CreateMenuItemInput) => menuApi.create(input),
    onSuccess: (newItem) => {
      queryClient.setQueryData<MenuItem[]>(qk.menu.list(), (old = []) => [...old, newItem]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.menu.all });
    },
  });
}

export function useUpdateMenuItem() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateMenuItemInput }) => menuApi.update(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.menu.all });
    },
  });
}

export function useDeleteMenuItem() {
  return useMutation({
    mutationFn: (id: string) => menuApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: qk.menu.list() });
      const prev = queryClient.getQueryData<MenuItem[]>(qk.menu.list());
      queryClient.setQueryData<MenuItem[]>(qk.menu.list(), (old = []) => old.filter((item) => item.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qk.menu.list(), ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.menu.all });
    },
  });
}
