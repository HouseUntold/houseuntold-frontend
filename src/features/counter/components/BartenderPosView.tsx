import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Clock,
  KeyRound,
  Minus,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../../components/ui/Button";
import { TierBadge } from "../../../components/ui/TierBadge";
import { type AddFnbMenuItemInput, AddFnbMenuItemSchema } from "../../../lib/api/schemas";
import type { FnbQuoteResponse, ScanLookupResult } from "../../../lib/api/types";
import { formatINR } from "../../../lib/domain/rules";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";
import { useBartenderPos } from "../hooks/useBartenderPos";

interface BartenderPosViewProps {
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

export const BartenderPosView: React.FC<BartenderPosViewProps> = ({ onNotify }) => {
  const { menu, transactions, lookupBarCode, addMenuItem, quoteOrder, settleOrder } = useBartenderPos();
  const [barCodeInput, setBarCodeInput] = useState("");
  const [lookupResult, setLookupResult] = useState<ScanLookupResult | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [qtyMultiplier, setQtyMultiplier] = useState<number>(1);
  const [upiDeltaConfirmed, setUpiDeltaConfirmed] = useState<boolean>(false);
  const [serverQuote, setServerQuote] = useState<FnbQuoteResponse | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset: resetMenuForm,
    formState: { errors },
  } = useForm<AddFnbMenuItemInput>({
    resolver: zodResolver(AddFnbMenuItemSchema),
    defaultValues: {
      name: "",
      category: "Bar",
      price: 350,
      isAlcoholic: false,
    },
  });

  const activeTicket = lookupResult?.ticket ?? null;
  const isTicketExpired = lookupResult?.reason === "EXPIRED" || Boolean(serverQuote?.ticketExpired);

  const cartEntries = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => {
        const item = menu.find((m) => m.id === itemId);
        return item ? { item, quantity } : null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [cart, menu]);

  // Zero-trust: fetch exact totals and wallet split from backend on any cart or ticket change
  useEffect(() => {
    if (cartEntries.length === 0) {
      setServerQuote(null);
      return;
    }
    let cancelled = false;
    quoteOrder
      .mutateAsync({
        ticketId: activeTicket?.id,
        items: cartEntries.map((e) => ({ itemId: e.item.id, quantity: e.quantity })),
      })
      .then((res) => {
        if (!cancelled) setServerQuote(res);
      })
      .catch(() => {
        if (!cancelled) setServerQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTicket?.id, activeTicket?.foodBalance, JSON.stringify(cart)]);

  const handleLookupBarCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barCodeInput.trim()) {
      onNotify("Enter the guest bar code from their pass.", "info");
      return;
    }
    try {
      const res = await lookupBarCode.mutateAsync(barCodeInput.trim());
      setLookupResult(res);
      setUpiDeltaConfirmed(false);
      if (!res.ticket) {
        onNotify("No ticket pass matched that bar code.", "error");
      } else if (res.reason === "EXPIRED") {
        onNotify("Ticket pass has expired — F&B wallet cannot be redeemed.", "error");
      } else {
        onNotify(
          `Loaded ${res.ticket.attendees[0]?.fullName ?? res.ticket.code} · Wallet ${
            formatINR(res.ticket.foodBalance)
          }`,
          "success",
        );
      }
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Bar code lookup failed", "error");
    }
  };

  const addItem = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? 0) + qtyMultiplier,
    }));
    setQtyMultiplier(1);
    setUpiDeltaConfirmed(false);
  };

  const adjustQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = next;
      }
      return copy;
    });
    setUpiDeltaConfirmed(false);
  };

  const handleSettle = async () => {
    if (!activeTicket || cartEntries.length === 0 || !serverQuote) return;
    if (isTicketExpired) {
      onNotify("Ticket has expired and F&B wallet credits are no longer redeemable.", "error");
      return;
    }
    if (serverQuote.exceedsWallet && !upiDeltaConfirmed) {
      onNotify(
        `Confirm ${formatINR(serverQuote.upiDeltaRequired)} UPI delta payment before settling.`,
        "info",
      );
      return;
    }

    try {
      const res = await settleOrder.mutateAsync({
        ticketId: activeTicket.id,
        items: cartEntries.map((e) => ({ itemId: e.item.id, quantity: e.quantity })),
        upiDeltaConfirmed,
      });
      setLookupResult({ valid: true, reason: "VALID", ticket: res.ticket });
      setCart({});
      setServerQuote(null);
      setUpiDeltaConfirmed(false);
      onNotify(
        `Settled ${formatINR(res.transaction.totalAmount)} · Wallet remaining ${formatINR(res.ticket.foodBalance)}`,
        "success",
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Settlement failed", "error");
    }
  };

  const handleAddMenuSubmit = async (values: AddFnbMenuItemInput) => {
    try {
      const created = await addMenuItem.mutateAsync(values);
      onNotify(`Added "${created.name}" (${formatINR(created.price)}) to menu.`, "success");
      resetMenuForm();
      setAddItemOpen(false);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not add menu item", "error");
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-5 sm:px-10 pt-8 pb-16">
      {/* Header + Secret Bar Code Lookup */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#E7E5E0]">
        <div>
          <div className="text-[12px] font-medium text-[#5C6570] uppercase tracking-wider">
            House Untold POS · Conservatory Bar · Terminal 04
          </div>
          <h1 className="text-[28px] font-semibold text-[#0F1419] mt-1">
            Bartender Wallet Wallet Counter
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleLookupBarCode} className="flex items-center gap-2">
            <div className="relative">
              <KeyRound
                className="w-4 h-4 text-[#5C6570] absolute left-3 top-1/2 -translate-y-1/2"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={barCodeInput}
                onChange={(e) => setBarCodeInput(e.target.value)}
                placeholder="Enter guest bar code (e.g. BAR-8942)"
                aria-label="Guest bar code lookup"
                className="h-11 w-64 pl-9 pr-3 rounded-[8px] bg-white border border-[#E7E5E0] text-[13px] num uppercase focus:outline-none focus:border-[#2D2A6E]"
              />
            </div>
            <Button type="submit" variant="secondary" isLoading={lookupBarCode.isPending}>
              <Search className="w-4 h-4" strokeWidth={1.75} />
              <span>Lookup</span>
            </Button>
          </form>

          <Button variant="primary" size="md" onClick={() => setAddItemOpen(true)}>
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      {/* 3-Column Rapid POS Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 items-start">
        {/* Left: Looked-Up Patron Ticket & Wallet */}
        <div className="lg:col-span-3 space-y-5">
          {!activeTicket
            ? (
              <div className="bg-white rounded-[14px] border border-dashed border-[#E7E5E0] p-6 text-center space-y-2.5">
                <KeyRound className="w-6 h-6 text-[#2D2A6E] mx-auto" strokeWidth={1.75} />
                <div className="text-[15px] font-semibold text-[#0F1419]">Enter Guest Bar Code</div>
                <p className="text-[12.5px] text-[#5C6570] leading-relaxed">
                  Ask the guest to open their House Untold ticket and read their Bar Code to view remaining wallet
                  balance and expiry status.
                </p>
              </div>
            )
            : (
              <div className="bg-white rounded-[14px] border border-[#E7E5E0] shadow-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="num text-[12px] font-semibold text-[#2D2A6E]">
                    {activeTicket.barCode}
                  </span>
                  <TierBadge tier={activeTicket.tier} />
                </div>

                <div>
                  <div className="text-[18px] font-semibold text-[#0F1419]">
                    {activeTicket.attendees[0]?.fullName ?? "Guest"}
                  </div>
                  <div className="num text-[12px] text-[#5C6570] mt-0.5">
                    {activeTicket.code} · Seats {activeTicket.seatLabels.join(", ")}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-[12px] border ${
                    isTicketExpired
                      ? "bg-[#FEE2E2]/45 border-[#DC2626]/25"
                      : "bg-[#FAFAF7] border-[#E7E5E0]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[12px] text-[#5C6570]">
                    <Wallet
                      className={`w-4 h-4 ${isTicketExpired ? "text-[#DC2626]" : "text-[#0F766E]"}`}
                      strokeWidth={1.75}
                    />
                    <span>Available Wallet Balance</span>
                  </div>
                  <div
                    className={`num text-[28px] font-semibold mt-1 ${
                      isTicketExpired ? "text-[#5C6570] line-through" : "text-[#0F766E]"
                    }`}
                  >
                    {formatINR(activeTicket.foodBalance)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#5C6570] num mt-1">
                    <Clock className="w-3 h-3" strokeWidth={1.75} />
                    <span>
                      {isTicketExpired
                        ? "Expired — wallet locked"
                        : `Expires ${
                          new Date(activeTicket.expiresAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })
                        }`}
                    </span>
                  </div>
                </div>

                {isTicketExpired
                  ? (
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#DC2626]">
                      <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      <span>Pass expired — deduction blocked</span>
                    </div>
                  )
                  : (
                    <div className="flex items-center gap-2 text-[12px] font-medium text-[#16A34A]">
                      <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      <span>Pass active &amp; bar access verified</span>
                    </div>
                  )}
              </div>
            )}

          {/* Recent Bar Ledger */}
          <div className="bg-white rounded-[14px] border border-[#E7E5E0] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0F1419]">
              <Receipt className="w-4 h-4 text-[#5C6570]" strokeWidth={1.75} />
              <span>Recent Settlements</span>
            </div>
            <div className="divide-y divide-[#E7E5E0]">
              {transactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="py-2.5 text-[12px]">
                  <div className="flex justify-between font-medium text-[#0F1419]">
                    <span className="truncate pr-2">{tx.patronName}</span>
                    <span className="num">{formatINR(tx.totalAmount)}</span>
                  </div>
                  <div className="text-[#5C6570] truncate mt-0.5">{tx.itemsSummary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Quick-Tap Menu & Numeric Keypad */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-[14px] border border-[#E7E5E0] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#0F1419]">Quick-Tap Wallet Menu</h2>
              <span className="num text-[12px] text-[#2D2A6E] font-medium">
                Tap multiplier: ×{qtyMultiplier}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {menu.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id)}
                  className="p-4 rounded-[12px] border border-[#E7E5E0] bg-[#FAFAF7]/50 hover:bg-white hover:border-[#2D2A6E] text-left cursor-pointer active:scale-95 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#5C6570] uppercase tracking-wider">
                      {item.category}
                    </span>
                    {item.isAlcoholic && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#B45309]"
                        title="21+ Alcoholic Item"
                      />
                    )}
                  </div>
                  <div className="text-[14px] font-semibold text-[#0F1419] mt-1">{item.name}</div>
                  <div className="num text-[15px] font-semibold text-[#2D2A6E] mt-2">
                    {formatINR(item.price)}
                  </div>
                </button>
              ))}
            </div>

            {/* Numeric Quantity Keypad */}
            <div className="pt-3 border-t border-[#E7E5E0]">
              <div className="text-[11px] text-[#5C6570] uppercase tracking-wider mb-2">
                Order Tap Multiplier
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQtyMultiplier(n)}
                    className={`h-10 rounded-[8px] border num text-[14px] font-semibold cursor-pointer active:scale-95 transition-all ${
                      qtyMultiplier === n
                        ? "bg-[#0F1419] text-white border-[#0F1419]"
                        : "bg-white text-[#0F1419] border-[#E7E5E0] hover:bg-[#FAFAF7]"
                    }`}
                  >
                    ×{n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Server-Priced Settlement Rail */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-[14px] border border-[#E7E5E0] shadow-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[#0F1419]">Order Settlement</h2>
              {cartEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCart({});
                    setServerQuote(null);
                    setUpiDeltaConfirmed(false);
                  }}
                  className="inline-flex items-center gap-1 text-[12px] text-[#DC2626] hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Clear
                </button>
              )}
            </div>

            {cartEntries.length === 0
              ? (
                <div className="py-10 text-center text-[13px] text-[#5C6570] border border-dashed border-[#E7E5E0] rounded-[12px]">
                  Tap items from the menu to start a bar tab.
                </div>
              )
              : (
                <div className="divide-y divide-[#E7E5E0] border-y border-[#E7E5E0]">
                  {cartEntries.map(({ item, quantity }) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#0F1419] truncate">
                          {item.name}
                        </div>
                        <div className="num text-[12px] text-[#5C6570]">
                          {formatINR(item.price)} × {quantity}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => adjustQty(item.id, -1)}
                          className="w-7 h-7 rounded-[6px] border border-[#E7E5E0] flex items-center justify-center hover:bg-[#FAFAF7] cursor-pointer active:scale-95"
                          aria-label={`Decrease ${item.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                        <span className="num text-[13px] font-semibold w-5 text-center">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustQty(item.id, 1)}
                          className="w-7 h-7 rounded-[6px] border border-[#E7E5E0] flex items-center justify-center hover:bg-[#FAFAF7] cursor-pointer active:scale-95"
                          aria-label={`Increase ${item.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#5C6570]">Server Order Total</span>
                <span className="num font-semibold text-[#0F1419]">
                  {formatINR(serverQuote?.cartTotal ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#0F766E]">Wallet Deduction</span>
                <span className="num font-semibold text-[#0F766E]">
                  -{formatINR(serverQuote?.walletDeduction ?? 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E7E5E0] text-[15px] font-semibold">
                <span className="text-[#0F1419]">UPI Delta Due</span>
                <span
                  className={`num ${serverQuote?.exceedsWallet ? "text-[#B45309]" : "text-[#0F1419]"}`}
                >
                  {formatINR(serverQuote?.upiDeltaRequired ?? 0)}
                </span>
              </div>
            </div>

            {serverQuote?.exceedsWallet && activeTicket && !isTicketExpired && (
              <div className="p-3.5 rounded-[10px] bg-[#FEF3C7]/60 border border-[#B45309]/25 space-y-2.5">
                <div className="text-[12px] font-medium text-[#B45309]">
                  Order exceeds Wallet wallet by{" "}
                  <span className="num font-semibold">
                    {formatINR(serverQuote.upiDeltaRequired)}
                  </span>
                  .
                </div>
                <button
                  type="button"
                  onClick={() => setUpiDeltaConfirmed((v) => !v)}
                  className={`w-full py-2 px-3 rounded-[8px] border text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                    upiDeltaConfirmed
                      ? "bg-[#16A34A] text-white border-[#16A34A]"
                      : "bg-white text-[#0F1419] border-[#E7E5E0]"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                  <span>
                    {upiDeltaConfirmed
                      ? "UPI Delta Payment Received"
                      : `Mark ${formatINR(serverQuote.upiDeltaRequired)} UPI Paid`}
                  </span>
                </button>
              </div>
            )}

            {/* ONE Primary CTA */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!activeTicket
                || isTicketExpired
                || cartEntries.length === 0
                || !serverQuote
                || (serverQuote.exceedsWallet && !upiDeltaConfirmed)}
              isLoading={settleOrder.isPending}
              onClick={handleSettle}
            >
              <span>Deduct &amp; Settle</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Origin-Aware Add Menu Item Modal (Name, Category, Price — NO Quantity Field) */}
      <AnimatePresence>
        {addItemOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1419]/40 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-menu-item-title"
            onClick={() => setAddItemOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={SPRING_SPATIAL}
              style={{ transformOrigin: "top right" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-[20px] border border-[#E7E5E0] shadow-modal p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E0]">
                <h2 id="add-menu-item-title" className="text-[19px] font-semibold text-[#0F1419]">
                  Add Counter Menu Item
                </h2>
                <button
                  type="button"
                  onClick={() => setAddItemOpen(false)}
                  className="p-1.5 rounded-[8px] text-[#5C6570] hover:text-[#0F1419] cursor-pointer"
                  aria-label="Close add menu item dialog"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleAddMenuSubmit)} className="space-y-4">
                <div>
                  <label
                    htmlFor="item-name"
                    className="block text-[13px] font-medium text-[#0F1419] mb-1"
                  >
                    Item Name
                  </label>
                  <input
                    id="item-name"
                    type="text"
                    placeholder="e.g. Rosemary Gin Fizz"
                    {...register("name")}
                    className="w-full h-11 px-3.5 rounded-[8px] border border-[#E7E5E0] text-[14px] focus:outline-none focus:border-[#2D2A6E]"
                  />
                  {errors.name && <p className="text-[12px] text-[#DC2626] mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="item-category"
                      className="block text-[13px] font-medium text-[#0F1419] mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="item-category"
                      {...register("category")}
                      className="w-full h-11 px-3 rounded-[8px] border border-[#E7E5E0] text-[14px] bg-white"
                    >
                      <option value="Bar">Bar</option>
                      <option value="Kitchen">Kitchen</option>
                      <option value="Non-Alcoholic">Non-Alcoholic</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="item-price"
                      className="block text-[13px] font-medium text-[#0F1419] mb-1"
                    >
                      Price (₹)
                    </label>
                    <input
                      id="item-price"
                      type="number"
                      {...register("price", { valueAsNumber: true })}
                      className="w-full h-11 px-3.5 rounded-[8px] border border-[#E7E5E0] text-[14px] num focus:outline-none focus:border-[#2D2A6E]"
                    />
                    {errors.price && <p className="text-[12px] text-[#DC2626] mt-1">{errors.price.message}</p>}
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-[13px] text-[#0F1419] cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("isAlcoholic")}
                    className="w-4 h-4 rounded-[4px] border-[#E7E5E0] accent-[#2D2A6E]"
                  />
                  <span>21+ Alcoholic Beverage</span>
                </label>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setAddItemOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" isLoading={addMenuItem.isPending}>
                    Save Menu Item
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
