import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { buildShippingSender, SenderAddressesSchema, shippingDocument } from "./shipping-sender";
import { assertCheckoutPaid, isShippingPaid, labelUrl } from "./shipping-flow";

export type ShippingOrder = Database["public"]["Tables"]["store_orders"]["Row"];
const ShipmentSchema = z.object({ id: z.string(), status: z.string(), price: z.coerce.number().optional(), protocol: z.string().nullish() });

export async function meRequest(path: string, env: string, body?: unknown): Promise<unknown> {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) throw new Error("A conexão do Melhor Envio não está configurada.");
  const base = env === "sandbox" ? "https://sandbox.melhorenvio.com.br/api/v2" : "https://www.melhorenvio.com.br/api/v2";
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(25_000),
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", "User-Agent": process.env.MELHOR_ENVIO_USER_AGENT || "AMT Fight Wear (contato@amtfightwear.com.br)" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let value: unknown;
  try { value = JSON.parse(text); } catch { value = null; }
  if (!response.ok) {
    const parsed = z.object({ message: z.string().optional(), errors: z.record(z.string(), z.unknown()).optional() }).safeParse(value);
    const message = parsed.success ? parsed.data.message || Object.values(parsed.data.errors || {}).flat().join("; ") : "Não foi possível concluir a operação.";
    throw new Error(`Melhor Envio [${response.status}]: ${message}`);
  }
  return value;
}

export async function shippingDb() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export async function loadShippingSettings() {
  const db = await shippingDb();
  const { data, error } = await db.from("store_shipping_settings").select("*").eq("singleton", true).single();
  if (error || !data) throw new Error("Configuração de envio não encontrada.");
  return data;
}

export async function loadShippingOrders(ids: string[]): Promise<ShippingOrder[]> {
  const db = await shippingDb();
  const unique = [...new Set(ids)];
  const { data, error } = await db.from("store_orders").select("*").in("id", unique);
  if (error) throw new Error(error.message);
  if (!data || data.length !== unique.length) throw new Error("Um dos pedidos selecionados não foi encontrado.");
  return data;
}

export async function saveShippingOrder(id: string, patch: Database["public"]["Tables"]["store_orders"]["Update"]): Promise<void> {
  const db = await shippingDb();
  const { error } = await db.from("store_orders").update(patch).eq("id", id);
  if (error) throw new Error("Não foi possível salvar o envio. Atualize o rastreio antes de tentar novamente.");
}

export async function claimShipping(order: ShippingOrder): Promise<string> {
  const db = await shippingDb();
  const claim = crypto.randomUUID();
  const { data, error } = await db.from("store_orders").update({ melhor_envio_operation_id: claim, melhor_envio_operation_started_at: new Date().toISOString() }).eq("id", order.id).is("melhor_envio_operation_id", null).select("id").maybeSingle();
  if (error || !data) throw new Error("Este envio possui uma operação em andamento ou pendente de confirmação. Atualize o rastreio antes de repetir.");
  return claim;
}

export async function releaseShipping(id: string, claim: string): Promise<void> {
  const db = await shippingDb();
  const { error } = await db.from("store_orders").update({ melhor_envio_operation_id: null, melhor_envio_operation_started_at: null }).eq("id", id).eq("melhor_envio_operation_id", claim);
  if (error) throw new Error("Envio concluído, mas precisa ser sincronizado antes de uma nova operação.");
}

export async function shipmentStatus(order: ShippingOrder, env: string) {
  const id = order.melhor_envio_order_id || order.melhor_envio_cart_id;
  if (!id) throw new Error("Pedido sem envio no Melhor Envio.");
  return ShipmentSchema.parse(await meRequest(`/me/orders/${encodeURIComponent(id)}`, order.melhor_envio_env || env));
}

export async function addShippingToCart(order: ShippingOrder, service: { service_id: number; service_name?: string; agency_id?: number }) {
  if (order.melhor_envio_cart_id) return { cart_id: order.melhor_envio_cart_id, protocol: order.melhor_envio_protocol };
  const settings = await loadShippingSettings();
  const db = await shippingDb();
  const { data: items, error } = await db.from("store_order_items").select("*").eq("order_id", order.id);
  if (error || !items?.length) throw new Error("Pedido sem itens válidos para envio.");
  const [profile, addresses] = await Promise.all([meRequest("/me", settings.env), meRequest("/me/addresses", settings.env)]);
  const selectedAddresses = SenderAddressesSchema.parse(addresses);
  const from = buildShippingSender(profile, settings.sender_address_id ? selectedAddresses.filter((a) => a.id === settings.sender_address_id) : selectedAddresses, settings.origin_zip);
  const address = z.record(z.string(), z.unknown()).parse(order.shipping_address);
  const value = (...keys: string[]) => String(keys.map((k) => address[k]).find((v) => v != null && v !== "") || "");
  const to = { name: order.customer_name, phone: (order.customer_phone || "").replace(/\D/g, ""), email: order.customer_email,
    ...shippingDocument(order.customer_document || ""), address: value("street", "address", "logradouro"), number: value("number", "numero"),
    complement: value("complement", "complemento"), district: value("neighborhood", "district", "bairro"), city: value("city", "cidade"),
    postal_code: value("zip", "postal_code", "cep").replace(/\D/g, ""), state_abbr: value("state", "uf").toUpperCase(), country_id: "BR" };
  if (!to.address || !to.number || !to.district || !to.city || !/^\d{8}$/.test(to.postal_code) || !/^[A-Z]{2}$/.test(to.state_abbr)) throw new Error("O endereço do destinatário está incompleto. Corrija o cadastro do pedido antes de contratar.");
  const productIds = items.flatMap((i) => i.product_id ? [i.product_id] : []);
  const { data: products, error: productError } = productIds.length ? await db.from("products").select("id,weight_grams,length_cm,width_cm,height_cm").in("id", productIds) : { data: [], error: null };
  if (productError) throw new Error(productError.message);
  const volumes = items.map((item) => {
    const product = products?.find((p) => p.id === item.product_id);
    const dimension = (n: number | null | undefined, fallback: number) => n && n > 0 ? n : fallback;
    return { width: dimension(product?.width_cm, settings.default_width_cm), height: dimension(product?.height_cm, settings.default_height_cm), length: dimension(product?.length_cm, settings.default_length_cm), weight: dimension(product?.weight_grams ? product.weight_grams / 1000 : null, settings.default_weight_kg) * item.quantity };
  });
  const claim = await claimShipping(order);
  // Do not release ambiguous writes: a timeout may still have created a cart item.
  const response = z.object({ id: z.string(), protocol: z.string().nullish() }).parse(await meRequest("/me/cart", settings.env, {
    service: service.service_id, ...(service.agency_id ? { agency: service.agency_id } : {}), from, to,
    products: items.map((i) => ({ name: i.product_name.slice(0, 60), quantity: i.quantity, unitary_value: Number(i.unit_price) })), volumes,
    options: { insurance_value: Number(items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0).toFixed(2)), receipt: false, own_hand: false, reverse: false, non_commercial: true, platform: "AMT Fight Wear", tags: [{ tag: order.order_number, url: null }] },
  }));
  await saveShippingOrder(order.id, { melhor_envio_cart_id: response.id, melhor_envio_protocol: response.protocol || null, melhor_envio_service_id: service.service_id, melhor_envio_service_name: service.service_name || null, melhor_envio_status: "in_cart", melhor_envio_env: settings.env });
  await releaseShipping(order.id, claim);
  return { cart_id: response.id, protocol: response.protocol || null };
}

export async function checkoutShipping(order: ShippingOrder): Promise<void> {
  const settings = await loadShippingSettings();
  const env = order.melhor_envio_env || settings.env;
  const current = await shipmentStatus(order, env);
  if (isShippingPaid(current.status)) {
    await saveShippingOrder(order.id, { melhor_envio_status: current.status, melhor_envio_order_id: current.id });
    return;
  }
  if (current.status !== "pending") throw new Error(`Este envio não pode ser comprado no status ${current.status}. Atualize o rastreio.`);
  const balance = z.object({ balance: z.coerce.number() }).parse(await meRequest("/me/balance", env));
  if (current.price == null || balance.balance < current.price) throw new Error("Saldo insuficiente no Melhor Envio. Adicione saldo à carteira e atualize o painel para pagar o frete.");
  const claim = await claimShipping(order);
  await meRequest("/me/shipment/checkout", env, { orders: [current.id] });
  const confirmed = await shipmentStatus(order, env);
  assertCheckoutPaid([confirmed], [current.id]);
  await saveShippingOrder(order.id, { melhor_envio_status: confirmed.status, melhor_envio_order_id: confirmed.id, melhor_envio_protocol: confirmed.protocol || order.melhor_envio_protocol, melhor_envio_synced_at: new Date().toISOString() });
  await releaseShipping(order.id, claim);
}

export async function printShipping(orders: ShippingOrder[]): Promise<string> {
  const settings = await loadShippingSettings();
  const env = orders[0]?.melhor_envio_env || settings.env;
  if (orders.some((o) => (o.melhor_envio_env || settings.env) !== env)) throw new Error("Selecione envios do mesmo ambiente para imprimir.");
  const shipments = await Promise.all(orders.map((o) => shipmentStatus(o, env)));
  if (shipments.some((s) => !isShippingPaid(s.status))) throw new Error("Confirme o pagamento de todos os fretes antes de gerar as etiquetas.");
  const pending = shipments.filter((s) => s.status === "paid").map((s) => s.id);
  if (pending.length) await meRequest("/me/shipment/generate", env, { orders: pending });
  // Generation is asynchronous; persist each real status and allow safe retry, never fake success.
  const current = await Promise.all(orders.map((o) => shipmentStatus(o, env)));
  for (const [index, order] of orders.entries()) {
    await saveShippingOrder(order.id, { melhor_envio_status: current[index]?.status, melhor_envio_synced_at: new Date().toISOString() });
  }
  if (current.some((s) => s.status === "paid")) throw new Error("As etiquetas estão sendo preparadas. Aguarde alguns segundos e clique em imprimir novamente.");
  const url = labelUrl(await meRequest("/me/shipment/print", env, { mode: "public", orders: current.map((s) => s.id) }));
  for (const order of orders) await saveShippingOrder(order.id, { melhor_envio_label_url: url });
  return url;
}

export async function senderOptions() {
  const settings = await loadShippingSettings();
  const [profile, raw] = await Promise.all([meRequest("/me", settings.env), meRequest("/me/addresses", settings.env)]);
  const addresses = SenderAddressesSchema.parse(raw);
  let problem: string | null = null;
  try { buildShippingSender(profile, raw, settings.origin_zip); } catch (error) { problem = error instanceof Error ? error.message : "Cadastro inválido."; }
  return { problem, addresses: addresses.map((a) => ({ id: a.id, zip: a.postal_code, label: `${a.label || "Remetente"} — ${a.address}, ${a.number} · ${a.city.city}/${a.city.state.state_abbr} · CEP ${a.postal_code}` })) };
}