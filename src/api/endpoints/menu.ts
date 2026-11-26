import { CreateMenuItemInput, MenuItem, MenuItemSchema, MenuListSchema } from "@/models/menu.schema";
import { api } from "../client";

export const menuApi = {
  list: async (): Promise<MenuItem[]> => {
    const res = await api.get("/menu");
    const items = Array.isArray(res.data) ? res.data : res.data.items || [];
    return MenuListSchema.parse(
      items.map((i: any) => ({
        id: i.id,
        name: i.name,
        category: i.category || "DRINK",
        unit_price: i.unit_price ?? i.price ?? 0,
        price: i.unit_price ?? i.price ?? 0,
        is_active: i.is_active ?? true,
        serving_label: i.serving_label ?? "",
        description: i.description,
      })),
    );
  },

  create: async (input: CreateMenuItemInput): Promise<MenuItem> => {
    const res = await api.post("/counter/menu", input);
    return MenuItemSchema.parse({
      ...res.data,
      unit_price: res.data.unit_price,
      price: res.data.unit_price,
    });
  },

  update: async (id: string, input: CreateMenuItemInput): Promise<MenuItem> => {
    const res = await api.put(`/counter/menu/${id}`, input);
    return MenuItemSchema.parse({
      ...res.data,
      unit_price: res.data.unit_price,
      price: res.data.unit_price,
    });
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/counter/menu/${id}`);
  },
};
