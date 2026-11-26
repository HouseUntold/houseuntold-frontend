import { useAuthStore } from "@/stores/auth.store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { StaffAccount, usersApi } from "../endpoints/users";
import { queryClient } from "../queryClient";

export const staffKeys = {
  all: ["staff"] as const,
  list: () => [...staffKeys.all, "list"] as const,
};

export function useStaffList() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  return useQuery<StaffAccount[]>({
    queryKey: staffKeys.list(),
    queryFn: () => usersApi.listStaff(),
    enabled: !!token && role === "ADMIN",
    refetchInterval: 15_000,
  });
}

export function useCreateStaff() {
  return useMutation({
    mutationFn: (data: { username: string; password?: string; role: string }) => usersApi.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

export function useDeactivateStaff() {
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivateStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

export function useUpdateStaffPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => usersApi.updatePassword(id, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}
