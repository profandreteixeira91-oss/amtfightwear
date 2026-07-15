import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CustomConfig = {
  template_id: string;
  template_kind: string;
  template_name: string;
  zones: Record<string, string>; // zone_key -> hex
  patches: Array<{ slot_key: string; patch_id: string; patch_name: string; image_url: string; price: number }>;
  embroidery?: { text: string; slot_key: string; color: string } | null;
  embroideries?: Array<{ slot_key: string; text: string | null; image: { data_url: string; filename: string } | null; color: string }> | null;
  fabric?: { id: string; name: string; price_delta: number } | null;
  modality?: string | null;
  logo_image?: { data_url: string; filename: string } | null;
  label_image?: { data_url: string; filename: string } | null;
};

export type CartItem = {
  product_id: string;
  variant_id?: string | null;
  name: string;
  variant_label?: string | null;
  slug: string;
  image_url?: string | null;
  unit_price: number;
  quantity: number;
  type?: "product" | "custom";
  custom_config?: CustomConfig | null;
  production_days?: number | null;
};


type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (product_id: string, variant_id?: string | null) => void;
  setQuantity: (product_id: string, variant_id: string | null | undefined, quantity: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const key = (i: CartItem) => `${i.product_id}::${i.variant_id ?? ""}`;
          const existing = s.items.find((i) => key(i) === key(item));
          if (existing) {
            return {
              items: s.items.map((i) =>
                key(i) === key(item) ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      remove: (product_id, variant_id) =>
        set((s) => ({
          items: s.items.filter((i) => !(i.product_id === product_id && (i.variant_id ?? null) === (variant_id ?? null))),
        })),
      setQuantity: (product_id, variant_id, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.product_id === product_id && (i.variant_id ?? null) === (variant_id ?? null)
                ? { ...i, quantity: Math.max(1, quantity) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal: () => get().items.reduce((acc, i) => acc + i.quantity * i.unit_price, 0),
    }),
    { name: "amt-cart-v1" },
  ),
);

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
