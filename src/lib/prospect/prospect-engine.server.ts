/**
 * Prospect Engine — server-only helpers para busca e enriquecimento.
 * Usa Firecrawl (search + scrape) + OpenRouter (via OPENROUTER_API_KEY) para extração.
 * NUNCA importe este arquivo do cliente.
 */
import { normalizeEmail, normalizeInstagramHandle, normalizePhone, normalizeName, computeLeadScore, DEFAULT_SCORE_WEIGHTS } from "@/features/prospect/utils";
import type { ContactChannel } from "@/features/prospect/types";
import { openrouterChat } from "@/lib/ai-gateway.server";

const FIRECRAWL = "https://api.firecrawl.dev/v2";

// ============= Firecrawl helpers =============

interface FcSearchResult { url: string; title?: string; description?: string; markdown?: string }

export async function firecrawlSearch(query: string, limit = 10): Promise<FcSearchResult[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY não configurado");
  const res = await fetch(`${FIRECRAWL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, limit, lang: "pt", country: "BR" }),
  });
  if (!res.ok) throw new Error(`Firecrawl search ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: { web?: FcSearchResult[] } | FcSearchResult[] };
  const raw = Array.isArray(json.data) ? json.data : (json.data?.web ?? []);
  return raw;
}

export async function firecrawlScrape(url: string): Promise<{ markdown: string; html: string; links: string[] } | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY não configurado");
  try {
    const res = await fetch(`${FIRECRAWL}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url, formats: ["markdown", "html", "links"], onlyMainContent: false }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { markdown?: string; html?: string; links?: string[] } };
    return {
      markdown: json.data?.markdown ?? "",
      html: json.data?.html ?? "",
      links: json.data?.links ?? [],
    };
  } catch {
    return null;
  }
}

// ============= AI helpers =============

export async function aiExtract<T = unknown>(prompt: string, system?: string): Promise<T | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  try {
    const content = await openrouterChat({ messages, json: true });
    if (!content) return null;
    try { return JSON.parse(content) as T; } catch { return null; }
  } catch {
    return null;
  }
}


// ============= Contato extraction (regex-first, IA como fallback) =============

const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const PHONE_RE = /(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-.\s]?\d{4}/g;
const IG_RE = /instagram\.com\/([a-zA-Z0-9_.]{2,30})/gi;
const WHATSAPP_RE = /wa\.me\/(\+?\d{10,15})|api\.whatsapp\.com\/send\?phone=(\+?\d{10,15})/gi;

export interface ExtractedContacts {
  emails: string[];
  phones: string[];
  whatsapps: string[];
  instagrams: string[];
}

export function extractContactsFromText(text: string): ExtractedContacts {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const whatsapps = new Set<string>();
  const instagrams = new Set<string>();

  const cleaned = text.replace(/\s+/g, " ");
  for (const m of cleaned.matchAll(EMAIL_RE)) {
    const e = normalizeEmail(m[0]);
    if (e && !e.includes("example.") && !e.includes("sentry")) emails.add(e);
  }
  for (const m of cleaned.matchAll(PHONE_RE)) {
    const p = normalizePhone(m[0]);
    if (p) phones.add(p);
  }
  for (const m of cleaned.matchAll(WHATSAPP_RE)) {
    const p = normalizePhone(m[1] ?? m[2] ?? "");
    if (p) whatsapps.add(p);
  }
  for (const m of cleaned.matchAll(IG_RE)) {
    const h = normalizeInstagramHandle(m[1]);
    if (h && !["explore","reel","p","tv","stories","accounts","directory"].includes(h)) {
      instagrams.add(h);
    }
  }
  return {
    emails: [...emails].slice(0, 5),
    phones: [...phones].slice(0, 5),
    whatsapps: [...whatsapps].slice(0, 5),
    instagrams: [...instagrams].slice(0, 5),
  };
}

// ============= Motor de busca de empresas =============

export interface DiscoveredCompany {
  name: string;
  normalized_name: string;
  website: string | null;
  source_url: string;
  description: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
}

export async function discoverCompanies(input: {
  segment: string;
  city?: string | null;
  state?: string | null;
  keywords?: string | null;
  limit: number;
  /** Se fornecido, ignora `segment`+`keywords` e roda cada query da lista. */
  queries?: string[];
  /** Permite resultados do Instagram (útil para professores / projetos sociais). */
  allowInstagram?: boolean;
}): Promise<DiscoveredCompany[]> {
  const buildDefault = () => {
    const parts = [
      input.segment,
      input.city ? `em ${input.city}` : null,
      input.state ? input.state : null,
      input.keywords ?? null,
      "contato",
    ].filter(Boolean).join(" ");
    const base = input.allowInstagram
      ? parts
      : `${parts} -site:instagram.com -site:facebook.com -site:linkedin.com`;
    return [base];
  };

  const queries = (input.queries && input.queries.length ? input.queries : buildDefault())
    .slice(0, 12);

  const perQuery = Math.max(3, Math.ceil((input.limit * 2) / queries.length));
  const seen = new Set<string>();
  const companies: DiscoveredCompany[] = [];

  for (const q of queries) {
    if (companies.length >= input.limit) break;
    let results: FcSearchResult[] = [];
    try {
      results = await firecrawlSearch(q, Math.min(perQuery, 20));
    } catch { continue; }

    for (const r of results) {
      if (!r.url || !r.title) continue;
      const domain = safeDomain(r.url);
      if (!domain) continue;
      if (isNoiseDomain(domain, { allowInstagram: input.allowInstagram })) continue;

      const isIg = /instagram\.com$/i.test(domain);
      // Instagram: aceitar SOMENTE perfis (/{handle}), rejeitar posts/reels/stories/etc.
      if (isIg) {
        const handle = extractInstagramProfile(r.url);
        if (!handle) continue;
        const dedupeKey = `instagram:${handle}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const displayName = cleanCompanyName(r.title) || `@${handle}`;
        companies.push({
          name: displayName,
          normalized_name: normalizeName(displayName),
          website: null,
          source_url: `https://instagram.com/${handle}`,
          description: r.description ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          category: input.segment,
        });
        if (companies.length >= input.limit) break;
        continue;
      }

      const dedupeKey = domain;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const name = cleanCompanyName(r.title);
      if (!name) continue;

      companies.push({
        name,
        normalized_name: normalizeName(name),
        website: `https://${domain}`,
        source_url: r.url,
        description: r.description ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        category: input.segment,
      });

      if (companies.length >= input.limit) break;
    }
  }
  return companies;
}

/** Retorna o handle do perfil quando a URL é `instagram.com/{handle}` (não post, reel, story, etc). */
function extractInstagramProfile(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/instagram\.com$/i.test(u.hostname.replace(/^www\./, ""))) return null;
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return null;
    const first = segs[0].toLowerCase();
    // Rotas não-perfil do Instagram
    const banned = new Set([
      "p", "reel", "reels", "tv", "stories", "story", "explore", "accounts",
      "directory", "about", "developer", "legal", "web", "session", "graphql",
      "challenge", "invites", "direct", "hashtag", "locations", "emails",
    ]);
    if (banned.has(first)) return null;
    // Se há mais de 1 segmento, geralmente é conteúdo (ex.: /user/reel/xyz)
    if (segs.length > 1) {
      const second = segs[1].toLowerCase();
      if (banned.has(second)) return null;
    }
    // Handles válidos: letras, números, ponto, sublinhado, 2-30 chars
    if (!/^[a-z0-9._]{2,30}$/i.test(first)) return null;
    return first;
  } catch { return null; }
}

/** Scrape do perfil do Instagram e extração do nome de exibição a partir do <title>/og:title. */
export async function fetchInstagramProfileName(handle: string): Promise<string | null> {
  try {
    const clean = handle.trim().replace(/^@/, "").split(/[/?#]/)[0];
    if (!/^[a-z0-9._]{2,30}$/i.test(clean)) return null;
    const scraped = await firecrawlScrape(`https://www.instagram.com/${clean}/`);
    if (!scraped) return null;
    const html = scraped.html || "";
    const md = scraped.markdown || "";
    // Padrões comuns: "Full Name (@handle) • Instagram photos and videos"
    const patterns = [
      /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
    ];
    let raw: string | null = null;
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) { raw = m[1]; break; }
    }
    if (!raw) {
      const m = md.match(/^#\s*(.+)$/m);
      if (m?.[1]) raw = m[1];
    }
    if (!raw) return null;
    // Remove "(@handle)" e sufixos padrão do Instagram
    let name = raw
      .replace(/\s*\(@[^)]+\)\s*/g, " ")
      .replace(/\s*[•·|]\s*Instagram.*$/i, "")
      .replace(/\s*on Instagram.*$/i, "")
      .replace(/\s*photos and videos.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!name) return null;
    // Descarta se retornou só o handle
    if (name.toLowerCase() === clean.toLowerCase()) return null;
    if (name.length < 2 || name.length > 120) return null;
    return name;
  } catch {
    return null;
  }
}

function safeDomain(u: string): string | null {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; }
}
function isNoiseDomain(d: string, opts?: { allowInstagram?: boolean }): boolean {
  if (opts?.allowInstagram && /^instagram\.com$/i.test(d)) return false;
  return /(google|bing|yahoo|wikipedia|youtube|facebook|instagram|linkedin|twitter|tiktok|glassdoor|reclameaqui|jusbrasil|yelp|tripadvisor|guiamais|apontador|solucoesindustriais|econodata|econofinder)\./i.test(d);
}
function cleanCompanyName(title: string): string {
  return title
    .split(/[\|\-–—•·:]/)[0]
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}


// ============= Queries especializadas para Judô / Jiu-Jitsu =============

/**
 * Gera queries multi-ângulo para localizar prospects do universo BJJ / Judô.
 * Cada preset produz variações (Google dorks) para maximizar cobertura.
 */
export function buildMartialArtsQueries(
  preset: string,
  opts: { city?: string | null; state?: string | null } = {},
): { queries: string[]; allowInstagram: boolean; category: string } {
  const loc = [opts.city, opts.state].filter(Boolean).join(" ");
  const locSuffix = loc ? ` "${loc}"` : "";
  const igLoc = loc ? ` ${loc}` : "";

  const map: Record<string, { q: string[]; ig: boolean; cat: string }> = {
    academias_bjj: {
      cat: "Academia de Jiu-Jitsu",
      ig: true,
      q: [
        `"academia de jiu-jitsu"${locSuffix} contato`,
        `"academia" "jiu-jitsu" BJJ${locSuffix} whatsapp email`,
        `"gracie" OR "alliance" OR "checkmat" OR "atos"${locSuffix} academia`,
        `site:instagram.com "jiu jitsu" "academia"${igLoc}`,
      ],
    },
    academias_judo: {
      cat: "Academia de Judô",
      ig: true,
      q: [
        `"academia de judô" OR "academia de judo"${locSuffix} contato`,
        `"judô" "dojô" OR "dojo"${locSuffix} matrículas`,
        `"clube de judô"${locSuffix}`,
        `site:instagram.com "judô" "academia"${igLoc}`,
      ],
    },
    escolas_bjj: {
      cat: "Escola de Jiu-Jitsu",
      ig: true,
      q: [
        `"escola de jiu-jitsu"${locSuffix}`,
        `"jiu-jitsu infantil" OR "kids jiu-jitsu"${locSuffix} matrícula`,
        `site:instagram.com "escola de jiu-jitsu"${igLoc}`,
      ],
    },
    escolas_judo: {
      cat: "Escola de Judô",
      ig: true,
      q: [
        `"escola de judô" OR "escola de judo"${locSuffix}`,
        `"judô infantil" OR "judô kids"${locSuffix} matrícula`,
        `site:instagram.com "escola de judô"${igLoc}`,
      ],
    },
    professores_bjj: {
      cat: "Professor de Jiu-Jitsu",
      ig: true,
      q: [
        `"professor de jiu-jitsu" OR "faixa preta" BJJ${locSuffix}`,
        `"mestre" "jiu-jitsu"${locSuffix} instrutor`,
        `site:instagram.com "faixa preta" "jiu jitsu"${igLoc}`,
        `site:instagram.com "professor" "bjj"${igLoc}`,
      ],
    },
    professores_judo: {
      cat: "Professor de Judô",
      ig: true,
      q: [
        `"sensei" "judô"${locSuffix}`,
        `"professor de judô" OR "professor de judo"${locSuffix} faixa preta`,
        `site:instagram.com "sensei" "judô"${igLoc}`,
      ],
    },
    projetos_sociais: {
      cat: "Projeto Social de Artes Marciais",
      ig: true,
      q: [
        `"projeto social" "jiu-jitsu"${locSuffix}`,
        `"projeto social" "judô" OR "judo"${locSuffix}`,
        `"ONG" "jiu-jitsu" OR "judô"${locSuffix}`,
        `"instituto" "jiu-jitsu" OR "judô"${locSuffix}`,
        `site:org.br "jiu-jitsu" OR "judô"${locSuffix}`,
        `site:instagram.com "projeto social" "jiu jitsu"${igLoc}`,
      ],
    },
    federacoes: {
      cat: "Federação de Artes Marciais",
      ig: false,
      q: [
        `"federação" "jiu-jitsu"${locSuffix}`,
        `"federação" "judô" OR "judo"${locSuffix}`,
        `"confederação brasileira" "jiu-jitsu" OR "judô"`,
        `site:org.br "federação" "jiu-jitsu" OR "judô"`,
      ],
    },
  };

  const entry = map[preset];
  if (!entry) {
    return { queries: [`"${preset}"${locSuffix} contato`], allowInstagram: false, category: preset };
  }
  return { queries: entry.q, allowInstagram: entry.ig, category: entry.cat };
}


// ============= Enriquecimento (prioridade email → whatsapp → instagram) =============

export interface EnrichmentResult {
  contacts: Array<{ channel: ContactChannel; value: string; source: string }>;
  address: string | null;
  phone: string | null;
  business_hours: string | null;
  responsible_name: string | null;
  ai_summary: string | null;
}

export async function enrichFromWebsite(website: string, companyName: string): Promise<EnrichmentResult> {
  const empty: EnrichmentResult = {
    contacts: [], address: null, phone: null, business_hours: null, responsible_name: null, ai_summary: null,
  };
  const home = await firecrawlScrape(website);
  if (!home) return empty;

  // Também tenta /contato
  let contactPage: Awaited<ReturnType<typeof firecrawlScrape>> = null;
  const contactUrl = (home.links ?? []).find((l) => /contato|contact|fale-conosco/i.test(l));
  if (contactUrl) contactPage = await firecrawlScrape(contactUrl);

  const fullText = `${home.markdown}\n${home.html}\n${contactPage?.markdown ?? ""}\n${contactPage?.html ?? ""}`;
  const extracted = extractContactsFromText(fullText);

  const contacts: EnrichmentResult["contacts"] = [];
  for (const e of extracted.emails) contacts.push({ channel: "email", value: e, source: "website" });
  for (const w of extracted.whatsapps) contacts.push({ channel: "whatsapp", value: w, source: "website" });
  for (const p of extracted.phones) {
    if (!extracted.whatsapps.includes(p)) contacts.push({ channel: "phone", value: p, source: "website" });
  }
  for (const i of extracted.instagrams) contacts.push({ channel: "instagram", value: i, source: "website" });
  contacts.push({ channel: "website", value: website, source: "user" });

  // IA para dados estruturados (endereço, horário, resumo)
  const ai = await aiExtract<{
    address?: string; phone?: string; business_hours?: string; responsible_name?: string; summary?: string;
  }>(
    `Extraia do conteúdo abaixo, sobre a empresa "${companyName}", os dados: endereço completo, telefone principal, horário de funcionamento, nome do responsável (se citado) e um resumo comercial curto (máx 240 caracteres). Responda em JSON: {address, phone, business_hours, responsible_name, summary}. Se algum campo não estiver no texto, use null.\n\nCONTEÚDO:\n${fullText.slice(0, 8000)}`,
    "Você é um extrator de dados corporativos objetivo. Só use informações presentes no texto.",
  );

  return {
    contacts,
    address: ai?.address ?? null,
    phone: ai?.phone ? normalizePhone(ai.phone) : (extracted.phones[0] ?? null),
    business_hours: ai?.business_hours ?? null,
    responsible_name: ai?.responsible_name ?? null,
    ai_summary: ai?.summary ?? null,
  };
}

/** Fallback: busca no Google por email/whatsapp/instagram quando o site não os expõe. */
export async function fallbackContactSearch(companyName: string, city?: string | null): Promise<Array<{ channel: ContactChannel; value: string; source: string }>> {
  const contacts: Array<{ channel: ContactChannel; value: string; source: string }> = [];
  const q = `"${companyName}"${city ? ` ${city}` : ""}`;

  try {
    const emailRes = await firecrawlSearch(`${q} email contato`, 3);
    const emailText = emailRes.map((r) => `${r.title ?? ""} ${r.description ?? ""}`).join(" ");
    for (const e of extractContactsFromText(emailText).emails) {
      contacts.push({ channel: "email", value: e, source: "google" });
    }
  } catch { /* ignore */ }

  try {
    const igRes = await firecrawlSearch(`site:instagram.com "${companyName}"`, 3);
    for (const r of igRes) {
      const handle = r.url.match(IG_RE)?.[0]?.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i)?.[1];
      const h = handle ? normalizeInstagramHandle(handle) : null;
      if (h && !["explore","reel","p"].includes(h)) {
        contacts.push({ channel: "instagram", value: h, source: "google" });
        break;
      }
    }
  } catch { /* ignore */ }

  return contacts;
}

// ============= Enriquecimento reutilizável (helper compartilhado) =============

// (computeLeadScore/DEFAULT_SCORE_WEIGHTS já importados no topo)

/**
 * Motor de enriquecimento reutilizável. Usa o cliente Supabase fornecido
 * (autenticado do usuário OU admin) + owner_id. Retorna resumo do resultado.
 */
export async function enrichCompanyCore(
  supa: { from: (t: string) => any },
  ownerId: string,
  companyId: string,
): Promise<{ ok: boolean; score: number; contactsFound: number; foundRequired: boolean }> {
  const { data: c, error } = await supa.from("prospect_companies").select("*").eq("id", companyId).single();
  if (error || !c) throw new Error("Lead não encontrado");
  const company = c as {
    id: string; name: string; website: string | null; city: string | null;
    phone: string | null; address: string | null; category: string | null; state: string | null;
    pipeline_stage: string | null;
  };

  let result: EnrichmentResult = {
    contacts: [], address: null, phone: null, business_hours: null, responsible_name: null, ai_summary: null,
  };
  if (company.website) {
    try { result = await enrichFromWebsite(company.website, company.name); } catch { /* keep empty */ }
  }
  const has = (ch: string) => result.contacts.some((x) => x.channel === ch);
  if (!has("email") || !has("instagram")) {
    try {
      const extras = await fallbackContactSearch(company.name, company.city);
      for (const ex of extras) {
        if (!result.contacts.some((c2) => c2.channel === ex.channel && c2.value === ex.value)) {
          result.contacts.push(ex);
        }
      }
    } catch { /* ignore */ }
  }

  for (const ct of result.contacts) {
    try {
      await supa.from("prospect_contacts").upsert({
        owner_id: ownerId, company_id: company.id,
        channel: ct.channel, value: ct.value, source: ct.source,
        is_primary: ct.channel === "email" || ct.channel === "whatsapp",
      }, { onConflict: "company_id,channel,value" });
    } catch { /* dup */ }
  }

  const patch: Record<string, unknown> = {
    enriched_at: new Date().toISOString(),
  };
  // Todos os leads captados/enriquecidos permanecem como "novo" no pipeline
  // até que o usuário mova manualmente. Não sobrescreve estágios avançados.
  const current = company.pipeline_stage ?? "novo";
  if (["novo", "captado", "enriquecido"].includes(current)) {
    patch.pipeline_stage = "novo";
  }
  if (result.address && !company.address) patch.address = result.address;
  if (result.phone && !company.phone) patch.phone = result.phone;
  if (result.business_hours) patch.business_hours = result.business_hours;
  if (result.responsible_name) patch.responsible_name = result.responsible_name;
  if (result.ai_summary) patch.ai_summary = result.ai_summary;

  // Ajusta o nome do lead com base no perfil do Instagram (quando disponível)
  const igContact = result.contacts.find((x) => x.channel === "instagram");
  if (igContact) {
    try {
      const profileName = await fetchInstagramProfileName(igContact.value);
      if (profileName && profileName.toLowerCase() !== (company.name ?? "").toLowerCase()) {
        patch.name = profileName;
        patch.normalized_name = profileName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
    } catch { /* ignora falha de scraping do IG */ }
  }

  const channels = result.contacts.map((c2) => ({ channel: c2.channel as "email" | "whatsapp" | "instagram" | "phone" | "website" }));
  const score = computeLeadScore({
    website: company.website, phone: result.phone ?? company.phone, address: result.address ?? company.address,
    category: company.category, city: company.city, state: company.state,
  }, channels, DEFAULT_SCORE_WEIGHTS);
  patch.score = score;

  if (has("email")) patch.best_channel = "email";
  else if (has("whatsapp")) patch.best_channel = "whatsapp";
  else if (has("instagram")) patch.best_channel = "instagram";

  const foundRequired = has("email") || has("whatsapp") || has("instagram");
  patch.status = foundRequired ? "qualificado" : "ativo";

  await supa.from("prospect_companies").update(patch).eq("id", company.id);

  await supa.from("prospect_enrichment_jobs")
    .update({ status: foundRequired ? "success" : "not_found", finished_at: new Date().toISOString(), fields_found: patch })
    .eq("company_id", company.id).eq("status", "pending");

  await supa.from("prospect_timeline").insert({
    owner_id: ownerId, company_id: company.id,
    event_type: "enriched",
    title: foundRequired ? "Lead enriquecido com sucesso" : "Enriquecimento parcial (canais obrigatórios não encontrados)",
    payload: { channels_found: result.contacts.map((c2) => c2.channel), score },
  });

  return { ok: true, score, contactsFound: result.contacts.length, foundRequired };
}
