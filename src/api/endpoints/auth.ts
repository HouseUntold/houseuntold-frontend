import { AuthResponseSchema, LoginCredentials, User, UserSchema } from "@/models/auth.schema";
import { api } from "../client";

export const authApi = {
  login: async (creds: LoginCredentials) => {
    const res = await api.post("/auth/login", creds);
    return AuthResponseSchema.parse(res.data);
  },
  refresh: async () => {
    const res = await api.post("/auth/refresh");
    return AuthResponseSchema.parse(res.data);
  },
  logout: async () => {
    const res = await api.post("/auth/logout");
    return res.data;
  },
  me: async (): Promise<User> => {
    const res = await api.get("/auth/me");
    return UserSchema.parse(res.data);
  },
};
