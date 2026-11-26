import { z } from "zod";

export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["FOOD", "DRINK", "COCKTAIL", "BEER", "SHOT", "WINE", "NON_ALCOHOLIC"]).default("DRINK"),
  unit_price: z.number().default(0),
  price: z.number().optional(),
  is_active: z.boolean().default(true),
  serving_label: z.string().default(""),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuListSchema = z.array(MenuItemSchema);
export type MenuList = z.infer<typeof MenuListSchema>;

export const CreateMenuItemInputSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  category: z.enum(["FOOD", "DRINK"]),
  unit_price: z.number().min(1, "Price must be at least ₹1"),
  serving_label: z.string().max(32, "Use 32 characters or fewer").optional(),
  description: z.string().optional(),
});
export type CreateMenuItemInput = z.infer<typeof CreateMenuItemInputSchema>;
