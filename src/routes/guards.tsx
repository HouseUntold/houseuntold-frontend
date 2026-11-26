import type { UserRole } from "@/models/auth.schema";
import { useAuthStore } from "@/stores/auth.store";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface RequireRoleProps {
  role: UserRole;
  children: React.ReactElement;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const { user, role: currentRole, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Admin has super-admin privileges across all consoles
  if (currentRole === "ADMIN" || currentRole === role) {
    return children;
  }

  return (
    <div className="py-20 text-center max-w-md mx-auto space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] flex items-center justify-center mx-auto text-2xl font-bold">
        !
      </div>
      <h2 className="text-xl font-bold text-[var(--color-ink)]">Access Restricted</h2>
      <p className="text-sm text-[var(--color-muted)]">
        This terminal requires the <span className="font-semibold text-[var(--color-ink)]">{role}</span>{" "}
        security clearance. Your current role is{" "}
        <span className="font-semibold text-[var(--color-ink)]">{currentRole}</span>.
      </p>
    </div>
  );
};
