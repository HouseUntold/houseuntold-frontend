import { ToastContainer } from "@/components/ui/ToastContainer";
import { startInactivityWatcher } from "@/lib/session";
import { useAuthStore } from "@/stores/auth.store";
import { connectSocket, disconnectSocket } from "@/ws/socket";
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;
    connectSocket();
    const stopInactivityWatcher = startInactivityWatcher();
    return () => {
      stopInactivityWatcher();
      disconnectSocket();
    };
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen text-[var(--color-ink)] flex flex-col font-sans selection:bg-[var(--color-brand)] selection:text-[var(--color-brand-text)]">
      <Topbar />
      <Sidebar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0 animate-fade-in" key={pathname}>
        {children}
      </main>
      <footer className="w-full border-t border-[var(--color-hairline)]/40 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-bold text-[var(--color-ink)] tracking-tight">HouseUntold</p>
            <p className="text-xs text-[var(--color-muted)]">&copy; {new Date().getFullYear()} HouseUntold. All rights reserved.</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2 text-xs">
            <Link to="/help" className="font-semibold text-[var(--color-brand)] hover:underline transition-colors">Help &amp; Support</Link>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {[
                { phone: "+917888126463", label: "+91 78881 26463" },
                { phone: "+918698901094", label: "+91 86989 01094" },
              ].map((c) => (
                <div key={c.phone} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface)]/70 px-2.5 py-1.5 transition-all duration-200 hover:border-[var(--color-brand)]/50 hover:-translate-y-0.5">
                  <a href={`tel:${c.phone}`} className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-brand)] transition-colors">{c.label}</a>
                  <span className="text-[var(--color-hairline-strong)]">·</span>
                  <a href={`https://wa.me/${c.phone.replace("+", "")}`} target="_blank" rel="noreferrer" className="font-semibold text-[var(--color-success)] hover:opacity-80 transition-opacity">WhatsApp</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
      <ToastContainer />
    </div>
  );
};
