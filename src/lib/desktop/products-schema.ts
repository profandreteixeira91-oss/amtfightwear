// Contrato de dados dos produtos expostos ao aplicativo desktop.
// Espelha exatamente colunas existentes da tabela public.products.
import { z } from "zod";

/** Colunas retornadas pela API (fonte oficial: public.products). */
export const PRODUCT_COLUMNS = [
  "id",
  "sku",
  "name",
  "slug",
  "category",
  "category_id",
  "price",
  "compare_at_price",
  "cost",
  "stock",
  "status",
  "featured",
  "image_url",
  "source_url",
  "description",
  "short_description",
  "description_html",
  "meta_title",
  "meta_description",
  "weight_grams",
  "length_cm",
  "width_cm",
  "height_cm",
  "wholesale_enabled",
  "wholesale_discount_percent",
  "ncm",
  "cest",
  "cfop",
  "cfop_internal",
  "cfop_interstate",
  "origem",
  "unidade",
  "unit_commercial",
  "unit_taxable",
  "gtin",
  "created_at",
  "updated_at",
] as const;

export const PRODUCT_SELECT = PRODUCT_COLUMNS.join(", ");

const nullableText = z.string().trim().max(20000).nullable().optional();
const nullableNumber = z.number().finite().nullable().optional();

const writableShape = {
  sku: nullableText,
  name: z.string().trim().min(1).max(500),
  slug: nullableText,
  category: nullableText,
  category_id: z.string().uuid().nullable().optional(),
  price: z.number().finite().min(0),
  compare_at_price: nullableNumber,
  cost: z.number().finite().min(0).optional(),
  stock: z.number().int().optional(),
  status: z.enum(["active", "inactive", "draft", "archived"]).optional(),
  featured: z.boolean().optional(),
  image_url: nullableText,
  source_url: nullableText,
  description: nullableText,
  short_description: nullableText,
  description_html: nullableText,
  meta_title: nullableText,
  meta_description: nullableText,
  weight_grams: z.number().int().nullable().optional(),
  length_cm: nullableNumber,
  width_cm: nullableNumber,
  height_cm: nullableNumber,
  wholesale_enabled: z.boolean().optional(),
  wholesale_discount_percent: nullableNumber,
  ncm: nullableText,
  cest: nullableText,
  cfop: nullableText,
  cfop_internal: nullableText,
  cfop_interstate: nullableText,
  origem: nullableText,
  unidade: nullableText,
  unit_commercial: nullableText,
  unit_taxable: nullableText,
  gtin: nullableText,
};

/** POST — name e price obrigatórios. */
export const createProductSchema = z.object(writableShape).strict();

/** PATCH — atualização parcial, pelo menos um campo. */
export const updateProductSchema = z
  .object(writableShape)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Nenhum campo para atualizar." });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["active", "inactive", "draft", "archived"]).optional(),
});
