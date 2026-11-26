import React, { useEffect } from "react";
import type { User, UserRole } from "../../../lib/api/types";

interface RbacGuardProps {
  user: User | null;
  isLoading: boolean;
  allowedRoles: UserRole[];
  onRedirectLogin: () => void;
  onRedirectForbidden: (allowedRoles: UserRole[]) => void;
  children: React.ReactNode;
}

export const RbacGuard: React.FC<RbacGuardProps> = ({
  user,
  isLoading,
  allowedRoles,
  onRedirectLogin,
  onRedirectForbidden,
  children,
}) => {
  const permitted = Boolean(user && allowedRoles.includes(user.role));

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      onRedirectLogin();
    } else if (!allowedRoles.includes(user.role)) {
      onRedirectForbidden(allowedRoles);
    }
  }, [isLoading, user, allowedRoles, onRedirectLogin, onRedirectForbidden]);

  if (isLoading) {
    return (
      <div className="max-w-[720px] mx-auto px-5 py-16">
        <div className="h-44 rounded-[14px] bg-white border border-[#E7E5E0] animate-pulse" />
      </div>
    );
  }

  if (!permitted) {
    return null;
  }

  return <>{children}</>;
};
