import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStoreOwner } from "@/lib/auth/owner-middleware";
import { parseQuoteMessage, type CatalogProduct, type ParsedQuote } from "./quote-from-message";

/**
 * Orçamento a partir de mensagem: lê o pedido do cliente (texto colado ou mensagens do WhatsApp da loja) e devolve
 * o rascunho dos itens para o editor de orçamentos. Não grava nada — quem salva é o vendedor, no editor.
 * A leitura é local (src/lib/store/quote-from-message.ts): a mensagem não vai para nenhum serviço de IA.
 */

const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

type Sb = Awaited<ReturnType<typeof db>>;

/** Produtos ativos com categoria, categoria-mãe e os tamanhos ativos (com o preço próprio de cada tamanho). */
async function loadCatalog(sb: Sb): Promise<CatalogProduct[]> {
  const [{ data: prods, error }, { data: cats }] = await Promise.all([
    sb
      .from("products")
      .select("id, name, slug, image_url, price, category_id")
      .eq("status", "active")
      .limit(3000),
    sb.from("store_categories").select("id, name, parent_id"),
  ]);
  if (error) throw new Error(error.message);
  const catById = new Map((cats ?? []).map((c) => [c.id, c]));
  const variants: {
    product_id: string;
    size: string | null;
    price: number | null;
    sort_order: number | null;
  }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error: e } = await sb
      .from("store_product_variants")
      .select("product_id, size, price, sort_order")
      .eq("active", true)
      .not("size", "is", null)
      .order("product_id")
      .order("sort_order")
      .range(from, from + 999);
    if (e) throw new Error(e.message);
    variants.push(...((data ?? []) as typeof variants));
    if (!data || data.length < 1000) break;
  }
  const sizes = new Map<string, { size: string; price: number | null }[]>();
  for (const v of variants) {
    if (!v.size) continue;
    const list = sizes.get(v.product_id) ?? [];
    if (!list.some((s) => s.size === v.size))
      list.push({ size: v.size, price: v.price != null ? Number(v.price) : null });
    sizes.set(v.product_id, list);
  }
  return (prods ?? []).map((p) => {
    const cat = p.category_id ? catById.get(p.category_id) : undefined;
    const parent = cat?.parent_id ? catById.get(cat.parent_id) : undefined;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image_url: p.image_url,
      price: Number(p.price ?? 0),
      category: cat?.name ?? null,
      parent_category: parent?.name ?? null,
      sizes: sizes.get(p.id) ?? [],
    };
  });
}

/** Rascunho + os produtos citados (para trocar de modelo no editor sem ir ao servidor de novo). */
function withProducts(parsed: ParsedQuote, catalog: CatalogProduct[]) {
  const ids = new Set<string>();
  for (const l of parsed.lines) {
    if (l.product_id) ids.add(l.product_id);
    for (const a of l.alternatives) ids.add(a.product_id);
  }
  return { ...parsed, products: catalog.filter((p) => ids.has(p.id)) };
}

export type QuoteDraftFromMessage = ReturnType<typeof withProducts> & {
  text: string;
  customer: {
    customer_id: string | null;
    name: string;
    company: string;
    email: string;
    phone: string;
    document: string;
    city: string;
    state: string;
  } | null;
  messages: { id: string; body: string; sent_at: string }[];
};

/** Texto colado (pedido por e-mail, Instagram, anotação…). */
export const adminQuoteFromText = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ text: z.string().trim().min(2).max(6000) }).parse(i))
  .handler(async ({ data }): Promise<QuoteDraftFromMessage> => {
    const catalog = await loadCatalog(await db());
    return {
      ...withProducts(parseQuoteMessage(data.text, catalog), catalog),
      text: data.text,
      customer: null,
      messages: [],
    };
  });

/**
 * Mensagens de uma conversa do WhatsApp da loja. Sem `messageIds`, usa o que o cliente mandou desde a última
 * resposta da loja (até 10 mensagens de texto).
 */
export const adminQuoteFromWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({
        chatId: z.string().uuid(),
        messageIds: z.array(z.string().uuid()).max(30).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<QuoteDraftFromMessage> => {
    const sb = await db();
    const { data: chat, error } = await sb
      .from("whatsapp_chats")
      .select("id, name, phone_normalized, customer_id")
      .eq("id", data.chatId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!chat) throw new Error("Conversa não encontrada.");

    let msgs: { id: string; body: string | null; sent_at: string; from_me: boolean }[] = [];
    if (data.messageIds?.length) {
      const { data: rows, error: e } = await sb
        .from("whatsapp_messages")
        .select("id, body, sent_at, from_me")
        .eq("chat_id", chat.id)
        .in("id", data.messageIds)
        .order("sent_at");
      if (e) throw new Error(e.message);
      msgs = rows ?? [];
    } else {
      const { data: rows, error: e } = await sb
        .from("whatsapp_messages")
        .select("id, body, sent_at, from_me")
        .eq("chat_id", chat.id)
        // Confirmação automática e cópias do chat do site não são respostas da loja.
        .or("from_me.eq.false,source.eq.whatsapp")
        .eq("hidden", false)
        .order("sent_at", { ascending: false })
        .limit(40);
      if (e) throw new Error(e.message);
      for (const m of rows ?? []) {
        if (m.from_me) break; // só o que chegou depois da última resposta da loja
        if (m.body?.trim()) msgs.unshift(m);
        if (msgs.length >= 10) break;
      }
    }
    const textos = msgs.filter((m) => !m.from_me && m.body?.trim());
    if (!textos.length) throw new Error("Nenhuma mensagem de texto do cliente para ler.");
    const text = textos.map((m) => m.body!.trim()).join("\n");

    let customer: QuoteDraftFromMessage["customer"] = {
      customer_id: null,
      name: chat.name ?? "",
      company: "",
      email: "",
      phone: chat.phone_normalized ? `+${chat.phone_normalized}` : "",
      document: "",
      city: "",
      state: "",
    };
    if (chat.customer_id) {
      const { data: c } = await sb
        .from("customers")
        .select("id, full_name, company, email, phone, document, city, state")
        .eq("id", chat.customer_id)
        .maybeSingle();
      if (c) {
        customer = {
          customer_id: c.id,
          name: c.full_name ?? customer.name,
          company: c.company ?? "",
          email: c.email ?? "",
          phone: c.phone ?? customer.phone,
          document: c.document ?? "",
          city: c.city ?? "",
          state: c.state ?? "",
        };
      }
    }
    const catalog = await loadCatalog(sb);
    return {
      ...withProducts(parseQuoteMessage(text, catalog), catalog),
      text,
      customer,
      messages: textos.map((m) => ({ id: m.id, body: m.body!, sent_at: m.sent_at })),
    };
  });
