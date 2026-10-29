import { z } from "zod";
import { shippingDocument } from "./shipping-sender";

export const RecipientSchema = z.object({
  name: z.string().trim(), email: z.string().trim(), phone: z.string(), document: z.string(),
  address: z.string().trim(), number: z.string().trim(), complement: z.string(), district: z.string().trim(),
  city: z.string().trim(), postal_code: z.string(), state_abbr: z.string(),
});
export type ShippingRecipient = z.infer<typeof RecipientSchema>;
export type PostingAgency = { id: number; label: string };
export const ShipmentVolumeSchema = z.object({
  width: z.number().finite().positive(), height: z.number().finite().positive(),
  length: z.number().finite().positive(), weight: z.number().finite().positive(),
});
export const ShipmentVolumesSchema = z.array(ShipmentVolumeSchema).min(1).max(50);
export type ShipmentVolume = z.infer<typeof ShipmentVolumeSchema>;

export function resolveShipmentVolumes(saved: unknown, estimated: ShipmentVolume[]): ShipmentVolume[] {
  return saved == null ? ShipmentVolumesSchema.parse(estimated) : ShipmentVolumesSchema.parse(saved);
}

export function assertPackageEditable(order: { melhor_envio_cart_id: string | null; melhor_envio_order_id: string | null; melhor_envio_operation_id: string | null }): void {
  if (order.melhor_envio_cart_id || order.melhor_envio_order_id || order.melhor_envio_operation_id) throw new Error("Não é possível alterar a embalagem após iniciar a contratação.");
}

export function agencyRequired(service: unknown): boolean {
  const parsed = z.object({ requirements: z.unknown().optional(), rules: z.unknown().optional() }).parse(service);
  const requirements = z.object({ rules: z.record(z.string(), z.unknown()).optional() }).safeParse(parsed.requirements);
  const rule = requirements.success ? requirements.data.rules?.["options.agency_id"] : undefined;
  if (Array.isArray(rule)) return rule.includes("required");
  const legacy = z.object({ options: z.record(z.string(), z.unknown()).optional() }).safeParse(parsed.rules);
  return legacy.success && legacy.data.options?.agency_id != null;
}

export function assertAgency(required: boolean, id: number | undefined, agencies: Array<{ id: number }>): void {
  if (required && !id) throw new Error("Selecione a agência de postagem exigida pela transportadora.");
  if (id && !agencies.some((a) => a.id === id)) throw new Error("A agência não atende este serviço na região do remetente.");
}

export function recipientIssues(value: Partial<ShippingRecipient>): string[] {
  const issues: string[] = [];
  if (!value.name?.trim()) issues.push("Nome");
  if (!z.string().email().safeParse(value.email).success) issues.push("E-mail");
  if (!/^\d{10,11}$/.test((value.phone || "").replace(/\D/g, ""))) issues.push("Telefone");
  try { shippingDocument(value.document || ""); } catch { issues.push("CPF/CNPJ"); }
  for (const [key, label] of [["address", "Rua"], ["number", "Número"], ["district", "Bairro"], ["city", "Cidade"]] as const) {
    if (!value[key]?.trim()) issues.push(label);
  }
  if (!/^\d{8}$/.test((value.postal_code || "").replace(/\D/g, ""))) issues.push("CEP");
  if (!/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(value.state_abbr || "")) issues.push("UF");
  return issues;
}

export function normalizeRecipient(order: { customer_name: string; customer_email: string; customer_phone: string | null; customer_document: string | null; shipping_address: unknown }): ShippingRecipient {
  const raw = z.record(z.string(), z.unknown()).safeParse(order.shipping_address);
  const a = raw.success ? raw.data : {};
  const value = (...keys: string[]): string => String(keys.map((k) => a[k]).find((v) => v != null && v !== "") ?? "").trim();
  return { name: order.customer_name || "", email: order.customer_email || "", phone: order.customer_phone || "", document: order.customer_document || "",
    address: value("street", "address", "logradouro"), number: value("number", "numero"), complement: value("complement", "complemento"), district: value("neighborhood", "district", "bairro"), city: value("city", "cidade"), postal_code: value("zip", "zipcode", "postal_code", "cep").replace(/\D/g, ""), state_abbr: value("state", "uf").toUpperCase() };
}

export function packageIssues(service: unknown, volumes: ShipmentVolume[], insurance: number): string[] {
  const limit = z.object({ min: z.number().optional(), max: z.number().optional(), max_dec: z.number().optional() });
  const parsed = z.object({ restrictions: z.object({ insurance_value: limit.optional(), formats: z.object({ box: z.object({ weight: limit, width: limit, height: limit, length: limit, sum: z.number().optional() }).optional() }).optional() }).optional() }).safeParse(service);
  if (!parsed.success) throw new Error("Regras da transportadora inválidas. Tente atualizar a cotação.");
  const issues: string[] = [];
  const restrictions = parsed.data.restrictions;
  const range = restrictions?.insurance_value;
  const maximum = range?.max_dec ?? range?.max;
  if ((range?.min != null && insurance < range.min) || (maximum != null && insurance > maximum)) issues.push("Valor declarado fora do limite para envio sem nota fiscal. Selecione outro serviço.");
  const box = restrictions?.formats?.box;
  if (box) for (const [index, volume] of volumes.entries()) {
    for (const key of ["width", "height", "length", "weight"] as const) {
      const rule = box[key];
      if (!Number.isFinite(volume[key]) || volume[key] <= 0 || (rule.min != null && volume[key] < rule.min) || (rule.max != null && volume[key] > rule.max)) issues.push(`Volume ${index + 1}: ${key === "weight" ? "peso" : { width: "largura", height: "altura", length: "comprimento" }[key]} fora dos limites da transportadora.`);
    }
    if (box.sum != null && volume.width + volume.height + volume.length > box.sum) issues.push(`Volume ${index + 1}: soma das dimensões excede o limite.`);
  }
  return issues;
}