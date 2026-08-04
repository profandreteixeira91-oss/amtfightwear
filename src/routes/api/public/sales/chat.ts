import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGateway } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";
import { streamText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";

// Simple in-memory rate limit (per worker instance)
const RATE = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const rec = RATE.get(key);
  if (!rec || rec.resetAt < now) {
    RATE.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (rec.count >= max) return false;
  rec.count += 1;
  return true;
}

const BodySchema = z.object({
  channel: z.enum(["web", "whatsapp", "instagram"]).default("web"),
  external_id: z.string().min(3).max(120),
  message: z.string().min(1).max(2000),
  customer_name: z.string().max(120).optional(),
  customer_email: z.string().max(200).optional(),
  customer_phone: z.string().max(40).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

function getServiceClient(): SB {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getOrCreateConversation(
  sb: SB,
  channel: string,
  external_id: string,
  patch: Partial<{ customer_name: string; customer_email: string; customer_phone: string }>,
) {
  const { data: existing } = await sb
    .from("sales_conversations")
    .select("id, customer_name, customer_email, customer_phone")
    .eq("channel", channel)
    .eq("external_id", external_id)
    .maybeSingle();
  if (existing) {
    const upd: Record<string, string> = { last_message_at: new Date().toISOString() };
    if (patch.customer_name && !existing.customer_name) upd.customer_name = patch.customer_name;
    if (patch.customer_email && !existing.customer_email) upd.customer_email = patch.customer_email;
    if (patch.customer_phone && !existing.customer_phone) upd.customer_phone = patch.customer_phone;
    await sb.from("sales_conversations").update(upd).eq("id", existing.id);
    return existing.id as string;
  }
  const { data: created, error } = await sb
    .from("sales_conversations")
    .insert({ channel, external_id, ...patch, last_message_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

async function loadHistory(sb: SB, conversationId: string): Promise<ModelMessage[]> {
  const { data } = await sb
    .from("sales_messages")
    .select("role, parts")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);
  const out: ModelMessage[] = [];
  for (const r of data ?? []) {
    const role = r.role as string;
    const parts = r.parts as { text?: string } | null;
    if (!parts?.text) continue;
    if (role === "user" || role === "assistant" || role === "system") {
      out.push({ role, content: parts.text } as ModelMessage);
    }
  }
  return out;
}

async function saveMessage(sb: SB, conversationId: string, role: string, text: string) {
  await sb.from("sales_messages").insert({ conversation_id: conversationId, role, parts: { text } });
}

async function getSettings(sb: SB) {
  const { data } = await sb
    .from("sales_agent_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

function buildSystemPrompt(settings: Record<string, unknown> | null, kb: Array<{ title: string; body_md: string }>): string {
  const tone = (settings?.tone as string) ?? "consultivo, cordial, direto";
  const site = (settings?.site_url as string) ?? "https://www.amtfightwear.com.br";
  const kbSection = kb.length
    ? `\n\nBASE DE CONHECIMENTO (use como fonte oficial de políticas):\n${kb.map((a) => `### ${a.title}\n${a.body_md}`).join("\n\n")}`
    : "";
  return `Você é o assistente de vendas oficial da AMT Fight Wear, loja brasileira especializada em Jiu-Jitsu e Judô. Site: ${site}.

Seu papel: atender o cliente final de forma ${tone}, entender a necessidade, recomendar produtos do catálogo, tirar dúvidas de tamanho/material, e ao final montar o carrinho e enviar o LINK do checkout da loja oficial.

REGRAS FUNDAMENTAIS:
1. NUNCA invente produtos, preços ou estoque. SEMPRE use as ferramentas (search_catalog, get_product_details) para responder sobre produtos.
2. Se o catálogo não retornar resultados, diga com honestidade que não localizou o item e ofereça acionar um atendente humano.
3. Pergunte o essencial para recomendar (modalidade, faixa, altura/peso para tamanho de kimono, uso adulto/infantil).
4. Ao fechar o pedido, use add_to_cart_item para cada item e depois generate_checkout_link — envie o link em markdown como [Ir para o checkout](URL).
5. Não ofereça descontos, cupons ou frete grátis. Se o cliente perguntar, consulte lookup_kb.
6. Português do Brasil, sem gírias, use "você". Respostas curtas e objetivas.
7. Se o cliente pedir para falar com humano, confirme que a mensagem ficará registrada.
${kbSection}`;
}

export const Route = createFileRoute("/api/public/sales/chat")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "X-Conversation-Id",
        };
        try {
          const raw = await request.json();
          const body = BodySchema.parse(raw);

          if (!rateLimit(`${body.channel}:${body.external_id}`)) {
            return new Response(JSON.stringify({ error: "rate_limited" }), {
              status: 429,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }

          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "missing_api_key" }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }


          const sb = getServiceClient();
          const settings = await getSettings(sb);
          const enabledKey = body.channel === "web" ? "channel_web_enabled" : body.channel === "whatsapp" ? "channel_wa_enabled" : "channel_ig_enabled";
          if (settings && !settings[enabledKey]) {
            return new Response(
              JSON.stringify({ reply: settings.offline_message ?? "Canal desativado no momento.", disabled: true }),
              { status: 200, headers: { "Content-Type": "application/json", ...cors } },
            );
          }

          const conversationId = await getOrCreateConversation(sb, body.channel, body.external_id, {
            customer_name: body.customer_name,
            customer_email: body.customer_email,
            customer_phone: body.customer_phone,
          });

          // Save user message
          await saveMessage(sb, conversationId, "user", body.message);

          // Se a conversa está em modo atendimento humano, não invoca IA.
          const { data: convRow } = await sb
            .from("sales_conversations")
            .select("status")
            .eq("id", conversationId)
            .maybeSingle();
          if (convRow?.status === "human") {
            const receipt = "Sua mensagem foi encaminhada para nosso atendente. Assim que ele responder, você verá aqui mesmo. 🙌";
            return new Response(receipt, {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8", ...cors, "X-Conversation-Id": conversationId, "X-Mode": "human" },
            });
          }

          // Load KB
          const { data: kbRows } = await sb
            .from("sales_kb_articles")
            .select("title, body_md")
            .eq("is_active", true)
            .limit(15);

          const history = await loadHistory(sb, conversationId);
          history.push({ role: "user", content: body.message });

          const cartTemplate = (settings?.cart_url_template as string) ?? "https://www.amtfightwear.com.br/carrinho/?add-to-cart={ids}&quantity={qtys}";
          const siteUrl = (settings?.site_url as string) ?? "https://www.amtfightwear.com.br";

          const gateway = createLovableAiGateway(apiKey);

          const tools = {
            search_catalog: tool({
              description: "Busca produtos no catálogo oficial AMT por termo, categoria ou faixa de preço. Use sempre antes de recomendar qualquer produto.",
              inputSchema: z.object({
                query: z.string().describe("Termo de busca em português (ex: 'kimono trançado infantil', 'faixa preta')"),
                max_price: z.number().optional().describe("Preço máximo em BRL"),
                limit: z.number().int().min(1).max(8).default(5),
              }),
              execute: async ({ query, max_price, limit }) => {
                let q = sb
                  .from("products")
                  .select("id, name, price, category, description, image_url, source_url, wc_product_id, stock")
                  .gt("stock", 0)
                  .limit(limit);
                if (query) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
                if (max_price) q = q.lte("price", max_price);
                const { data, error } = await q;
                if (error) return { error: error.message, results: [] };
                return {
                  results: (data ?? []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    category: p.category,
                    stock: p.stock,
                    short_description: (p.description ?? "").slice(0, 220),
                    has_checkout_id: !!p.wc_product_id,
                    image: p.image_url,
                    url: p.source_url,
                  })),
                };
              },
            }),
            get_product_details: tool({
              description: "Retorna todos os detalhes de um produto (nome, descrição, preço, imagem, link) pelo ID.",
              inputSchema: z.object({ product_id: z.string().uuid() }),
              execute: async ({ product_id }) => {
                const { data, error } = await sb.from("products").select("*").eq("id", product_id).maybeSingle();
                if (error || !data) return { error: "not_found" };
                return data;
              },
            }),
            add_to_cart_item: tool({
              description: "Adiciona um item ao carrinho da conversa. Use um chamada por produto. Sempre chame depois de o cliente confirmar tamanho/quantidade.",
              inputSchema: z.object({
                product_id: z.string().uuid(),
                quantity: z.number().int().min(1).max(20).default(1),
                size: z.string().max(20).optional(),
              }),
              execute: async ({ product_id, quantity, size }) => {
                const { data: prod } = await sb
                  .from("products")
                  .select("name, price, wc_product_id")
                  .eq("id", product_id)
                  .maybeSingle();
                if (!prod) return { error: "product_not_found" };

                // Garante carrinho ativo
                let { data: cart } = await sb
                  .from("sales_carts")
                  .select("id")
                  .eq("conversation_id", conversationId)
                  .eq("status", "active")
                  .maybeSingle();
                if (!cart) {
                  const { data: created } = await sb
                    .from("sales_carts")
                    .insert({ conversation_id: conversationId, status: "active" })
                    .select("id")
                    .single();
                  cart = created;
                }
                if (!cart) return { error: "cart_create_failed" };

                await sb.from("sales_cart_items").insert({
                  cart_id: cart.id,
                  product_id,
                  product_name: prod.name,
                  quantity,
                  size,
                  unit_price: prod.price,
                  wc_product_id: prod.wc_product_id,
                });

                // Atualiza total
                const { data: items } = await sb
                  .from("sales_cart_items")
                  .select("quantity, unit_price")
                  .eq("cart_id", cart.id);
                const total = (items ?? []).reduce((a: number, i: any) => a + Number(i.quantity) * Number(i.unit_price), 0);
                await sb.from("sales_carts").update({ total_estimate: total }).eq("id", cart.id);

                return { ok: true, added: prod.name, quantity, total_estimate: total };
              },
            }),
            view_cart: tool({
              description: "Mostra o carrinho atual da conversa.",
              inputSchema: z.object({}),
              execute: async () => {
                const { data: cart } = await sb
                  .from("sales_carts")
                  .select("id, total_estimate, status")
                  .eq("conversation_id", conversationId)
                  .eq("status", "active")
                  .maybeSingle();
                if (!cart) return { items: [], total: 0 };
                const { data: items } = await sb
                  .from("sales_cart_items")
                  .select("product_name, quantity, size, unit_price")
                  .eq("cart_id", cart.id);
                return { items: items ?? [], total: cart.total_estimate };
              },
            }),
            generate_checkout_link: tool({
              description: "Gera o link do checkout da loja oficial com todos os itens do carrinho já adicionados. Use APENAS depois de confirmar todos os itens com o cliente. Retorna a URL que você deve enviar em markdown.",
              inputSchema: z.object({}),
              execute: async () => {
                const { data: cart } = await sb
                  .from("sales_carts")
                  .select("id, total_estimate")
                  .eq("conversation_id", conversationId)
                  .eq("status", "active")
                  .maybeSingle();
                if (!cart) return { error: "empty_cart" };
                const { data: items } = await sb
                  .from("sales_cart_items")
                  .select("wc_product_id, quantity, product_name")
                  .eq("cart_id", cart.id);
                const valid = (items ?? []).filter((i: any) => i.wc_product_id);
                if (!valid.length) {
                  return { error: "no_wc_ids", note: "Os produtos do carrinho ainda não têm ID no e-commerce. Envie o cliente à página do produto individualmente." };
                }
                const ids = valid.map((i: any) => i.wc_product_id).join(",");
                const qtys = valid.map((i: any) => i.quantity).join(",");
                const url = cartTemplate.replace("{ids}", ids).replace("{qtys}", qtys);
                await sb.from("sales_carts").update({ status: "sent", checkout_url: url }).eq("id", cart.id);
                return { checkout_url: url, total: cart.total_estimate, item_count: valid.length, site: siteUrl };
              },
            }),
            lookup_kb: tool({
              description: "Consulta a base de conhecimento oficial (frete, troca, tamanhos, pagamento). Use quando o cliente perguntar sobre políticas.",
              inputSchema: z.object({ topic: z.string() }),
              execute: async ({ topic }) => {
                const { data } = await sb
                  .from("sales_kb_articles")
                  .select("title, body_md")
                  .eq("is_active", true)
                  .or(`title.ilike.%${topic}%,body_md.ilike.%${topic}%`)
                  .limit(3);
                return { articles: data ?? [] };
              },
            }),
          };

          const systemPrompt = buildSystemPrompt(settings, kbRows ?? []);

          const result = streamText({
            model: gateway("gemini-2.5-flash"),
            system: systemPrompt,
            messages: history,
            tools,
            stopWhen: stepCountIs(12),
            onFinish: async ({ text }) => {
              try {
                if (text?.trim()) {
                  await saveMessage(sb, conversationId, "assistant", text);
                }
                await sb.from("sales_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);

                // Notificar admins sobre a nova mensagem do USUÁRIO (se o fluxo chegou até aqui)
                const { sendPushToAmtAdmins } = await import("@/lib/push/admin-push.server");
                const { data: conv } = await sb.from("sales_conversations").select("customer_name, channel").eq("id", conversationId).single();
                
                await sendPushToAmtAdmins({
                  title: `Nova mensagem (${conv?.channel ?? "Chat"})`,
                  body: `${conv?.customer_name ?? "Cliente"}: ${body.message.slice(0, 100)}...`,
                  url: `/admin/atendimento?chat=${conversationId}`,
                  tag: `sales-${conversationId}`,
                }, "sales_message.new");
              } catch (e) {
                console.error("[sales/chat] persist error", e);
              }
            },
          });

          return result.toTextStreamResponse({
            headers: { ...cors, "X-Conversation-Id": conversationId },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown_error";
          console.error("[sales/chat] error", err);
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }
      },
    },
  },
});
