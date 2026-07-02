/**
 * Prospect Engine — utilitários puros (score, formatação, normalização)
 */
import type { ProspectCompany, ContactChannel } from "../types";

/** Normaliza nome de empresa para dedupe. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(ltda|me|eireli|s\.?a\.?|cia|comercial|comercio)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/** Normaliza telefone/whatsapp em E.164 quando possível (BR). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  if (digits.length === 13 && digits.startsWith("55")) return digits;
  if (digits.length === 12 && digits.startsWith("55")) return digits;
  return digits.length >= 10 ? digits : null;
}

/** Extrai handle do Instagram a partir de URL ou string. */
export function normalizeInstagramHandle(raw: string): string | null {
  const cleaned = raw.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  const handle = cleaned.split(/[/?#]/)[0];
  if (!handle) return null;
  return handle.toLowerCase();
}

/** Valida e normaliza e-mail. */
export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/** Pesos padrão para o Lead Score. */
export const DEFAULT_SCORE_WEIGHTS = {
  email: 25, whatsapp: 25, instagram: 20, website: 10,
  phone: 8, address: 4, category: 3, city: 3, state: 2,
} as const;

/** Calcula Lead Score 0-100. */
export function computeLeadScore(
  company: Pick<ProspectCompany, "website" | "phone" | "address" | "category" | "city" | "state">,
  contacts: Array<{ channel: ContactChannel }>,
  weights: Record<string, number> = DEFAULT_SCORE_WEIGHTS,
): number {
  let s = 0;
  const channels = new Set(contacts.map((c) => c.channel));
  if (channels.has("email")) s += weights.email ?? 0;
  if (channels.has("whatsapp")) s += weights.whatsapp ?? 0;
  if (channels.has("instagram")) s += weights.instagram ?? 0;
  if (company.website) s += weights.website ?? 0;
  if (company.phone) s += weights.phone ?? 0;
  if (company.address) s += weights.address ?? 0;
  if (company.category) s += weights.category ?? 0;
  if (company.city) s += weights.city ?? 0;
  if (company.state) s += weights.state ?? 0;
  return Math.min(100, Math.round(s));
}

/** Converte score 0-100 em estrelas (0-5). */
export function scoreToStars(score: number): number {
  return Math.max(0, Math.min(5, Math.round(score / 20)));
}

/** Constrói link wa.me com mensagem. */
export function whatsappLink(phone: string, message?: string): string {
  const digits = normalizePhone(phone) ?? phone.replace(/\D/g, "");
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${q}`;
}

/** Constrói link do perfil do Instagram. */
export function instagramLink(handle: string): string {
  const h = normalizeInstagramHandle(handle) ?? handle;
  return `https://instagram.com/${h}`;
}

/** Constrói link mailto. */
export function mailtoLink(email: string, subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const q = params.toString();
  return `mailto:${email}${q ? `?${q}` : ""}`;
}

/** Extrai canais únicos por tipo de uma lista de contatos. */
export function getFirstContact(contacts: Array<{ channel: ContactChannel; value: string }> | undefined, channel: ContactChannel): string | null {
  return contacts?.find((c) => c.channel === channel)?.value ?? null;
}

/** Data amigável em pt-BR. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
