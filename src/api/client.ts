import { env } from "@/lib/env";
import type { UserRole } from "@/models/auth.schema";
import { useAuthStore } from "@/stores/auth.store";
import axios from "axios";

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const NO_SESSION_ERROR_PATHS = [
  "/auth/login",
  "/auth/refresh",
];
let refreshPromise: Promise<void> | null = null;

const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .then((res) => {
        const data = res.data || {};
        const token = data.access_token || data.token;
        const staff = data.staff;
        const user = data.user || (staff
          ? {
            id: staff.id,
            username: staff.username,
            role: staff.role as UserRole,
            isActive: true,
          }
          : null);
        if (token && user) useAuthStore.getState().setAuth(user, token);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = config.method?.toLowerCase() || "";
  if (["post", "put", "patch", "delete"].includes(method)) {
    if (!config.headers["Idempotency-Key"]) {
      const idKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `idemp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
      config.headers["Idempotency-Key"] = idKey;
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config: any = err.config || {};
    const url = String(config.url || "");
    const status = err.response?.status;

    if (status !== 401) return Promise.reject(err);
    if (NO_SESSION_ERROR_PATHS.some((p) => url.includes(p))) {
      return Promise.reject(err);
    }
    if (config._retry) {
      useAuthStore.getState().logout();
      return Promise.reject(err);
    }

    config._retry = true;
    try {
      await refreshSession();
      return api.request(config);
    } catch {
      useAuthStore.getState().logout();
      return Promise.reject(err);
    }
  },
);
