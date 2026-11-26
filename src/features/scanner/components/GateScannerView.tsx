import {
  CheckCircle2,
  History,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import type { ScanLookupResult } from "../../../lib/api/types";
import { PaperTicketCard } from "../../booking/components/PaperTicketCard";
import { useScanner } from "../hooks/useScanner";

interface GateScannerViewProps {
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

export const GateScannerView: React.FC<GateScannerViewProps> = ({ onNotify }) => {
  const { recentScans, allTickets, lookupTicket, admitTicket } = useScanner();
  const [query, setQuery] = useState("VNU-89421-MNT");
  const [scanResult, setScanResult] = useState<ScanLookupResult | null>(null);

  const runLookup = async (codeToLookup: string) => {
    const clean = codeToLookup.trim();
    if (!clean) return;
    try {
      const res = await lookupTicket.mutateAsync(clean);
      setScanResult(res);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Scan lookup failed", "error");
    }
  };

  useEffect(() => {
    if (!scanResult) {
      void runLookup("VNU-89421-MNT");
    }
  }, []);

  const handleAdmitAll = async () => {
    if (!scanResult?.ticket) return;
    try {
      const updated = await admitTicket.mutateAsync({ ticketId: scanResult.ticket.id });
      setScanResult({
        valid: false,
        reason: "ALREADY_CHECKED_IN",
        ticket: updated,
      });
      onNotify(`Admitted ${updated.code} · Gate stub torn`, "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Check-in failed", "error");
    }
  };

  const handleAdmitIndividual = async (seatId: string) => {
    if (!scanResult?.ticket) return;
    try {
      const updated = await admitTicket.mutateAsync({
        ticketId: scanResult.ticket.id,
        seatId,
      });
      setScanResult({
        valid: !updated.checkedIn,
        reason: updated.checkedIn ? "ALREADY_CHECKED_IN" : "VALID",
        ticket: updated,
      });
      onNotify(
        updated.checkedIn ? "All guests admitted · Gate stub torn" : "Guest marked admitted.",
        "success",
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to admit guest", "error");
    }
  };

  const handleClear = () => {
    setQuery("");
    setScanResult(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-6 pb-16 space-y-6 text-left animate-fade-in">
      {/* Header + Inline Lookup Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--color-hairline)]/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-brand)] shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider truncate">
              Gate A &bull; Main Entrance &bull; Terminal 01
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] tracking-tight leading-tight mt-0.5">
              Gate Check-In Scanner
            </h1>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runLookup(query);
          }}
          className="flex items-center gap-2 w-full lg:w-auto"
        >
          <div className="relative flex-1 lg:w-72">
            <Search
              className="w-4 h-4 text-[var(--color-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ticket code or HMAC QR..."
              aria-label="Ticket code lookup"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-sm font-mono text-[var(--color-ink)] placeholder:font-sans placeholder:text-[var(--color-muted)]/60 focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 transition-all"
            />
          </div>
          <Button type="submit" isLoading={lookupTicket.isPending} className="h-11 px-5 shrink-0">
            Scan
          </Button>
          {(query || scanResult) && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear scan"
              title="Clear scan"
              className="h-11 w-11 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Optical Scanner Frame & Recent Gate Log */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-hairline)]/80 shadow-sm p-5 sm:p-6 space-y-5">
            <div className="aspect-[4/3] rounded-xl bg-[var(--color-canvas)] border-2 border-dashed border-[var(--color-brand)]/35 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-brand)] shadow-sm mb-3">
                <ScanLine className="w-7 h-7" strokeWidth={1.75} />
              </div>
              <div className="text-sm font-bold text-[var(--color-ink)]">
                Optical QR Lens Ready
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs leading-relaxed">
                Point patron mobile pass at scanner or select a pass code below to verify.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
                Live Venue Passes
              </div>
              <div className="flex flex-wrap gap-2">
                {allTickets.slice(0, 4).map((tkt) => (
                  <button
                    key={tkt.id}
                    type="button"
                    onClick={() => {
                      setQuery(tkt.code);
                      void runLookup(tkt.code);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs num font-semibold cursor-pointer active:scale-95 transition-all ${
                      scanResult?.ticket?.id === tkt.id
                        ? "bg-[var(--color-brand)] text-[var(--color-brand-text)] border-[var(--color-brand)] shadow-sm"
                        : "bg-[var(--color-canvas)] text-[var(--color-ink)] border-[var(--color-hairline)] hover:border-[var(--color-brand)]/50"
                    }`}
                  >
                    {tkt.code}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const tampered = "eyJ0aWNrZXRfaWQiOiJ0a3RfZmFrZSJ9.tampered_hmac_sig";
                    setQuery(tampered);
                    void runLookup(tampered);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-danger)]/35 bg-[var(--color-danger-bg)]/60 text-[var(--color-danger)] text-xs num font-semibold hover:bg-[var(--color-danger-bg)] cursor-pointer active:scale-95 transition-all"
                >
                  Tampered QR
                </button>
              </div>
            </div>
          </div>

          {/* Recent Gate Log */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-hairline)]/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--color-hairline)]/70 bg-[var(--color-canvas)]/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                <History className="w-4 h-4 text-[var(--color-brand)]" />
                <span>Recent Gate Check-Ins</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] num">
                {recentScans.length}
              </span>
            </div>

            {recentScans.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-muted)]">
                No check-ins recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-hairline)]/70 px-5">
                {recentScans.slice(0, 5).map((scan) => (
                  <div key={scan.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--color-ink)] truncate">
                        {scan.patronName}
                      </div>
                      <div className="num text-xs text-[var(--color-muted)] mt-0.5 truncate">
                        {scan.ticketCode} &bull; {scan.seatLabel}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)] text-[10px] font-bold uppercase">
                        Admitted
                      </span>
                      <div className="num text-[11px] text-[var(--color-muted)] mt-1">
                        {scan.scannedAt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Paper Ticket Visual & Verification Controls */}
        <div className="lg:col-span-7 space-y-5">
          {!scanResult ? (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-hairline)] p-12 text-center text-[var(--color-muted)] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-brand)] mb-3">
                <QrCode className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Awaiting QR scan or ticket code lookup
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Verified ticket details and guest check-in controls will appear here.
              </p>
            </div>
          ) : !scanResult.ticket
            || scanResult.reason === "EXPIRED"
            || scanResult.reason === "ROTATING_QR_EXPIRED" ? (
            <div
              role="alert"
              className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-danger)]/40 p-6 sm:p-8 space-y-4 shadow-sm"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-xs font-bold num">
                <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>
                  {scanResult.reason === "EXPIRED"
                    ? "PASS EXPIRED · ENTRY DENIED"
                    : scanResult.reason === "ROTATING_QR_EXPIRED"
                    ? "ROTATING CODE EXPIRED · REFRESH PASS"
                    : "INVALID HMAC SIGNATURE · ENTRY DENIED"}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">
                {scanResult.reason === "EXPIRED"
                  ? "Ticket validity window has closed"
                  : scanResult.reason === "ROTATING_QR_EXPIRED"
                  ? "Rotating 30-second QR code is out of sync"
                  : "Unrecognized or forged QR token"}
              </h2>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                {scanResult.reason === "ROTATING_QR_EXPIRED"
                  ? "Ask the patron to wait for their 30-second rotating pass to refresh and scan again."
                  : "Cryptographic HMAC-SHA256 verification failed. Direct patron to the Box Office desk."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Verification Banner */}
              <div
                className={`px-5 py-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  scanResult.reason === "VALID"
                    ? "bg-[var(--color-success-bg)]/80 border-[var(--color-success)]/35"
                    : "bg-[var(--color-danger-bg)]/70 border-[var(--color-danger)]/35"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {scanResult.reason === "VALID" ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" strokeWidth={2} />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-[var(--color-danger)] shrink-0" strokeWidth={2} />
                  )}
                  <span
                    className={`num text-sm font-bold tracking-wide ${
                      scanResult.reason === "VALID"
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-danger)]"
                    }`}
                  >
                    {scanResult.reason === "VALID"
                      ? `VALID PASS · ${scanResult.ticket.code}`
                      : `SCANNED & TORN · ${scanResult.ticket.code}`}
                  </span>
                </div>
                <span className="num text-xs font-semibold text-[var(--color-muted)]">
                  {scanResult.ticket.seatLabels.length}{" "}
                  {scanResult.ticket.seatLabels.length === 1 ? "Seat" : "Seats"} Booked
                </span>
              </div>

              {/* Physical Ticket Card (Automatically rips end stub once checkedIn) */}
              <PaperTicketCard
                ticket={scanResult.ticket}
                actionLabel={!scanResult.ticket.checkedIn ? "Admit & Tear" : undefined}
                onAction={!scanResult.ticket.checkedIn ? handleAdmitAll : undefined}
                actionLoading={admitTicket.isPending}
              />

              {/* Per-Guest Gate Checklist while unscanned */}
              {!scanResult.ticket.checkedIn && (
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-hairline)]/80 p-5 sm:p-6 space-y-4 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Verify Guests ({scanResult.ticket.attendees.length}{" "}
                    {scanResult.ticket.attendees.length === 1 ? "Guest" : "Guests"})
                  </div>

                  <div className="divide-y divide-[var(--color-hairline)]/70 border border-[var(--color-hairline)]/80 rounded-xl overflow-hidden">
                    {scanResult.ticket.attendees.map((att) => (
                      <div
                        key={att.seatId}
                        className="p-4 bg-[var(--color-canvas)]/55 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[var(--color-ink)] truncate">
                            {att.fullName}
                          </div>
                          <div className="num text-xs text-[var(--color-muted)] mt-0.5">
                            Seat {att.seatLabel} &bull; Age {att.age}
                            {att.gender ? ` · ${att.gender}` : ""}
                          </div>
                        </div>

                        {att.admitted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-success-bg)] text-xs font-bold text-[var(--color-success)] shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                            <span>Admitted</span>
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={admitTicket.isPending}
                            onClick={() => handleAdmitIndividual(att.seatId)}
                            className="shrink-0"
                          >
                            Admit Seat
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Single Primary CTA */}
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={admitTicket.isPending}
                    onClick={handleAdmitAll}
                  >
                    <UserCheck className="w-4 h-4 mr-2" strokeWidth={2} />
                    <span>Admit All Guests &amp; Tear Stub</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};