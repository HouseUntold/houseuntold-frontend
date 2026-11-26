import { helpApi } from "@/api/endpoints/help";
import { qk } from "@/api/keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useHelpMessages = (resolved?: boolean) =>
  useQuery({
    queryKey: qk.help.list(resolved),
    queryFn: () => helpApi.list(resolved),
    refetchInterval: 15000,
  });

export const useSubmitHelp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: helpApi.submit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.help.all }),
  });
};

export const useResolveHelpMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: helpApi.resolve,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.help.all }),
  });
};
