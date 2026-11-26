import { queryClient } from "@/api/queryClient";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/auth.store";

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectDelay = 1000;
let reconnectAttempts = 0;
const listeners = new Map<string, Set<(p: unknown) => void>>();

const scheduleReconnect = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    connectSocket();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
};

export function connectSocket() {
  if (typeof window === "undefined") return;
  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated || auth.role !== "ADMIN") return;
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;

  try {
    socket = new WebSocket(env.VITE_WS_URL);

    socket.onopen = () => {
      reconnectDelay = 1000;
      reconnectAttempts = 0;
      void queryClient.invalidateQueries();
    };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const type = msg.type || "MESSAGE";
        const payload = msg.payload || msg;
        listeners.get(type)?.forEach((fn) => fn(payload));
        listeners.get("*")?.forEach((fn) => fn(msg));
      } catch {
        // non-json frame
      }
    };

    socket.onclose = () => {
      socket = null;
      const auth = useAuthStore.getState();
      if (!auth.isAuthenticated || auth.role !== "ADMIN") return;
      if (reconnectAttempts++ >= 5) return;
      scheduleReconnect();
    };

    socket.onerror = () => {
      if (socket) socket.close();
    };
  } catch {
    socket = null;
    scheduleReconnect();
  }
}

export function disconnectSocket() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  reconnectDelay = 1000;
  reconnectAttempts = 0;
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function onSocketEvent<T>(type: string, fn: (p: T) => void) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(fn as (p: unknown) => void);

  return () => {
    listeners.get(type)?.delete(fn as (p: unknown) => void);
  };
}
