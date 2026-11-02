import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  product_id: string;
  variant_id?: string | null;
  name: string;
  variant_label?: string | null;
  slug: string;
  image_url?: string | null;
  unit_price: number;
  quantity: number;
  /** Nome a ser bordado (produtos "Bordada Personalizada"). */
  personalization?: string | null;
};

/** Mesmo produto/tamanho com nomes de bordado diferentes são itens distintos. */
const itemKey = (i: Pick<CartItem, "product_id" | "variant_id" | "personalization">) =>
  `${i.product_id}::${i.variant_id ?? ""}::${i.personalization ?? ""}`;


type CartState = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  add: (item: CartItem) => void;
  remove: (product_id: string, variant_id?: string | null, personalization?: string | null) => void;
  setQuantity: (
    product_id: string,
    variant_id: string | null | undefined,
    quantity: number,
    personalization?: string | null,
  ) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => itemKey(i) === itemKey(item));
          if (existing) {
            return {
              isOpen: true,
              items: s.items.map((i) =>
                itemKey(i) === itemKey(item) ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { isOpen: true, items: [...s.items, item] };
        }),
      remove: (product_id, variant_id, personalization) =>
        set((s) => ({
          items: s.items.filter((i) => itemKey(i) !== itemKey({ product_id, variant_id, personalization })),
        })),
      setQuantity: (product_id, variant_id, quantity, personalization) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              itemKey(i) === itemKey({ product_id, variant_id, personalization })
                ? { ...i, quantity: Math.max(1, quantity) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal: () => get().items.reduce((acc, i) => acc + i.quantity * i.unit_price, 0),
    }),
    {
      name: "amt-cart-v1",
      version: 2,
      // v1 podia conter itens do Custom Shop (removido): descarta-os ao reidratar.
      migrate: (persisted) => {
        const items = ((persisted as { items?: Array<CartItem & { type?: string }> })?.items ?? []).filter(
          (i) => i.type !== "custom" && !!i.product_id,
        );
        return { items } as unknown as CartState;
      },
      partialize: (s) => ({ items: s.items }) as unknown as CartState,
    },
  ),
);

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
