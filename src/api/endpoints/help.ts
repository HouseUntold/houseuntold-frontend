import { api } from "@/api/client";

export type HelpMessage = {
  id: string;
  name: string;
  phone: string;
  message: string;
  event_id?: string | null;
  is_resolved: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
};

export type SubmitHelpInput = {
  name: string;
  phone: string;
  message: string;
  event_id?: string;
};

export const helpApi = {
  async submit(input: SubmitHelpInput) {
    const { data } = await api.post("/help", input);
    return data;
  },
  async list(resolved?: boolean) {
    const { data } = await api.get("/admin/help", {
      params: { limit: 50, ...(resolved === undefined ? {} : { resolved }) },
    });
    return (data.messages || []) as HelpMessage[];
  },
  async resolve(id: string) {
    const { data } = await api.post(`/admin/help/${id}/resolve`);
    return data;
  },
};
