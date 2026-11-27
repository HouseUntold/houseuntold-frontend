import { ticketsApi } from "@/api/endpoints/tickets";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MobileQrScanner } from "@/components/ui/MobileQrScanner";
import {
  formatDateTime,
  formatLabel,
  pluralize,
  ticketCategoryBreakdown,
} from "@/lib/utils";
import { Ticket } from "@/models/ticket.schema";
import { useUiStore } from "@/stores/ui.store";
import {
  AlertOctagon,
  CalendarDays,
  CheckCircle2,
  History,
  QrCode,
  RotateCcw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Ticket as TicketIcon,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

interface RecentCheckIn {
  id: string;
  timestamp: string;
  guestName: string;
  category: string;
  partySize: number;
}

type GateScanResult = Pick<
  Ticket,
  | "event_title"
  | "category_name"
  | "entry_count"
  | "booking_status"
  | "is_checked_in"
  | "checked_in_at"
  | "primary_guest_name"
  | "guests"
> & {
  valid?: boolean;
  reason?: string;
  ticket_id?: string;
  category_tier?: string;
};

const getGuestName = (source?: Pick<Ticket, "primary_guest_name" | "guests"> | null) =>
  source?.primary_guest_name
  || source?.guests?.find((guest) => guest.is_primary_contact)?.name
  || source?.guests?.[0]?.name
  || "Guest";

export const GatekeeperConsole: React.FC = () => {
  const [tokenInput, setTokenInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [scanResult, setScanResult] = useState<GateScanResult | null>(null);
  const [verifiedTicket, setVerifiedTicket] = useState<Ticket | null>(null);
  const [statusFlash, setStatusFlash] = useState<"GREEN" | "RED" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const { showToast } = useUiStore();

  const totalGuestsAdmitted = useMemo(
    () => recentCheckIns.reduce((sum, item) => sum + item.partySize, 0),
    [recentCheckIns],
  );

  const validateToken = useCallback(
    async (rawToken: string) => {
      const cleanToken = rawToken.trim();
      if (!cleanToken) {
        showToast("Please scan the entry QR or enter the code.", "warning");
        return;
      }

      setIsVerifying(true);
      setStatusFlash(null);
      setScanResult(null);
      setVerifiedTicket(null);
      setErrorMessage("");

      try {
        const res: GateScanResult = await ticketsApi.verifyGateTicket(cleanToken);
        setScanResult(res);
        if (res.ticket_id && res.valid !== false) {
          try {
            setVerifiedTicket(await ticketsApi.detail(String(res.ticket_id)));
          } catch {
            showToast("Ticket verified, but details could not be loaded.", "warning");
          }
        }
        if (res.is_checked_in) {
          setStatusFlash("RED");
          setErrorMessage("This pass has already been used at the gate.");
        }
      } catch (err: any) {
        setStatusFlash("RED");
        setErrorMessage(err.response?.data?.error || "That QR code is invalid or has expired.");
      } finally {
        setIsVerifying(false);
      }
    },
    [showToast],
  );

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    void validateToken(tokenInput);
  };

  const handleScan = useCallback(
    (value: string) => {
      setTokenInput(value);
      void validateToken(value);
    },
    [validateToken],
  );

  const handleConfirmEntry = async () => {
    if (!tokenInput.trim() || !scanResult) return;

    setIsCheckingIn(true);
    setErrorMessage("");
    try {
      await ticketsApi.checkInGateTicket(tokenInput.trim());
      setStatusFlash("GREEN");
      setScanResult((prev) =>
        prev ? { ...prev, is_checked_in: true, valid: false, reason: "already_checked_in" } : prev,
      );

      const newEntry: RecentCheckIn = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        guestName: getGuestName(scanResult),
        category: scanResult.category_name || "General admission",
        partySize: scanResult.entry_count || 1,
      };
      setRecentCheckIns((prev) => [newEntry, ...prev.slice(0, 9)]);

      showToast("Guest checked in successfully.", "success");
    } catch (err: any) {
      setStatusFlash("RED");
      setErrorMessage(
        err.response?.data?.error || "Cannot check in: this pass was already used or is invalid.",
      );
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleReset = () => {
    setTokenInput("");
    setScanResult(null);
    setVerifiedTicket(null);
    setStatusFlash(null);
    setErrorMessage("");
  };

  const scannedPass = verifiedTicket ?? scanResult;
  const primaryGuest = getGuestName(scannedPass);
  const partySize =
    verifiedTicket?.attendee_count || verifiedTicket?.entry_count || scanResult?.entry_count || 1;
  const ticketIdShort = (verifiedTicket?.id || scanResult?.ticket_id || "")
    .slice(0, 8)
    .toUpperCase();
  const isCheckedIn = Boolean(scanResult?.is_checked_in || verifiedTicket?.is_checked_in);
  const isValid = scanResult?.valid !== false;
  const passState = isCheckedIn ? "Checked in" : isValid ? "Ready for entry" : "Entry blocked";
  const checkInTime = verifiedTicket?.checked_in_at || scanResult?.checked_in_at;

  const isTableBooking = Boolean(verifiedTicket?.section && verifiedTicket?.seat_table_size);
  const entrySummary = isTableBooking
    ? `Table · ${verifiedTicket?.seat_table_size} ${pluralize(
        verifiedTicket?.seat_table_size || 1,
        "guest",
      )} · Section ${verifiedTicket?.section}`
    : (verifiedTicket && ticketCategoryBreakdown(verifiedTicket))
      || `${scannedPass?.category_name || "General admission"} · ${partySize} ${pluralize(
        partySize,
        "guest",
      )}`;

  const issueMessage = useMemo(() => {
    if (statusFlash === "GREEN") return "";
    if (errorMessage) return errorMessage;
    if (!scanResult) return "";
    if (scanResult.reason === "booking_unconfirmed") {
      return "Booking payment is not confirmed for this pass.";
    }
    if (scanResult.reason === "event_ended") return "This event has ended.";
    if (scanResult.reason === "already_checked_in") return "This pass was already used at the gate.";
    if (scanResult.valid === false) return "This pass is not valid for entry.";
    return "";
  }, [errorMessage, scanResult, statusFlash]);

  const passPillClass = isCheckedIn
    ? "bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30"
    : isValid
    ? "bg-[var(--color-brand)]/12 text-[var(--color-brand)] border border-[var(--color-brand)]/30"
    : "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30";

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left animate-fade-in pb-12">
      {/* Top Header + Shift Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--color-hairline)]/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-success)] shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] tracking-tight leading-none">
              Gate Check-In
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-1 truncate">
              Scan the entry QR, verify photo ID, and admit the guest party.
            </p>
          </div>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 shadow-sm flex items-center gap-5 self-start sm:self-auto shrink-0">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-bold block">
              Passes checked
            </span>
            <span className="text-base font-extrabold text-[var(--color-ink)] num leading-tight">
              {recentCheckIns.length}
            </span>
          </div>
          <div className="w-px h-7 bg-[var(--color-hairline)]" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-bold block">
              Guests admitted
            </span>
            <span className="text-base font-extrabold text-[var(--color-success)] num leading-tight">
              {totalGuestsAdmitted}
            </span>
          </div>
        </div>
      </div>

      {/* Main 12-Column Workspace: Wider Left (9 cols) + Fixed-Size Right (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-9 min-w-0 space-y-5">
          {/* Inline QR / Code Verification Bar */}
          <Card className="p-4 sm:p-5">
            <form
              onSubmit={handleValidate}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <QrCode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
                  <input
                    type="text"
                    aria-label="Entry QR or code"
                    placeholder="Scan entry QR or paste pass code..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    required
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-sm font-mono text-[var(--color-ink)] placeholder:font-sans placeholder:text-[var(--color-muted)]/60 focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 transition-all"
                  />
                </div>

                <Button type="submit" isLoading={isVerifying} className="h-11 px-5 shrink-0">
                  <Search className="w-4 h-4 mr-1.5" /> Verify
                </Button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <MobileQrScanner
                  onScan={handleScan}
                  formats={["qr_code"]}
                  label="Scan QR"
                  className="flex-1 sm:flex-none h-11"
                />
                {(scanResult || statusFlash || tokenInput) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    title="Clear and scan next"
                    aria-label="Clear and scan next"
                    className="h-11 w-11 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </Card>

          {/* Green Confirmation Flash */}
          {statusFlash === "GREEN" && (
            <div
              role="status"
              className="p-4 sm:p-5 rounded-2xl bg-[var(--color-success-bg)]/85 border border-[var(--color-success)]/45 text-[var(--color-success)] animate-fade-in shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[var(--color-success)]/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-none">
                      Check-in confirmed
                    </h2>
                    <p className="text-xs font-medium mt-1 text-[var(--color-ink)]">
                      Pass recorded. This gate QR cannot be used again.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleReset}
                  className="shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Next guest
                </Button>
              </div>
            </div>
          )}

          {/* Red Blocked Flash */}
          {statusFlash === "RED" && (
            <div
              role="alert"
              className="p-4 sm:p-5 rounded-2xl bg-[var(--color-danger-bg)]/85 border border-[var(--color-danger)]/45 text-[var(--color-danger)] animate-fade-in shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[var(--color-danger)]/15 flex items-center justify-center shrink-0">
                    <AlertOctagon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-none">
                      Entry blocked
                    </h2>
                    <p className="text-xs font-semibold mt-1 text-[var(--color-ink)]">
                      {errorMessage}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleReset}
                  className="shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Clear
                </Button>
              </div>
            </div>
          )}

          {/* Verifying Loading State */}
          {isVerifying && (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-9 h-9 rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand)] animate-spin" />
              <h2 className="text-base font-bold text-[var(--color-ink)] mt-4">
                Verifying entry pass
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Checking ticket status and party details...
              </p>
            </Card>
          )}

          {/* Empty Ready State */}
          {!scanResult && !statusFlash && !isVerifying && (
            <Card className="p-10 sm:p-14 text-center flex flex-col items-center justify-center border-dashed">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-success)] mb-4 shadow-sm">
                <ScanLine className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[var(--color-ink)]">
                Ready for the next pass
              </h2>
              <p className="text-sm text-[var(--color-muted)] max-w-md mt-1.5 leading-relaxed">
                Scan the guest&apos;s entry QR or paste the code above. Guest details, tier, and
                check-in status will appear here before admission.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-canvas)] border border-[var(--color-hairline)]">
                  <QrCode className="w-3.5 h-3.5" /> Single-use Gate QR
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-canvas)] border border-[var(--color-hairline)]">
                  <ShieldCheck className="w-3.5 h-3.5" /> 21+ Photo ID Required
                </span>
              </div>
            </Card>
          )}

          {/* Verified Gate Details Card (No ticket visual, no payment/F&B amounts) */}
          {scanResult && !isVerifying && (
            <Card className="overflow-hidden animate-fade-in shadow-editorial">
              <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-hairline)]/70 flex flex-wrap items-center justify-between gap-3 bg-[var(--color-canvas)]/50">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider block">
                    Event
                  </span>
                  <h3 className="text-xl font-extrabold text-[var(--color-ink)] truncate mt-0.5">
                    {scannedPass?.event_title || "HouseUntold Event"}
                  </h3>
                  <p className="text-xs font-semibold text-[var(--color-brand)] mt-1">
                    {entrySummary}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${passPillClass}`}>
                    {passState}
                  </span>
                  {ticketIdShort && (
                    <span className="text-[11px] font-mono font-bold text-[var(--color-muted)]">
                      Ticket ID <span className="text-[var(--color-ink)]">#{ticketIdShort}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* Core Gate Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-success)] shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--color-muted)] block uppercase font-bold tracking-wider">
                        Guest Name
                      </span>
                      <span className="text-sm font-bold text-[var(--color-ink)] uppercase truncate block mt-0.5">
                        {primaryGuest}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-brand)] shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--color-muted)] block uppercase font-bold tracking-wider">
                        Guests Count
                      </span>
                      <span className="text-lg font-extrabold text-[var(--color-ink)] num leading-tight block mt-0.5">
                        {partySize} {pluralize(partySize, "guest")}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-brand)] shrink-0">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--color-muted)] block uppercase font-bold tracking-wider">
                        Date &amp; Time
                      </span>
                      <span className="text-xs font-bold text-[var(--color-ink)] num block mt-0.5">
                        {verifiedTicket?.event_starts_at
                          ? formatDateTime(verifiedTicket.event_starts_at)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Guest Breakdown Pills (Table / Couple / Single Men / Single Women) */}
                {verifiedTicket && (
                  <div className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/80 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
                      Entry Breakdown
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {isTableBooking ? (
                        <>
                          <span className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-bold text-[var(--color-ink)]">
                            Table of {verifiedTicket.seat_table_size}
                          </span>
                          <span className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-bold text-[var(--color-brand)]">
                            Section {verifiedTicket.section}
                          </span>
                        </>
                      ) : (
                        <>
                          {verifiedTicket.couple_count > 0 && (
                            <span className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-bold text-[var(--color-ink)] num">
                              {verifiedTicket.couple_count}{" "}
                              {pluralize(verifiedTicket.couple_count, "Couple")}
                            </span>
                          )}
                          {verifiedTicket.stag_male_count > 0 && (
                            <span className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-bold text-[var(--color-ink)] num">
                              {verifiedTicket.stag_male_count}{" "}
                              {verifiedTicket.stag_male_count === 1 ? "Single Man" : "Single Men"}
                            </span>
                          )}
                          {verifiedTicket.stag_female_count > 0 && (
                            <span className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-bold text-[var(--color-ink)] num">
                              {verifiedTicket.stag_female_count}{" "}
                              {verifiedTicket.stag_female_count === 1
                                ? "Single Woman"
                                : "Single Women"}
                            </span>
                          )}
                          {!verifiedTicket.couple_count &&
                            !verifiedTicket.stag_male_count &&
                            !verifiedTicket.stag_female_count && (
                              <span className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs font-bold text-[var(--color-ink)]">
                                {formatLabel(verifiedTicket.category_name || "General Admission")}
                              </span>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {issueMessage && !isCheckedIn && statusFlash !== "RED" && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-[var(--color-danger-bg)]/75 border border-[var(--color-danger)]/35 text-xs text-[var(--color-danger)] flex items-start gap-2.5"
                  >
                    <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-semibold">{issueMessage}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/80 flex items-start gap-3 text-xs text-[var(--color-muted)]">
                  <ShieldAlert className="w-4 h-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
                  <span>
                    Verify the lead guest&apos;s{" "}
                    <strong className="text-[var(--color-ink)]">physical government photo ID</strong>{" "}
                    before confirming check-in.
                  </span>
                </div>

                {!isCheckedIn ? (
                  <Button
                    size="lg"
                    onClick={handleConfirmEntry}
                    disabled={!isValid}
                    isLoading={isCheckingIn}
                    className="w-full h-14 text-base font-extrabold bg-[var(--color-success)] text-black hover:bg-[var(--color-success)]/90 shadow-lg disabled:opacity-45"
                  >
                    <UserCheck className="w-5 h-5 mr-2" />
                    Check in {partySize} {pluralize(partySize, "guest")}
                  </Button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[var(--color-success-bg)]/80 border border-[var(--color-success)]/40 text-xs text-[var(--color-success)] text-center font-bold">
                    Pass checked in{checkInTime ? ` at ${formatDateTime(checkInTime)}` : ""}. Ask a
                    supervisor for re-entry.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Shift Check-Ins (Same size & position) */}
        <div className="lg:col-span-3 min-w-0">
          <Card className="overflow-hidden max-w-sm lg:ml-auto w-full">
            <div className="px-5 py-3.5 border-b border-[var(--color-hairline)]/70 bg-[var(--color-canvas)]/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                <History className="w-4 h-4 text-[var(--color-brand)]" /> Shift check-ins
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] num">
                {recentCheckIns.length} / 10
              </span>
            </div>

            {recentCheckIns.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-muted)]">
                  <History className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[var(--color-ink)] mt-3">
                  No check-ins yet
                </p>
                <p className="text-[11px] text-[var(--color-muted)] mt-1">
                  Completed check-ins for this shift will appear here.
                </p>
              </div>
            ) : (
              <div
                className="divide-y divide-[var(--color-hairline)]/70 max-h-[32rem] overflow-y-auto px-3"
                aria-live="polite"
              >
                {recentCheckIns.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[11px] text-[var(--color-ink)] truncate">
                        {item.guestName}
                      </div>
                      <div className="text-[10px] text-[var(--color-muted)] truncate mt-0.5">
                        {item.category} · {item.partySize}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)] font-bold text-[10px] whitespace-nowrap">
                        CHECKED IN
                      </span>
                      <div className="text-[10px] text-[var(--color-muted)] mt-1 num">
                        {item.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};