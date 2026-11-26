import { CustomerOrderTrackView } from "@/features/customer/CustomerOrderTrackView";
import { EventsPageView } from "@/features/events/EventsPageView";
import { HelpView } from "@/features/help/HelpView";
import { LandingView } from "@/features/landing/LandingView";
import { LoginPage } from "@/pages/LoginPage";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "./guards";

const CustomerEventDetailView = React.lazy(() =>
  import("@/features/customer/CustomerEventDetailView").then((m) => ({ default: m.CustomerEventDetailView }))
);
const AdminDashboard = React.lazy(() =>
  import("@/features/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);
const GatekeeperConsole = React.lazy(() =>
  import("@/features/gatekeeper/GatekeeperConsole").then((m) => ({ default: m.GatekeeperConsole }))
);
const BartenderConsole = React.lazy(() =>
  import("@/features/bartender/BartenderConsole").then((m) => ({ default: m.BartenderConsole }))
);

const FallbackLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-[var(--color-hairline-strong)] border-t-[var(--color-brand)] rounded-full animate-spin" />
      <span className="text-xs tracking-wide text-[var(--color-muted)]">Loading…</span>
    </div>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 1. Public Landing Page & Catalog */}
      <Route path="/" element={<LandingView />} />
      <Route path="/events" element={<EventsPageView />} />

      {/* 2. Customer Flow */}
      <Route
        path="/events/:id"
        element={
          <React.Suspense fallback={<FallbackLoader />}>
            <CustomerEventDetailView />
          </React.Suspense>
        }
      />
      <Route path="/orders/track" element={<CustomerOrderTrackView />} />
      <Route path="/help" element={<HelpView />} />

      {/* Staff Auth */}
      <Route path="/auth/login" element={<LoginPage />} />

      {/* 3. Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <RequireRole role="ADMIN">
            <React.Suspense fallback={<FallbackLoader />}>
              <AdminDashboard />
            </React.Suspense>
          </RequireRole>
        }
      />
      <Route
        path="/admin/:section"
        element={
          <RequireRole role="ADMIN">
            <React.Suspense fallback={<FallbackLoader />}>
              <AdminDashboard />
            </React.Suspense>
          </RequireRole>
        }
      />

      {/* 4. Gatekeeper Console */}
      <Route
        path="/gatekeeper"
        element={
          <RequireRole role="GATEKEEPER">
            <React.Suspense fallback={<FallbackLoader />}>
              <GatekeeperConsole />
            </React.Suspense>
          </RequireRole>
        }
      />

      {/* 5. Bartender Console */}
      <Route
        path="/bartender"
        element={
          <RequireRole role="BARTENDER">
            <React.Suspense fallback={<FallbackLoader />}>
              <BartenderConsole />
            </React.Suspense>
          </RequireRole>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
