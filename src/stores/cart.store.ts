import type { MenuItem } from "@/models/menu.schema";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  barcode: string;
  addItem: (item: MenuItem, qty?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  setBarcode: (code: string) => void;
  clearCart: () => void;
  totalAmount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      barcode: "",
      addItem: (item, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.item.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) => i.item.id === item.id ? { ...i, quantity: i.quantity + qty } : i),
            };
          }
          return { items: [...state.items, { item, quantity: qty }] };
        });
      },
      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.item.id !== itemId),
        }));
      },
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => i.item.id === itemId ? { ...i, quantity } : i),
        }));
      },
      setBarcode: (barcode) => set({ barcode }),
      clearCart: () => set({ items: [], barcode: "" }),
      totalAmount: () => {
        return get().items.reduce((sum, i) => sum + (i.item.unit_price || i.item.price || 0) * i.quantity, 0);
      },
    }),
    { name: "venu-cart" },
  ),
);
