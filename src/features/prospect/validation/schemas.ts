import { z } from "zod";

export const searchInputSchema = z.object({
  name: z.string().min(2).max(120),
  segment: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  country: z.string().max(2).default("BR"),
  keywords: z.string().max(300).optional().nullable(),
  category: z.string().max(120).optional().nullable(),
  target_count: z.number().int().min(1).max(200).default(20),
});
export type SearchInput = z.infer<typeof searchInputSchema>;

export const companyPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "ativo","qualificado","desqualificado","em_contato","convertido","arquivado",
  ]).optional(),
  pipeline_stage: z.enum([
    "novo","captado","enriquecido","contato_iniciado","resposta_recebida",
    "reuniao","proposta","negociacao","cliente","perdido",
  ]).optional(),
  notes: z.string().max(4000).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});
export type CompanyPatch = z.infer<typeof companyPatchSchema>;

export const contactActionSchema = z.object({
  companyId: z.string().uuid(),
  channel: z.enum(["email","whatsapp","instagram","phone","website"]),
  message: z.string().max(2000).optional(),
});
export type ContactAction = z.infer<typeof contactActionSchema>;
