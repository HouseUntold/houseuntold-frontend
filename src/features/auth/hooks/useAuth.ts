import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type {
  AdminLoginForm,
  AdminMfaInput,
  AuthSession,
  FirebasePhoneAuthInput,
  GoogleAuthInput,
} from "../../../lib/api/types";
import { useAuthStore } from "../../../stores/auth.store";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(() => api.getAccessExpiresAt());

  const userQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => api.getCurrentUser(),
  });

  const applySession = (session: AuthSession) => {
    setAccessExpiresAt(session.accessExpiresAt);
    queryClient.setQueryData(AUTH_QUERY_KEY, session.user);
    return session.user;
  };

  // Proactive background JWT auto-refresh 60s before access token expiry
  useEffect(() => {
    if (!accessExpiresAt) return;
    const expiryMs = new Date(accessExpiresAt).getTime();
    if (Number.isNaN(expiryMs)) return;

    const refreshDelay = Math.max(5_000, expiryMs - Date.now() - 60_000);
    const timer = window.setTimeout(() => {
      void api
        .refreshSession()
        .then((session) => {
          applySession(session);
        })
        .catch(() => {
          // Next protected call handles expired session cleanly
        });
    }, refreshDelay);

    return () => window.clearTimeout(timer);
  }, [accessExpiresAt]);

  const googleLoginMutation = useMutation({
    mutationFn: (payload: GoogleAuthInput) => api.loginWithGoogle(payload),
    onSuccess: (session) => applySession(session),
  });

  const firebasePhoneMutation = useMutation({
    mutationFn: (payload: FirebasePhoneAuthInput) => api.loginWithFirebasePhone(payload),
    onSuccess: (session) => applySession(session),
  });

  const sendPhoneOtpMutation = useMutation({
    mutationFn: (phone: string) => api.sendPhoneOtp(phone),
  });

  const staffOrAdminLoginMutation = useMutation({
    mutationFn: (payload: AdminLoginForm) => api.loginStaffOrAdmin(payload),
    onSuccess: (res) => {
      if (!res.requires_mfa) {
        applySession({ user: res.user, accessExpiresAt: res.accessExpiresAt });
      }
    },
  });

  const verifyAdminMfaMutation = useMutation({
    mutationFn: (payload: AdminMfaInput) => api.verifyAdminMfa(payload),
    onSuccess: (session) => applySession(session),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      setAccessExpiresAt(null);
      useAuthStore.getState().logout();
      queryClient.clear();
    },
  });

  return {
    user: userQuery.data ?? null,
    isLoading: userQuery.isLoading,
    accessExpiresAt,
    loginGoogle: googleLoginMutation,
    loginFirebasePhone: firebasePhoneMutation,
    sendPhoneOtp: sendPhoneOtpMutation,
    loginStaffOrAdmin: staffOrAdminLoginMutation,
    verifyAdminMfa: verifyAdminMfaMutation,
    logout: logoutMutation,
  };
}
