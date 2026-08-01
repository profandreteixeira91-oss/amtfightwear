/**
 * Eventos nativos de e-commerce da loja AMT Fight Wear.
 *
 * Não adiciona nenhuma integração externa: os eventos são publicados em
 * `window.dataLayer` (padrão GTM/GA4, caso um dia seja plugado), em
 * `window.gtag` quando existir e como CustomEvent `amt:store-event`,
 * permitindo que qualquer parte da aplicação escute a jornada de compra.
 */

export type StoreEventName =
  | "view_item"
  | "view_item_list"
  | "select_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "begin_checkout"
  | "add_shipping_info"
  | "add_payment_info"
  | "purchase"
  | "search"
  | "add_to_wishlist"
  | "remove_from_wishlist"
  | "customizer_change"
  | "cart_abandon";

type EventParams = Record<string, unknown>;

interface DataLayerWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

export function trackStoreEvent(name: StoreEventName, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  const payload = { event: name, currency: "BRL", ...params };
  try {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push(payload);
    if (typeof w.gtag === "function") w.gtag("event", name, { currency: "BRL", ...params });
    window.dispatchEvent(new CustomEvent("amt:store-event", { detail: payload }));
  } catch {
    /* analytics nunca deve quebrar a jornada de compra */
  }
}

/** Item no formato de e-commerce usado pelos eventos. */
export function toAnalyticsItem(input: {
  id: string;
  name: string;
  price: number | string;
  quantity?: number;
  category?: string | null;
  variant?: string | null;
}) {
  return {
    item_id: input.id,
    item_name: input.name,
    price: Number(input.price),
    quantity: input.quantity ?? 1,
    ...(input.category ? { item_category: input.category } : {}),
    ...(input.variant ? { item_variant: input.variant } : {}),
  };
}
