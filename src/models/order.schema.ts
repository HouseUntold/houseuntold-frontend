import { z } from "zod";

export const OrderItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  ticketId: z.string().optional(),
  barCode: z.string().optional(),
  items: z.array(OrderItemSchema),
  totalBill: z.number(),
  walletDeducted: z.number(),
  deltaToCollect: z.number().default(0),
  deltaPaymentMethod: z.string().optional(),
  deltaCollected: z.boolean().default(false),
  cashDeltaPaid: z.number().default(0),
  upiDeltaPaid: z.number().default(0),
  freeShotRedeemed: z.boolean().default(false),
  status: z.enum(["PENDING", "PREPARING", "SERVED", "CANCELLED"]).default("PENDING"),
  createdAt: z.string().optional(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderListSchema = z.array(OrderSchema);
export type OrderList = z.infer<typeof OrderListSchema>;

export const PlaceOrderInputSchema = z.object({
  bar_code: z.string(),
  items: z.array(z.object({
    menu_item_id: z.string(),
    quantity: z.number().min(1),
  })),
  delta_collected: z.boolean().default(false),
  delta_payment_method: z.string().optional(),
  delta_amount: z.number().int().min(0).optional(),
  tequila_shots_redeemed: z.number().int().min(0).optional(),
});
export type PlaceOrderInput = z.infer<typeof PlaceOrderInputSchema>;
