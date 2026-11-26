import { useMenu } from "@/api/hooks/useMenu";
import { formatCurrencyINR } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";
import { useUiStore } from "@/stores/ui.store";
import { ArrowRight, GlassWater, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import React from "react";

export const CustomerMenuView: React.FC = () => {
  const { data: menuItems, isLoading } = useMenu();
  const { items, addItem, updateQuantity, removeItem, clearCart, totalAmount, barcode, setBarcode } = useCartStore();
  const { showToast } = useUiStore();

  return (
    <div className="space-y-8 animate-fade-in text-left pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-hairline)]/40 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-ink)] tracking-tight flex items-center gap-2.5">
            <GlassWater className="w-8 h-8 text-[var(--color-brand)]" /> Wallet Cashless Bar Menu
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Browse signature cocktails, shooters, craft beers &amp; gourmet bites.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Menu Items List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading
            ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 w-full rounded-xl bg-[var(--color-surface)]/50 border border-[var(--color-hairline)]/40 animate-pulse"
                  />
                ))}
              </div>
            )
            : menuItems && menuItems.length > 0
            ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menuItems.map((item) => {
                  const inCart = items.find((i) => i.item.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[var(--color-surface)]/75 border border-[var(--color-hairline)]/60 flex flex-col justify-between space-y-0 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-[var(--color-ink)] text-base">{item.name}</h3>
                          <span className="text-[11px] uppercase px-2 py-0.5 rounded bg-[var(--color-canvas)] text-[var(--color-muted)] border border-[var(--color-hairline)]/50 inline-block font-medium">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-[var(--color-brand)] num">
                          {formatCurrencyINR(item.unit_price || item.price || 0)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {inCart
                          ? (
                            <div className="flex items-center gap-2 bg-[var(--color-canvas)] border border-[var(--color-hairline)]/60 rounded-lg p-1">
                              <button
                                onClick={() => updateQuantity(item.id, inCart.quantity - 1)}
                                className="p-1 hover:text-[var(--color-ink)] text-[var(--color-muted)] cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold text-[var(--color-ink)] px-2 num">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, inCart.quantity + 1)}
                                className="p-1 hover:text-[var(--color-ink)] text-[var(--color-muted)] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                          : (
                            <button
                              onClick={() => addItem(item)}
                              className="px-3 py-1.5 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-brand)] hover:text-[var(--color-brand-text)] hover:border-[var(--color-brand)] transition-colors cursor-pointer"
                            >
                              + Add to Order
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
            : (
              <div className="p-8 rounded-2xl bg-[var(--color-surface)]/60 border border-[var(--color-hairline)]/40 text-center">
                <p className="text-[var(--color-muted)] text-sm">
                  No menu items loaded. Contact staff for the day's special offerings.
                </p>
              </div>
            )}
        </div>

        {/* Order Pre-selection Drawer */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[var(--color-surface)]/85 border border-[var(--color-hairline)]/70 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-hairline)]/40 pb-3">
              <h2 className="font-bold text-[var(--color-ink)] text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[var(--color-brand)]" /> Current Selection
              </h2>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-[var(--color-danger)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {items.length === 0
              ? (
                <p className="text-xs text-[var(--color-muted)] py-6 text-center">
                  Your order cart is empty. Add items from the bar menu to calculate total.
                </p>
              )
              : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {items.map((i) => (
                    <div
                      key={i.item.id}
                      className="flex items-center justify-between text-xs py-1 border-b border-[var(--color-hairline)]/30"
                    >
                      <div>
                        <div className="font-semibold text-[var(--color-ink)]">{i.item.name}</div>
                        <div className="text-[11px] text-[var(--color-muted)]">
                          {formatCurrencyINR(i.item.unit_price || i.item.price || 0)} × {i.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-ink)] num">
                          {formatCurrencyINR((i.item.unit_price || i.item.price || 0) * i.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(i.item.id)}
                          className="text-[var(--color-danger)] hover:opacity-80 p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            <div className="pt-2 border-t border-[var(--color-hairline)]/40 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-muted)]">Total Amount</span>
                <span className="text-lg font-bold text-[var(--color-ink)] num">
                  {formatCurrencyINR(totalAmount())}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                Present your 5-character bar code directly at any bar counter. Bartender will deduct from your cover
                wallet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
