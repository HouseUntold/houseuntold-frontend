import { authApi } from "@/api/endpoints/auth";
import { useAuthStore } from "@/stores/auth.store";

export const ACTIVITY_EVENT = "houseuntold:activity";
export const INACTIVITY_MS = 8 * 60 * 60_000;

export const startInactivityWatcher = () => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    useAuthStore.getState().logout();
  };

  const reset = () => {
    if (timer) clearTimeout(timer);
    if (!useAuthStore.getState().isAuthenticated) return;
    timer = setTimeout(() => void logout(), INACTIVITY_MS);
  };

  const events = ["pointerdown", "keydown", "scroll", "touchstart", ACTIVITY_EVENT];
  events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
  reset();

  return () => {
    if (timer) clearTimeout(timer);
    events.forEach((event) => window.removeEventListener(event, reset));
  };
};
