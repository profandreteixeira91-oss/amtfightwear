/**
 * Prospect Engine — Tipos & Enums
 * Nunca importe de tabelas antigas. Este é o contrato tipado do módulo.
 */

export type PipelineStage =
  | "novo"
  | "captado"
  | "enriquecido"
  | "contato_iniciado"
  | "resposta_recebida"
  | "reuniao"
  | "proposta"
  | "negociacao"
  | "cliente"
  | "perdido";

export type LeadStatus =
  | "ativo"
  | "qualificado"
  | "desqualificado"
  | "em_contato"
  | "convertido"
  | "arquivado";

export type ContactChannel = "email" | "whatsapp" | "instagram" | "phone" | "website";
export type JobStatus = "pending" | "running" | "success" | "failed" | "not_found";

export const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: "novo", label: "Novo", color: "bg-slate-500" },
  { id: "captado", label: "Captado", color: "bg-sky-500" },
  { id: "enriquecido", label: "Enriquecido", color: "bg-indigo-500" },
  { id: "contato_iniciado", label: "Contato iniciado", color: "bg-blue-500" },
  { id: "resposta_recebida", label: "Resposta recebida", color: "bg-teal-500" },
  { id: "reuniao", label: "Reunião", color: "bg-amber-500" },
  { id: "proposta", label: "Proposta", color: "bg-orange-500" },
  { id: "negociacao", label: "Negociação", color: "bg-fuchsia-500" },
  { id: "cliente", label: "Cliente", color: "bg-emerald-500" },
  { id: "perdido", label: "Perdido", color: "bg-rose-500" },
];

export interface ProspectContact {
  id: string;
  channel: ContactChannel;
  value: string;
  label: string | null;
  is_primary: boolean;
  verified: boolean;
  source: string | null;
}

export interface ProspectCompany {
  id: string;
  name: string;
  category: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  phone: string | null;
  business_hours: string | null;
  responsible_name: string | null;
  logo_url: string | null;
  origin: string | null;
  source_url: string | null;
  description: string | null;
  ai_summary: string | null;
  ai_pitch: string | null;
  best_channel: ContactChannel | null;
  score: number;
  status: LeadStatus;
  pipeline_stage: PipelineStage;
  tags: string[];
  notes: string | null;
  last_contacted_at: string | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
  contacts?: ProspectContact[];
}

export interface TimelineEvent {
  id: string;
  company_id: string;
  event_type: string;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export const SEGMENT_PRESETS = [
  "Restaurantes", "Hotéis", "Academias", "Clínicas", "Farmácias",
  "Escritórios", "Advogados", "Contabilidades", "Lojas", "Supermercados",
  "Indústrias", "Prestadores de Serviço", "Dojôs / Artes marciais",
  "Salões de beleza", "Autoescolas", "Escolas", "Igrejas", "Petshops",
] as const;

export const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
