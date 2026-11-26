import { authApi } from "@/api/endpoints/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import { AlertCircle, ArrowLeft, Loader2, Shield } from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const { showToast } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      const message = "Enter your staff username and password.";
      setError(message);
      showToast(message, "warning");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.login({ username: username.trim(), password: password.trim() });
      const rawRole = (res.staff?.role || res.user?.role || "CUSTOMER").toUpperCase();
      let role: any = "CUSTOMER";
      if (rawRole === "ADMIN") role = "ADMIN";
      else if (rawRole === "SCANNER" || rawRole === "GATEKEEPER") role = "GATEKEEPER";
      else if (rawRole === "BARTENDER") role = "BARTENDER";

      const token = res.access_token || res.token || "session-token";
      const user = res.user || {
        id: res.staff?.id || "staff-id",
        username: res.staff?.username || username,
        role,
        isActive: true,
      };

      setAuth(user, token);
      showToast(`Welcome back, ${user.username}!`, "success");

      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (role === "GATEKEEPER") {
        navigate("/gatekeeper", { replace: true });
      } else if (role === "BARTENDER") {
        navigate("/bartender", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      const message = err.response?.data?.error || "Those credentials don't match. Check your username and password.";
      setError(message);
      showToast(message, "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass = `w-full px-3.5 py-2.5 rounded-lg bg-[var(--color-canvas)] border text-[var(--color-ink)] placeholder-[var(--color-muted)]/50 text-sm focus:ring-2 focus:ring-[var(--color-brand)]/10 focus:outline-none disabled:opacity-60 transition-colors ${
    error
      ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]"
      : "border-[var(--color-hairline)] focus:border-[var(--color-brand)]"
  }`;

  return (
    <div className="max-w-md mx-auto py-12 space-y-6 text-left animate-fade-in pb-20">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] active:scale-[0.98] transition-[color,transform] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to site
      </Link>

      <div className="p-6 sm:p-8 rounded-2xl bg-[var(--color-surface)]/85 border border-[var(--color-hairline)]/70 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-brand)] flex items-center justify-center mx-auto shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Staff sign in</h1>
          <p className="text-xs text-[var(--color-muted)]">
            For admin, gate, and bar teams. Guests don't need an account.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div
              id="login-error"
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/35 text-xs text-[var(--color-danger)] animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="staff-username"
              className="block text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider"
            >
              Staff username
            </label>
            <input
              id="staff-username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              required
              autoFocus
              autoComplete="username"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              className={fieldClass}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="staff-password"
              className="block text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider"
            >
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              required
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              className={fieldClass}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 px-4 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-text)] font-semibold text-sm transition-[background-color,transform,opacity] duration-150 ease-[var(--ease-out)] hover:bg-[var(--color-brand-hover)] active:scale-[0.97] cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Signing in..." : "Sign in"}
            </span>
          </button>
        </form>

        <div className="p-3 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)]/50 text-center text-[11px] text-[var(--color-muted)]">
          Guests book and track tickets without signing in.
        </div>
      </div>
    </div>
  );
};
