import { Order, OrderSchema, PlaceOrderInput } from "@/models/order.schema";
import { api } from "../client";

export const ordersApi = {
  redeem: async (input: PlaceOrderInput): Promise<Order> => {
    const res = await api.post("/counter/redeem", {
      bar_code: input.bar_code,
      items: input.items.map((i) => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
      })),
      delta_collected: input.delta_collected,
      delta_payment_method: input.delta_payment_method,
      delta_amount: input.delta_amount,
      tequila_shots_redeemed: input.tequila_shots_redeemed,
    });
    return OrderSchema.parse({
      id: res.data.transaction_id || `tx-${Date.now()}`,
      ticketId: res.data.ticket_id,
      barCode: res.data.bar_code,
      items: [],
      totalBill: res.data.total_bill,
      walletDeducted: res.data.wallet_deducted,
      deltaToCollect: res.data.delta_to_collect,
      deltaPaymentMethod: res.data.delta_payment_method,
      deltaCollected: res.data.delta_collected ?? false,
      cashDeltaPaid: res.data.cash_delta_paid ?? 0,
      upiDeltaPaid: res.data.upi_delta_paid ?? 0,
      freeShotRedeemed: res.data.free_shot_redeemed ?? false,
      status: "SERVED",
    });
  },

  history: async (barCode: string) => {
    const res = await api.get(`/counter/tickets/${barCode}/history`);
    return res.data;
  },

  serve: async (orderId: string): Promise<{ success: boolean }> => {
    return { success: true };
  },
};
