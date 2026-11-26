import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import { Calendar, GlassWater, LifeBuoy, ShieldCheck, Sparkles, Ticket, UserCheck, X } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const baseLinkClass = ({ isActive }: { isActive: boolean }) =>
  `min-h-11 px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25 active:scale-[0.99] ${
    isActive
      ? "bg-[var(--color-brand)]/10 font-semibold text-[var(--color-brand)] shadow-[inset_3px_0_0_var(--color-brand)]"
      : "text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)]"
  }`;

const roleLinkClass = (accent: string) => ({ isActive }: { isActive: boolean }) =>
  `min-h-11 px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25 active:scale-[0.99] ${
    isActive
      ? "bg-[var(--color-brand)] text-[var(--color-brand-text)] active:bg-[var(--color-brand-hover)]"
      : `bg-[var(--color-surface)] ${accent} hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)]`
  }`;

export const Sidebar: React.FC = () => {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const { role, user, logout } = useAuthStore();
  const { pathname } = useLocation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const adminSections = [
    { to: "/admin", label: "Overview" }, { to: "/admin/bookings", label: "Payments" }, { to: "/admin/tickets", label: "Tickets" },
    { to: "/admin/events", label: "Events" }, { to: "/admin/staff", label: "Staff" }, { to: "/admin/menu", label: "Menu" }, { to: "/admin/help", label: "Help Requests" },
  ];
  const roleHome = role === "ADMIN"
    ? { to: "/admin", label: "Admin Console", icon: Sparkles, accent: "text-[var(--color-brand)]" }
    : role === "GATEKEEPER"
    ? { to: "/gatekeeper", label: "Gate Check-In", icon: ShieldCheck, accent: "text-[var(--color-success)]" }
    : role === "BARTENDER"
    ? { to: "/bartender", label: "Bar Orders", icon: GlassWater, accent: "text-[var(--color-brand-hover)]" }
    : null;
  const RoleIcon = roleHome?.icon;

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen, setSidebarOpen]);

  if (!sidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-ink)]/15 backdrop-blur-[2px] animate-fade-in" role="dialog" aria-modal="true" aria-label="Main menu">
      <div className="fixed inset-0" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      <div className="relative z-10 w-80 max-w-[85vw] h-full bg-[var(--color-canvas)] border-r border-[var(--color-hairline)]/40 p-5 sm:p-6 flex flex-col justify-between text-left shadow-modal overflow-y-auto animate-enter-up">
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-hairline)]/30">
            <span className="font-bold text-lg text-[var(--color-ink)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full border border-[var(--color-hairline)] text-[var(--color-ink)] bg-[var(--color-surface)] flex items-center justify-center font-bold text-xs">
                HU
              </span>
              HouseUntold
            </span>
            <button
              ref={closeButtonRef}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="p-2 min-h-11 min-w-11 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {user && roleHome
              ? (
                <>
                  <NavLink to={roleHome.to} onClick={() => setSidebarOpen(false)} className={roleLinkClass(roleHome.accent)} end={role === "ADMIN"}>
                    {RoleIcon && <RoleIcon className="w-4 h-4" />} {roleHome.label}
                  </NavLink>
                  {role === "ADMIN" && (
                    <div className="pl-3 mt-1 space-y-1 border-l border-[var(--color-hairline)]/60 ml-5">
                      <p className="px-3 pt-1 pb-1 text-[11px] font-medium text-[var(--color-muted)]">Sections</p>
                      {adminSections.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.to === "/admin"} onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) => `min-h-[40px] px-3 py-2 rounded-lg text-sm flex items-center transition-colors ${isActive ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] font-medium" : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"}`}>
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              )
              : (
                <>
                  <NavLink to="/events" onClick={() => setSidebarOpen(false)} className={baseLinkClass}>
                    <Calendar className="w-4 h-4 text-[var(--color-brand)]" /> Events
                  </NavLink>
                  <NavLink to="/orders/track" onClick={() => setSidebarOpen(false)} className={baseLinkClass}>
                    <Ticket className="w-4 h-4 text-[var(--color-brand)]" /> My Ticket
                  </NavLink>
                  <NavLink to="/help" onClick={() => setSidebarOpen(false)} className={baseLinkClass}>
                    <LifeBuoy className="w-4 h-4 text-[var(--color-brand)]" /> Help &amp; Support
                  </NavLink>
                </>
              )}
          </nav>
        </div>

        <div className="pt-4 border-t border-[var(--color-hairline)]/30">
          {user
            ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-[var(--color-muted)] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[var(--color-success)]" /> Signed in as {user.username}
                </span>
                <button
                  onClick={() => {
                    logout();
                    setSidebarOpen(false);
                  }}
                  className="w-full text-left min-h-11 py-2 px-3 rounded-lg text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]/50 active:bg-[var(--color-danger-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]/25 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )
            : (
              <Link
                to="/auth/login"
                onClick={() => setSidebarOpen(false)}
                className="block w-full min-h-11 py-2.5 text-center rounded-lg bg-[var(--color-brand)] text-sm text-[var(--color-brand-text)] font-semibold hover:bg-[var(--color-brand-hover)] active:bg-[var(--color-brand-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-text)]/40 transition-colors"
              >
                Sign In
              </Link>
            )}
        </div>
      </div>
    </div>
  );
};
