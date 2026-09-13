// Contrato de dados dos orçamentos (admin/orcamentos) expostos ao aplicativo desktop.
// Espelha exatamente as colunas existentes da tabela public.store_quotes.
import { z } from "zod";
import { QUOTE_STATUSES } from "@/lib/store/quote-status";

/** Colunas retornadas pela API (fonte oficial: public.store_quotes). */
export const QUOTE_COLUMNS = [
  "id",
  "owner_id",
  "quote_number",
  "status",
  "customer_name",
  "customer_company",
  "customer_document",
  "customer_email",
  "customer_phone",
  "customer_address",
  "items",
  "discount",
  "shipping_cost",
  "subtotal",
  "total",
  "valid_until",
  "payment_terms",
  "delivery_terms",
  "notes",
  "signer_name",
  "signer_role",
  "signature_image",
  "created_at",
  "updated_at",
] as const;

export const QUOTE_SELECT = QUOTE_COLUMNS.join(", ");

/** Lista sem o payload pesado da assinatura em base64. */
export const QUOTE_LIST_SELECT = QUOTE_COLUMNS.filter((c) => c !== "signature_image").join(", ");

export const quoteItemSchema = z.object({
  product_id: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  image_url: z.string().trim().max(2000).nullable().optional(),
  quantity: z.number().min(0.01).max(1000000),
  unit_price: z.number().min(0).max(10000000),
});

export const quoteAddressSchema = z.object({
  zip: z.string().trim().max(20).optional().default(""),
  street: z.string().trim().max(200).optional().default(""),
  number: z.string().trim().max(30).optional().default(""),
  complement: z.string().trim().max(120).optional().default(""),
  neighborhood: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(40).optional().default(""),
});

const writableShape = {
  quote_number: z.string().trim().max(40).optional(),
  status: z.enum(QUOTE_STATUSES).optional(),
  customer_name: z.string().trim().min(1).max(160),
  customer_company: z.string().trim().max(160).nullable().optional(),
  customer_document: z.string().trim().max(40).nullable().optional(),
  customer_email: z.string().trim().max(200).nullable().optional(),
  customer_phone: z.string().trim().max(40).nullable().optional(),
  customer_address: quoteAddressSchema.optional(),
  items: z.array(quoteItemSchema).max(200).optional(),
  discount: z.number().min(0).max(10000000).optional(),
  shipping_cost: z.number().min(0).max(10000000).optional(),
  valid_until: z.string().trim().max(20).nullable().optional(),
  payment_terms: z.string().trim().max(600).nullable().optional(),
  delivery_terms: z.string().trim().max(600).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  signer_name: z.string().trim().max(160).nullable().optional(),
  signer_role: z.string().trim().max(160).nullable().optional(),
  signature_image: z.string().trim().max(600000).nullable().optional(),
};

/** POST — customer_name obrigatório; totais calculados no servidor. */
export const createQuoteSchema = z.object(writableShape).strict();

/** PATCH — atualização parcial, pelo menos um campo. */
export const updateQuoteSchema = z
  .object(writableShape)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Nenhum campo para atualizar." });

export const quoteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().max(200).optional(),
  status: z.enum(QUOTE_STATUSES).optional(),
});

export type QuoteItem = z.infer<typeof quoteItemSchema>;

/** Regra oficial: subtotal = soma dos itens; total = subtotal - desconto + frete. */
export function computeQuoteTotals(
  items: QuoteItem[],
  discount: number,
  shippingCost: number,
): { subtotal: number; total: number } {
  const subtotal = items.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
  const total = Math.max(0, subtotal - (discount || 0) + (shippingCost || 0));
  return { subtotal, total };
}
