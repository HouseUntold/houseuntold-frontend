import { useMenu } from "@/api/hooks/useMenu";
import { useRedeemOrder, useTicketHistory } from "@/api/hooks/useOrders";
import { useTicketSearch } from "@/api/hooks/useTickets";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MobileQrScanner } from "@/components/ui/MobileQrScanner";
import { formatCurrencyINR, formatLabel, pluralize } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  Flame,
  GlassWater,
  History,
  Minus,
  Plus,
  Receipt,
  Search,
  Smartphone,
  Ticket,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

interface BarHistoryItem {
  menu_item_id?: string;
  menu_item_name?: string;
  quantity: number;
  unit_price_at_sale?: number;
  line_total?: number;
}

interface BarTransaction {
  transaction_id?: string;
  bartender_username?: string;
  total_bill: number;
  wallet_deducted: number;
  delta_to_collect?: number;
  delta_payment_method?: string;
  balance_before?: number;
  balance_after?: number;
  created_at?: string;
  items?: BarHistoryItem[];
}

interface BarHistoryResponse {
  bar_code?: string;
  transactions?: BarTransaction[];
}

interface BarTicket {
  ticket_id?: string;
  event_title?: string;
  bar_code?: string;
  category_name?: string;
  entry_count?: number;
  attendee_count?: number;
  food_balance?: number;
  initial_food_balance?: number;
  wallet_expired?: boolean;
  is_checked_in?: boolean;
  primary_guest_name?: string;
  guests?: { name: string; is_primary_contact?: boolean }[];
  booking_status?: string;
  status?: string;
  free_tequila_eligible_count?: number;
  free_tequila_redeemed_count?: number;
  recent_transactions?: BarTransaction[];
}

interface RedeemReceipt {
  totalBill: number;
  walletDeducted: number;
  deltaToCollect: number;
  cashDeltaPaid: number;
  upiDeltaPaid: number;
  freeShotRedeemed?: boolean;
}

const getGuestName = (ticket?: BarTicket | null) =>
  ticket?.primary_guest_name
  || ticket?.guests?.find((guest) => guest.is_primary_contact)?.name
  || ticket?.guests?.[0]?.name
  || "Guest";

const formatOrderTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const describeItems = (items?: BarHistoryItem[]) => {
  if (!items || items.length === 0) return "No line items";
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const firstName = items[0]?.menu_item_name || "Menu item";
  return items.length === 1
    ? `${count} × ${firstName}`
    : `${firstName} + ${items.length - 1} ${pluralize(items.length - 1, "item")}`;
};

export const BartenderConsole: React.FC = () => {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [activeBarcode, setActiveBarcode] = useState("");
  const {
    data: ticketData,
    isLoading: ticketLoading,
    isError: ticketLookupFailed,
    error: ticketLookupError,
    refetch: refetchTicket,
  } = useTicketSearch(activeBarcode);
  const ticket: BarTicket | undefined = ticketData;
  const { data: menuItems, isLoading: menuLoading, isError: menuError, refetch: refetchMenu } = useMenu();
  const {
    data: historyData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError: historyError,
    refetch: refetchHistory,
  } = useTicketHistory(activeBarcode);
  const redeemMutation = useRedeemOrder();
  const { showToast } = useUiStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [deltaMethod, setDeltaMethod] = useState<"CASH" | "UPI">("CASH");
  const [tequilaShots, setTequilaShots] = useState(0);
  const [redeemSuccess, setRedeemSuccess] = useState<RedeemReceipt | null>(null);
  const [redeemError, setRedeemError] = useState("");

  const [frequencyMap, setFrequencyMap] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("houseuntold_item_freq");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const lookupBarcode = useCallback(
    (raw: string) => {
      const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (clean.length !== 5) {
        showToast("Scan the 5-character bar code, not the gate QR", "danger");
        return;
      }

      setBarcodeInput(clean);
      setActiveBarcode(clean);
      setOrderItems({});
      setTequilaShots(0);
      setRedeemSuccess(null);
      setRedeemError("");
    },
    [showToast],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lookupBarcode(barcodeInput);
  };

  const handleScan = useCallback(
    (value: string) => {
      lookupBarcode(value);
    },
    [lookupBarcode],
  );

  const handleResetSession = () => {
    setBarcodeInput("");
    setActiveBarcode("");
    setOrderItems({});
    setTequilaShots(0);
    setRedeemSuccess(null);
    setRedeemError("");
    setSearchQuery("");
    setSelectedCategory("ALL");
  };

  const addItem = (id: string) => {
    setOrderItems((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setFrequencyMap((prev) => {
      const next = { ...prev, [id]: (prev[id] || 0) + 1 };
      try {
        localStorage.setItem("houseuntold_item_freq", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeItem = (id: string) => {
    setOrderItems((prev) => {
      const next = { ...prev };
      if (next[id] > 1) {
        next[id]--;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const clearOrder = () => {
    setOrderItems({});
  };

  const categories = useMemo(() => {
    if (!menuItems) return [];
    const unique = new Set<string>();
    menuItems.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique);
  }, [menuItems]);

  const topPicks = useMemo(() => {
    if (!menuItems || menuItems.length === 0) return [];
    return [...menuItems]
      .sort((a, b) => (frequencyMap[b.id] || 0) - (frequencyMap[a.id] || 0))
      .slice(0, 4);
  }, [menuItems, frequencyMap]);

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    const query = searchQuery.trim().toLowerCase();
    return menuItems.filter((m) => {
      const matchesCategory = selectedCategory === "ALL" || m.category === selectedCategory;
      const matchesQuery =
        !query
        || m.name.toLowerCase().includes(query)
        || (m.category && m.category.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const transactions = useMemo(() => {
    const response = historyData as BarHistoryResponse | BarTransaction[] | undefined;
    const list = Array.isArray(response) ? response : response?.transactions;
    return list ?? ticket?.recent_transactions ?? [];
  }, [historyData, ticket]);

  const historySummary = useMemo(
    () =>
      transactions.reduce(
        (totals, item) => ({
          bill: totals.bill + Number(item.total_bill || 0),
          credit: totals.credit + Number(item.wallet_deducted || 0),
          paid: totals.paid + Number(item.delta_to_collect || 0),
        }),
        { bill: 0, credit: 0, paid: 0 },
      ),
    [transactions],
  );

  const totalItemCount = useMemo(
    () => Object.values(orderItems).reduce((sum, qty) => sum + qty, 0),
    [orderItems],
  );

  const totalBill = Object.entries(orderItems).reduce((sum, [id, qty]) => {
    const item = menuItems?.find((m) => m.id === id);
    return sum + (item?.unit_price || item?.price || 0) * qty;
  }, 0);

  const walletBalance = ticket?.food_balance || 0;
  const walletDeducted = Math.min(totalBill, walletBalance);
  const remainingWallet = Math.max(0, walletBalance - walletDeducted);
  const deltaToCollect = Math.max(0, totalBill - walletBalance);
  const tequilaEligible = Number(ticket?.free_tequila_eligible_count || 0);
  const tequilaRedeemed = Number(ticket?.free_tequila_redeemed_count || 0);
  const tequilaRemaining = Math.max(0, tequilaEligible - tequilaRedeemed);
  const tequilaAvailable = tequilaEligible > 0;
  const isCheckedIn = Boolean(ticket?.is_checked_in);

  const handleRedeem = async () => {
    if (!activeBarcode) return;
    const items = Object.entries(orderItems).map(([menu_item_id, quantity]) => ({
      menu_item_id,
      quantity,
    }));
    if (items.length === 0 && tequilaShots === 0) {
      showToast("Select an item or a tequila shot first.", "warning");
      return;
    }
    if (tequilaShots > tequilaRemaining) {
      showToast("Only the remaining eligible tequila shot can be redeemed.", "warning");
      return;
    }

    setRedeemError("");
    try {
      const res = await redeemMutation.mutateAsync({
        bar_code: activeBarcode,
        items,
        tequila_shots_redeemed: tequilaShots,
        delta_collected: deltaToCollect > 0,
        delta_payment_method: deltaToCollect > 0 ? deltaMethod : undefined,
        delta_amount: deltaToCollect > 0 ? deltaToCollect : undefined,
      });
      setRedeemSuccess(res);
      setOrderItems({});
      setTequilaShots(0);
      refetchTicket();
      showToast("Food and drink credit applied.", "success");
    } catch (err: any) {
      const message = err.response?.data?.error || "Could not submit the order. Please try again.";
      setRedeemError(message);
      showToast(message, "danger");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in text-left pb-12">
      {/* Top Bar: Title + Inline Barcode Lookup */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--color-hairline)]/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-brand)] shadow-sm shrink-0">
            <GlassWater className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] tracking-tight leading-none">
              Bar Orders
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-1 truncate">
              Scan the 5-character ticket bar code, build the order, and settle any balance.
            </p>
          </div>
        </div>

        {/* Inline Search Input + Action Buttons */}
        <form
          onSubmit={handleSearch}
          className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <div className="relative flex-1 sm:w-52">
              <Ticket className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
              <input
                type="text"
                aria-label="5-character bar code"
                placeholder="Bar code (e.g. K4829)"
                maxLength={5}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
                required
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-sm font-mono font-bold tracking-widest uppercase text-[var(--color-ink)] placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-[var(--color-muted)]/60 focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 transition-all"
              />
            </div>

            <Button type="submit" isLoading={ticketLoading} className="h-11 px-5 shrink-0">
              <Search className="w-4 h-4 mr-1.5" /> Look up
            </Button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <MobileQrScanner
              onScan={handleScan}
              formats={["code_39"]}
              label="Scan"
              className="flex-1 sm:flex-none h-11"
            />
            {ticket && (
              <button
                type="button"
                onClick={handleResetSession}
                title="Clear current guest"
                aria-label="Clear current guest"
                className="h-11 w-11 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Order Saved Receipt Banner */}
      {redeemSuccess && (
        <div
          role="status"
          className="p-4 sm:p-5 rounded-2xl bg-[var(--color-success-bg)]/75 border border-[var(--color-success)]/40 text-[var(--color-ink)] animate-fade-in shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--color-success)]/15 text-[var(--color-success)] shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-[var(--color-success)]">Order saved</div>
                <div className="text-xs text-[var(--color-muted)] mt-0.5">
                  Bar code{" "}
                  <span className="font-mono font-bold text-[var(--color-ink)]">{activeBarcode}</span>
                  {" · "}
                  {getGuestName(ticket)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-4 lg:gap-7">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                  Order total
                </span>
                <span className="text-sm font-bold text-[var(--color-ink)] num">
                  {formatCurrencyINR(redeemSuccess.totalBill)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                  Credit used
                </span>
                <span className="text-sm font-bold text-[var(--color-success)] num">
                  {formatCurrencyINR(redeemSuccess.walletDeducted)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                  At the bar
                </span>
                <span className="text-sm font-bold text-[var(--color-ink)] num">
                  {formatCurrencyINR(redeemSuccess.deltaToCollect)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                  Cash / UPI
                </span>
                <span className="text-sm font-bold text-[var(--color-ink)] num">
                  {formatCurrencyINR(redeemSuccess.cashDeltaPaid)} / {formatCurrencyINR(redeemSuccess.upiDeltaPaid)}
                </span>
              </div>
              {redeemSuccess.freeShotRedeemed && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                    Tequila
                  </span>
                  <span className="text-sm font-bold text-[var(--color-brand)]">Redeemed</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setRedeemSuccess(null)}
                className="justify-self-end p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                aria-label="Dismiss receipt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Error Banner */}
      {redeemError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[var(--color-danger-bg)]/75 border border-[var(--color-danger)]/40 text-[var(--color-danger)] animate-fade-in shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm">Order not saved</div>
              <div className="text-xs mt-0.5 text-[var(--color-ink)]">{redeemError}</div>
            </div>
            <button
              type="button"
              onClick={() => setRedeemError("")}
              aria-label="Dismiss order error"
              className="p-1.5 rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activeBarcode && !ticketLoading && (
        <Card className="p-10 sm:p-14 text-center flex flex-col items-center justify-center border-dashed">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-brand)] mb-4 shadow-sm">
            <Ticket className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-ink)]">Ready for next guest</h2>
          <p className="text-sm text-[var(--color-muted)] max-w-md mt-1.5 leading-relaxed">
            Enter or scan the 5-character bar code from the guest&apos;s ticket to view their bar wallet,
            quick picks, and order history.
          </p>
          <span className="mt-5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-muted)]">
            Gate QR is not used at the bar
          </span>
        </Card>
      )}

      {/* Loading State */}
      {ticketLoading && !ticket && (
        <Card className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-9 h-9 rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand)] animate-spin" />
          <h2 className="text-base font-bold text-[var(--color-ink)] mt-4">Looking up ticket</h2>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Fetching bar wallet balance, guest details, and recent orders...
          </p>
        </Card>
      )}

      {/* Lookup Error State */}
      {ticketLookupFailed && !ticket && !ticketLoading && (
        <Card
          role="alert"
          className="p-8 text-center flex flex-col items-center justify-center border border-[var(--color-danger)]/40 bg-[var(--color-danger-bg)]/40"
        >
          <div className="w-12 h-12 rounded-xl bg-[var(--color-danger)]/15 text-[var(--color-danger)] flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-ink)] mt-4">Bar order unavailable</h2>
          <p className="text-xs text-[var(--color-muted)] max-w-md mt-1.5">
            {(ticketLookupError as any)?.response?.data?.error
              || "Check the 5-character bar code and try again."}
          </p>
          <Button size="sm" variant="secondary" className="mt-4" onClick={() => refetchTicket()}>
            Try again
          </Button>
        </Card>
      )}

      {ticket && !isCheckedIn && (
        <Card role="alert" className="p-8 text-center flex flex-col items-center justify-center border border-[var(--color-danger)]/40 bg-[var(--color-danger-bg)]/40">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-danger)]/15 text-[var(--color-danger)] flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-ink)] mt-4">Guest not checked in</h2>
          <p className="text-xs text-[var(--color-muted)] max-w-md mt-1.5">Check in this ticket at the gate first. Bar code cannot be used before gate check-in.</p>
        </Card>
      )}

      {/* Active Guest POS Workspace */}
      {ticket && isCheckedIn && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Guest Summary + Quick Picks + Menu */}
          <div className="lg:col-span-8 min-w-0 space-y-5">
            {/* Guest & Wallet Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-brand)] shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-bold">
                    Guest
                  </span>
                  <div className="font-bold text-[var(--color-ink)] text-sm sm:text-base truncate">
                    {getGuestName(ticket)}
                  </div>
                </div>
              </div>

              <div className="pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[var(--color-hairline)]/70 sm:pl-4">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-bold">
                  Bar Code
                </span>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-brand)]">
                    {activeBarcode}
                  </span>
                </div>
              </div>

              <div className="pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[var(--color-hairline)]/70 sm:pl-4 flex sm:block items-center justify-between sm:text-right">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-bold">
                  Wallet Balance
                </span>
                <div className="text-2xl font-extrabold text-[var(--color-success)] num leading-tight">
                  {formatCurrencyINR(ticket.food_balance || 0)}
                </div>
                {ticket.wallet_expired && (
                  <span className="text-[10px] font-bold text-[var(--color-danger)] uppercase tracking-wider">
                    Wallet expired
                  </span>
                )}
              </div>
            </div>

            {/* Complimentary Tequila Shot Counter */}
            {tequilaAvailable && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand)] shrink-0">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--color-ink)]">Free tequila shot</div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      Single female ticket · {tequilaRedeemed} of {tequilaEligible} redeemed
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label="Remove tequila shot"
                    disabled={tequilaShots === 0}
                    onClick={() => setTequilaShots((count) => Math.max(0, count - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="num font-bold text-base text-[var(--color-ink)] w-6 text-center">
                    {tequilaShots}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label="Add tequila shot"
                    disabled={tequilaShots >= tequilaRemaining}
                    onClick={() => setTequilaShots((count) => Math.min(tequilaRemaining, count + 1))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Picks */}
            {topPicks.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand)] uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5" /> Quick picks
                  </div>
                  <span className="text-[11px] text-[var(--color-muted)]">Tap to add</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {topPicks.map((item) => {
                    const qty = orderItems[item.id] || 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addItem(item.id)}
                        aria-label={`Add ${item.name}`}
                        aria-pressed={qty > 0}
                        className={`relative p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border text-left transition-all active:scale-[0.98] cursor-pointer group ${
                          qty > 0
                            ? "border-[var(--color-brand)] shadow-sm"
                            : "border-[var(--color-hairline)]/80"
                        }`}
                      >
                        {qty > 0 && (
                          <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 rounded-full bg-[var(--color-brand)] text-[var(--color-brand-text)] text-[10px] font-bold flex items-center justify-center num shadow">
                            {qty}
                          </span>
                        )}
                        <div className="text-xs font-bold text-[var(--color-ink)] truncate group-hover:text-[var(--color-brand)] transition-colors">
                          {item.name}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-semibold text-[var(--color-muted)] num">
                            {formatCurrencyINR(item.unit_price || item.price || 0)}
                          </span>
                          <span className="w-6 h-6 rounded-lg bg-[var(--color-canvas)] group-hover:bg-[var(--color-brand)] text-[var(--color-ink)] group-hover:text-[var(--color-brand-text)] flex items-center justify-center transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Menu Search & Category Filter */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    type="text"
                    aria-label="Search menu"
                    placeholder="Search drinks, beers, cocktails, or food..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/60 text-sm focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear menu search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {categories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("ALL")}
                      aria-pressed={selectedCategory === "ALL"}
                      className={`h-10 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === "ALL"
                          ? "bg-[var(--color-brand)] text-[var(--color-brand-text)] shadow-sm"
                          : "bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        aria-pressed={selectedCategory === cat}
                        className={`h-10 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-[var(--color-brand)] text-[var(--color-brand-text)] shadow-sm"
                            : "bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        {formatLabel(cat)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[28rem] overflow-y-auto pr-1">
                {menuLoading && (
                  <div className="col-span-full py-10 px-4 text-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs text-[var(--color-muted)]">
                    Loading menu...
                  </div>
                )}

                {menuError && !menuLoading && (
                  <div
                    role="alert"
                    className="col-span-full p-5 rounded-xl bg-[var(--color-danger-bg)]/50 border border-[var(--color-danger)]/30 text-center"
                  >
                    <p className="text-xs font-semibold text-[var(--color-ink)]">Menu unavailable</p>
                    <p className="text-[11px] text-[var(--color-muted)] mt-1">
                      The bar menu could not be loaded.
                    </p>
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => refetchMenu()}>
                      Retry
                    </Button>
                  </div>
                )}

                {!menuLoading &&
                  !menuError &&
                  filteredItems.map((item) => {
                    const qty = orderItems[item.id] || 0;
                    const price = item.unit_price || item.price || 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl bg-[var(--color-surface)] border flex items-center justify-between gap-3 transition-all ${
                          qty > 0
                            ? "border-[var(--color-brand)] shadow-sm"
                            : "border-[var(--color-hairline)]/80 hover:border-[var(--color-brand)]/40"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => addItem(item.id)}
                          aria-label={`Add ${item.name}`}
                          aria-pressed={qty > 0}
                          className="text-left flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="font-bold text-[var(--color-ink)] text-sm truncate">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-[var(--color-muted)] num">
                              {formatCurrencyINR(price)}
                            </span>
                            {item.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-canvas)] text-[var(--color-muted)] uppercase tracking-wide font-semibold">
                                {formatLabel(item.category)}
                              </span>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {qty > 0 ? (
                            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)]">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                aria-label={`Remove one ${item.name}`}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] active:scale-95 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold text-[var(--color-ink)] w-6 text-center num">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => addItem(item.id)}
                                aria-label={`Add one ${item.name}`}
                                className="w-7 h-7 rounded-md bg-[var(--color-brand)] text-[var(--color-brand-text)] hover:bg-[var(--color-brand-hover)] flex items-center justify-center active:scale-95 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addItem(item.id)}
                              aria-label={`Add ${item.name}`}
                              className="w-8 h-8 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)] hover:bg-[var(--color-brand)] hover:text-[var(--color-brand-text)] hover:border-[var(--color-brand)] flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {!menuLoading && !menuError && filteredItems.length === 0 && (
                  <div className="col-span-full py-10 px-4 text-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs text-[var(--color-muted)]">
                    No menu items match that search or category.
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("ALL");
                      }}
                      className="ml-1.5 font-bold text-[var(--color-brand)] hover:underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Current Order + Recent History */}
          <div className="order-first lg:order-none lg:col-span-4 lg:sticky lg:top-20 space-y-4">
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 shadow-editorial overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-hairline)]/70 bg-[var(--color-canvas)]/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[var(--color-brand)]" />
                  <h3 className="font-bold text-[var(--color-ink)] text-sm">Current order</h3>
                  {totalItemCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-brand)] text-[var(--color-brand-text)] num">
                      {totalItemCount}
                    </span>
                  )}
                </div>

                {totalItemCount > 0 && (
                  <button
                    type="button"
                    onClick={clearOrder}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>

              <div className="p-5 space-y-5">
                {totalItemCount === 0 ? (
                  <div className="py-7 text-center border border-dashed border-[var(--color-hairline)] rounded-xl bg-[var(--color-canvas)]/40">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">No items added yet</p>
                    <p className="text-[11px] text-[var(--color-muted)] mt-1">
                      Tap a menu item or quick pick to build the order.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {Object.entries(orderItems).map(([id, qty]) => {
                      const item = menuItems?.find((m) => m.id === id);
                      if (!item) return null;
                      const unitPrice = item.unit_price || item.price || 0;
                      return (
                        <div key={id} className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[var(--color-ink)] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[var(--color-muted)] num">
                              {formatCurrencyINR(unitPrice)} each
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 rounded-md bg-[var(--color-canvas)] border border-[var(--color-hairline)] p-0.5">
                              <button
                                type="button"
                                onClick={() => removeItem(id)}
                                aria-label={`Remove one ${item.name}`}
                                className="w-5 h-5 rounded flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-4 text-center font-bold text-[var(--color-ink)] num">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => addItem(id)}
                                aria-label={`Add one ${item.name}`}
                                className="w-5 h-5 rounded flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-bold text-[var(--color-ink)] num w-16 text-right">
                              {formatCurrencyINR(unitPrice * qty)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-[var(--color-hairline)]/70 text-xs">
                  <div className="flex justify-between text-[var(--color-muted)]">
                    <span>Order total</span>
                    <span className="text-[var(--color-ink)] font-semibold num">
                      {formatCurrencyINR(totalBill)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--color-success)]">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Credit applied
                    </span>
                    <span className="font-semibold num">- {formatCurrencyINR(walletDeducted)}</span>
                  </div>

                  {totalBill > 0 && (
                    <div className="flex justify-between text-[11px] text-[var(--color-muted)]">
                      <span>Balance left</span>
                      <span className="num font-medium">{formatCurrencyINR(remainingWallet)}</span>
                    </div>
                  )}

                  <div className="pt-3 mt-1 border-t border-[var(--color-hairline)]/70 flex items-baseline justify-between">
                    <span className="font-bold text-[var(--color-ink)] text-sm">Collect at bar</span>
                    <span
                      className={`text-xl font-extrabold num ${
                        deltaToCollect > 0 ? "text-[var(--color-brand)]" : "text-[var(--color-ink)]"
                      }`}
                    >
                      {formatCurrencyINR(deltaToCollect)}
                    </span>
                  </div>
                </div>

                {deltaToCollect > 0 && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                      Payment method
                    </label>
                    <div
                      role="radiogroup"
                      aria-label="Payment method"
                      className="relative grid grid-cols-2 p-1 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[var(--color-brand)] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          deltaMethod === "UPI" ? "translate-x-full" : "translate-x-0"
                        }`}
                      />
                      <button
                        type="button"
                        role="radio"
                        aria-checked={deltaMethod === "CASH"}
                        onClick={() => setDeltaMethod("CASH")}
                        className={`relative z-10 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          deltaMethod === "CASH"
                            ? "text-[var(--color-brand-text)]"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        <Banknote className="w-4 h-4" /> CASH
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={deltaMethod === "UPI"}
                        onClick={() => setDeltaMethod("UPI")}
                        className={`relative z-10 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          deltaMethod === "UPI"
                            ? "text-[var(--color-brand-text)]"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        <Smartphone className="w-4 h-4" /> UPI
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={handleRedeem}
                  disabled={totalBill === 0 && tequilaShots === 0}
                  isLoading={redeemMutation.isPending}
                  className="w-full"
                >
                  {tequilaShots > 0
                    ? `Redeem ${tequilaShots} tequila shot${tequilaShots === 1 ? "" : "s"}${
                        deltaToCollect > 0 ? ` + collect ${formatCurrencyINR(deltaToCollect)}` : ""
                      }`
                    : deltaToCollect > 0
                    ? `Apply ${formatCurrencyINR(walletDeducted)} credit + collect ${formatCurrencyINR(deltaToCollect)}`
                    : `Apply ${formatCurrencyINR(walletDeducted)} credit`}
                </Button>
              </div>
            </div>

            {/* Recent Orders Card */}
            <Card className="overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-hairline)]/70 bg-[var(--color-canvas)]/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[var(--color-brand)]" />
                  <h3 className="font-bold text-[var(--color-ink)] text-sm">Recent orders</h3>
                  {transactions.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] num">
                      {transactions.length}
                    </span>
                  )}
                </div>
                {historyFetching && !historyLoading && (
                  <span className="text-[10px] font-semibold text-[var(--color-muted)]">Updating...</span>
                )}
              </div>

              <div className="p-5">
                {historyLoading && (
                  <div className="space-y-2" aria-label="Loading order history">
                    {[0, 1, 2].map((row) => (
                      <div
                        key={row}
                        className="h-12 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {!historyLoading && historyError && transactions.length === 0 && (
                  <div role="alert" className="text-center">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">Order history unavailable</p>
                    <p className="text-[11px] text-[var(--color-muted)] mt-1">
                      Recent orders could not be loaded for this bar code.
                    </p>
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => refetchHistory()}>
                      Retry
                    </Button>
                  </div>
                )}

                {!historyLoading && !historyError && transactions.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">No orders yet</p>
                    <p className="text-[11px] text-[var(--color-muted)] mt-1">
                      Completed orders for this ticket will appear here.
                    </p>
                  </div>
                )}

                {transactions.length > 0 && (
                  <>
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-center">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                          Billed
                        </span>
                        <span className="text-xs font-bold text-[var(--color-ink)] num">
                          {formatCurrencyINR(historySummary.bill)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                          Credit used
                        </span>
                        <span className="text-xs font-bold text-[var(--color-success)] num">
                          {formatCurrencyINR(historySummary.credit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-[var(--color-muted)] block font-bold">
                          Paid at bar
                        </span>
                        <span className="text-xs font-bold text-[var(--color-ink)] num">
                          {formatCurrencyINR(historySummary.paid)}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-[var(--color-hairline)]/70 mt-3">
                      {transactions.slice(0, 4).map((tx, index) => {
                        const paid = Number(tx.delta_to_collect || 0);
                        return (
                          <div
                            key={tx.transaction_id || `${tx.created_at || "order"}-${index}`}
                            className="py-3 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[var(--color-ink)] truncate">
                                {describeItems(tx.items)}
                              </div>
                              <div className="text-[10px] text-[var(--color-muted)] mt-1 flex items-center gap-1 num">
                                <Clock3 className="w-3 h-3 shrink-0" /> {formatOrderTime(tx.created_at)}
                                {tx.bartender_username ? ` · ${tx.bartender_username}` : ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-[var(--color-ink)] num">
                                {formatCurrencyINR(Number(tx.total_bill || 0))}
                              </div>
                              <div className="text-[10px] text-[var(--color-success)] num">
                                {formatCurrencyINR(Number(tx.wallet_deducted || 0))} credit
                              </div>
                              {paid > 0 && (
                                <div className="text-[10px] text-[var(--color-muted)] num">
                                  +{formatCurrencyINR(paid)}{" "}
                                  {formatLabel(tx.delta_payment_method || "CASH")}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {transactions.length > 4 && (
                      <p className="pt-3 text-center text-[10px] text-[var(--color-muted)] num">
                        Showing 4 of {transactions.length} orders
                      </p>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};