import { api } from "../client";

export interface StaffAccount {
  id: string;
  username: string;
  role: "ADMIN" | "SCANNER" | "BARTENDER";
  is_active: boolean;
  created_at: string;
}

export const usersApi = {
  listStaff: async (): Promise<StaffAccount[]> => {
    const res = await api.get("/admin/staff");
    return res.data;
  },
  createStaff: async (data: { username: string; password?: string; role: string }) => {
    const res = await api.post("/admin/staff", data);
    return res.data;
  },
  deactivateStaff: async (id: string) => {
    const res = await api.delete(`/admin/staff/${id}`);
    return res.data;
  },
  updatePassword: async (id: string, newPassword: string) => {
    const res = await api.patch(`/admin/staff/${id}/password`, { password: newPassword });
    return res.data;
  },
};
