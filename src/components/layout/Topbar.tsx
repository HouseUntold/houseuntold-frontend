import { formatLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import { Calendar, GlassWater, LifeBuoy, LogIn, LogOut, Menu, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import React from "react";
import { Link, NavLink } from "react-router-dom";

const guestLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-lg px-2.5 py-2 -mx-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25 active:bg-[var(--color-surface-hover)] ${
    isActive
      ? "bg-[var(--color-surface-hover)] font-semibold text-[var(--color-brand)]"
      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"
  }`;

export const Topbar: React.FC = () => {
  const { user, role, logout } = useAuthStore();
  const { toggleSidebar } = useUiStore();

  const roleHome = role === "ADMIN"
    ? { to: "/admin", label: "Admin Console", icon: Sparkles, accent: "text-[var(--color-brand)]" }
    : role === "GATEKEEPER"
    ? { to: "/gatekeeper", label: "Gate Check-In", icon: ShieldCheck, accent: "text-[var(--color-success)]" }
    : role === "BARTENDER"
    ? { to: "/bartender", label: "Bar Orders", icon: GlassWater, accent: "text-[var(--color-brand-hover)]" }
    : null;
  const RoleIcon = roleHome?.icon;

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[var(--color-canvas)]/92 backdrop-blur-xl border-b border-[var(--color-hairline)]/35 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          className="p-2.5 min-h-11 min-w-11 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2.5 rounded-lg py-1 -my-1 group focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25">
          <div className="w-8 h-8 rounded-full border border-[var(--color-hairline)] flex items-center justify-center font-bold text-xs tracking-tighter text-[var(--color-ink)] bg-[var(--color-surface)]/60 group-hover:border-[var(--color-brand)] transition-colors overflow-hidden">
            <img className="w-full h-full object-cover" src="/assets/images/Logo.jpeg" alt="House Untold" />
          </div>
          <span className="font-bold text-lg text-[var(--color-ink)] tracking-tight group-hover:text-[var(--color-ink)]/90 transition-colors">
            House Untold
          </span>
        </Link>
      </div>

      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[var(--color-muted)] min-w-0">
        {user && roleHome
          ? (
            <NavLink
              to={roleHome.to}
              className={({ isActive }) =>
                `${roleHome.accent} flex items-center gap-1.5 rounded-lg px-2.5 py-2 -mx-1 text-sm font-semibold transition-colors hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25 ${
                  isActive ? "bg-[var(--color-surface-hover)] underline underline-offset-4" : ""
                }`}
            >
              {RoleIcon && <RoleIcon className="w-4 h-4" />} {roleHome.label}
            </NavLink>
          )
          : (
            <>
              <NavLink to="/events" className={guestLinkClass}>
                <Calendar className="w-4 h-4 text-[var(--color-brand)]" /> Events
              </NavLink>
              <NavLink to="/orders/track" className={guestLinkClass}>
                <Ticket className="w-4 h-4 text-[var(--color-brand)]" /> My Ticket
              </NavLink>
              <NavLink to="/help" className={guestLinkClass}>
                <LifeBuoy className="w-4 h-4 text-[var(--color-brand)]" /> Help
              </NavLink>
            </>
          )}
      </nav>

      <div className="flex items-center gap-3">
        {user
          ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-medium text-[var(--color-ink)] bg-[var(--color-surface)] px-2.5 py-1 rounded-md border border-[var(--color-hairline)]/50">
                {user.username} · {formatLabel(role)}
              </span>
              <button
                onClick={logout}
                aria-label="Sign out"
                className="min-h-11 min-w-11 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]/50 active:bg-[var(--color-danger-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]/25 p-2 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )
          : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-1.5 min-h-11 bg-[var(--color-brand)] text-[var(--color-brand-text)] font-semibold text-xs px-3.5 py-2 rounded-lg hover:bg-[var(--color-brand-hover)] active:bg-[var(--color-brand-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-text)]/40 transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
      </div>
    </header>
  );
};
