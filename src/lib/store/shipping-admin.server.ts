import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { buildShippingSender, SenderAddressesSchema, shippingDocument } from "./shipping-sender";
import { assertCheckoutPaid, isShippingPaid, labelUrl } from "./shipping-flow";
import { agencyRequired, assertAgency, normalizeRecipient, packageIssues, recipientIssues, type PostingAgency, type ShipmentVolume } from "./shipping-preflight";

export type ShippingOrder = Database["public"]["Tables"]["store_orders"]["Row"];
const ShipmentSchema = z.object({ id: z.string(), status: z.string(), price: z.coerce.number().optional(), protocol: z.string().nullish() });

class RejectedShippingRequest extends Error {}

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
    const errorMessage = `Melhor Envio [${response.status}]: ${message}`;
    if (response.status >= 400 && response.status < 500 && response.status !== 408) throw new RejectedShippingRequest(errorMessage);
    throw new Error(errorMessage);
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
  const recipient = normalizeRecipient(order);
  const missing = recipientIssues(recipient);
  if (missing.length) throw new Error(`Corrija os dados do destinatário: ${missing.join(", ")}.`);
  const { document, ...recipientAddress } = recipient;
  const to = { ...recipientAddress, phone: recipient.phone.replace(/\D/g, ""), ...shippingDocument(document), country_id: "BR" };
  if ((to.document && to.document === from.document) || (to.company_document && to.company_document === from.company_document)) throw new Error("Remetente e destinatário não podem ter o mesmo CPF/CNPJ.");
  const productIds = items.flatMap((i) => i.product_id ? [i.product_id] : []);
  const { data: products, error: productError } = productIds.length ? await db.from("products").select("id,weight_grams,length_cm,width_cm,height_cm").in("id", productIds) : { data: [], error: null };
  if (productError) throw new Error(productError.message);
  const volumes = items.map((item) => {
    const product = products?.find((p) => p.id === item.product_id);
    const dimension = (n: number | null | undefined, fallback: number) => n && n > 0 ? n : fallback;
    return { width: dimension(product?.width_cm, settings.default_width_cm), height: dimension(product?.height_cm, settings.default_height_cm), length: dimension(product?.length_cm, settings.default_length_cm), weight: dimension(product?.weight_grams ? product.weight_grams / 1000 : null, settings.default_weight_kg) * item.quantity };
  });
  const preparation = await servicePreparation(service.service_id, from, settings.env);
  const insurance = Number(items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0).toFixed(2));
  const issues = packageIssues(preparation.service, volumes, insurance);
  if (issues.length) throw new Error(issues.join(" "));
  assertAgency(preparation.required, service.agency_id, preparation.agencies);
  const claim = await claimShipping(order);
  // Do not release ambiguous writes: a timeout may still have created a cart item.
  let response: { id: string; protocol?: string | null };
  try {
  response = z.object({ id: z.string(), protocol: z.string().nullish() }).parse(await meRequest("/me/cart", settings.env, {
    service: service.service_id, ...(service.agency_id ? { agency: service.agency_id } : {}), from, to,
    products: items.map((i) => ({ name: i.product_name.slice(0, 60), quantity: i.quantity, unitary_value: Number(i.unit_price) })), volumes,
    options: { insurance_value: insurance, ...(service.agency_id ? { agency_id: service.agency_id } : {}), receipt: false, own_hand: false, reverse: false, non_commercial: true, platform: "AMT Fight Wear", tags: [{ tag: order.order_number, url: null }] },
  }));
  } catch (error) {
    if (error instanceof RejectedShippingRequest) await releaseShipping(order.id, claim);
    throw error;
  }
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
  try {
    await meRequest("/me/shipment/checkout", env, { orders: [current.id] });
  } catch (error) {
    if (error instanceof RejectedShippingRequest) await releaseShipping(order.id, claim);
    throw error;
  }
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
  try { buildShippingSender(profile, settings.sender_address_id ? addresses.filter((a) => a.id === settings.sender_address_id) : raw, settings.origin_zip); } catch (error) { problem = error instanceof Error ? error.message : "Cadastro inválido."; }
  return { problem, addresses: addresses.map((a) => ({ id: a.id, zip: a.postal_code, label: `${a.label || "Remetente"} — ${a.address}, ${a.number} · ${a.city.city}/${a.city.state.state_abbr} · CEP ${a.postal_code}` })) };
}

const ServiceSchema = z.object({ id: z.number(), status: z.string(), company: z.object({ id: z.number() }) }).passthrough();
const AgencySchema = z.object({ id: z.number(), name: z.string(), note: z.string().nullish(), services: z.array(z.object({ id: z.number() })).optional(), address: z.object({ address: z.string(), number: z.string(), district: z.string(), city: z.object({ city: z.string(), state: z.object({ state_abbr: z.string() }) }) }) });

async function servicePreparation(id: number, from: Record<string, string>, env: string): Promise<{ service: z.infer<typeof ServiceSchema>; required: boolean; agencies: PostingAgency[] }> {
  const service = ServiceSchema.parse(await meRequest(`/me/shipment/services/${id}`, env));
  if (service.status !== "available") throw new Error("Este serviço está indisponível. Atualize a cotação e selecione outra transportadora.");
  const required = agencyRequired(service);
  if (!required) return { service, required, agencies: [] };
  const query = new URLSearchParams({ company: String(service.company.id), country: "BR", state: from.state_abbr || "" });
  const raw = await meRequest(`/me/shipment/agencies?${query}`, env);
  const agencies = z.array(AgencySchema).parse(raw ?? []).filter((a) => !a.services || a.services.some((s) => s.id === id)).map((a) => ({ id: a.id, label: `${a.name} — ${a.address.address}, ${a.address.number} · ${a.address.district} · ${a.address.city.city}/${a.address.city.state.state_abbr}${a.note ? ` · ${a.note}` : ""}` }));
  return { service, required, agencies };
}

export async function prepareShipping(order: ShippingOrder, serviceId: number) {
  const settings = await loadShippingSettings();
  const recipient = normalizeRecipient(order);
  const issues = recipientIssues(recipient).map((field) => `Destinatário: ${field} ausente ou inválido.`);
  let preparation: Awaited<ReturnType<typeof servicePreparation>> | null = null;
  try {
    const [profile, raw] = await Promise.all([meRequest("/me", settings.env), meRequest("/me/addresses", settings.env)]);
    const addresses = SenderAddressesSchema.parse(raw);
    const from = buildShippingSender(profile, settings.sender_address_id ? addresses.filter((a) => a.id === settings.sender_address_id) : addresses, settings.origin_zip);
    preparation = await servicePreparation(serviceId, from, settings.env);
    if (preparation.required && !preparation.agencies.length) issues.push("Nenhuma agência disponível para este serviço no estado do remetente. Selecione outra transportadora.");
    try {
      const doc = shippingDocument(recipient.document);
      if (("document" in doc && doc.document === from.document) || ("company_document" in doc && doc.company_document === from.company_document)) issues.push("Remetente e destinatário não podem ter o mesmo CPF/CNPJ.");
    } catch { /* Already listed by recipientIssues. */ }
    const db = await shippingDb();
    const { data: items, error } = await db.from("store_order_items").select("product_id,quantity,unit_price").eq("order_id", order.id);
    if (error || !items?.length) throw new Error("Pedido sem itens válidos para envio.");
    const ids = items.flatMap((i) => i.product_id ? [i.product_id] : []);
    const { data: products, error: productError } = ids.length ? await db.from("products").select("id,weight_grams,length_cm,width_cm,height_cm").in("id", ids) : { data: [], error: null };
    if (productError) throw new Error("Não foi possível conferir as medidas dos produtos.");
    const volumes: ShipmentVolume[] = items.map((i) => {
      const p = products?.find((p) => p.id === i.product_id);
      const dim = (v: number | null | undefined, fallback: number): number => v && v > 0 ? v : fallback;
      return { width: dim(p?.width_cm, settings.default_width_cm), height: dim(p?.height_cm, settings.default_height_cm), length: dim(p?.length_cm, settings.default_length_cm), weight: dim(p?.weight_grams ? p.weight_grams / 1000 : null, settings.default_weight_kg) * i.quantity };
    });
    issues.push(...packageIssues(preparation.service, volumes, items.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0)));
  } catch (error) { issues.push(error instanceof Error ? error.message : "Não foi possível validar o remetente e a transportadora."); }
  return { recipient, issues, agency_required: preparation?.required ?? false, agencies: preparation?.agencies ?? [] };
}