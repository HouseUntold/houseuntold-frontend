import { create } from "zustand";

export interface Toast {
  id: string;
  type: "success" | "warning" | "danger" | "info";
  message: string;
}

interface UiState {
  sidebarOpen: boolean;
  theme: "dark" | "light";
  toasts: Toast[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  showToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  theme: "dark",
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  showToast: (message, type = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
