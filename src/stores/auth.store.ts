import type { User, UserRole } from "@/models/auth.schema";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  setAuth: (u: User, t: string) => void;
  setRole: (r: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: "CUSTOMER",
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({
          user,
          token,
          role: user.role,
          isAuthenticated: true,
        }),
      setRole: (role) => set({ role }),
      logout: () => {
        try {
          localStorage.removeItem("venu-auth");
        } catch {}
        set({
          user: null,
          token: null,
          role: "CUSTOMER",
          isAuthenticated: false,
        });
      },
    }),
    { name: "venu-auth" },
  ),
);
