// Chat do site da loja ("Fale conosco"): número da loja e o evento que abre a janela.

/** WhatsApp da loja (instância amt-loja): atende o chat do site, no celular e no /admin/whatsapp. */
export const STORE_WHATSAPP_NUMBER = "5582920016732";
export const STORE_WHATSAPP_URL = `https://wa.me/${STORE_WHATSAPP_NUMBER}`;

/** Evento que abre o chat do site (components/store/SiteChat.tsx). */
export const SITE_CHAT_EVENT = "amt:store-chat-open";

/**
 * Clique num link "Fale conosco"/WhatsApp da loja: abre o chat na própria página. Sem o chat carregado
 * (JavaScript desligado, erro), o link segue para o WhatsApp normalmente.
 */
export function openSiteChat(event?: { preventDefault(): void }) {
  if (
    typeof window === "undefined" ||
    !(window as unknown as { __amtStoreChat?: boolean }).__amtStoreChat
  )
    return;
  event?.preventDefault();
  window.dispatchEvent(new Event(SITE_CHAT_EVENT));
}
