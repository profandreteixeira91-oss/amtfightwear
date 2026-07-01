import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type LeadDraft = {
  name: string;
  responsible?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  modality?: string | null;
  lead_type?: string | null;
  source?: string | null;
  notes?: string | null;
  instagram?: string | null;
  website?: string | null;
};

async function firecrawlSearch(query: string, limit = 10) {
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!fcKey) throw new Error("Conecte o Firecrawl em Connections para habilitar a busca automática.");

  const res = await fetch(`https://api.firecrawl.dev/v2/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${fcKey}`,
    },
    body: JSON.stringify({
      query,
      limit,
      lang: "pt",
      country: "br",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${(await res.text()).slice(0, 240)}`);
  const json = (await res.json()) as {
    data?: { web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }> };
    web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }>;
  };
  return json.data?.web ?? json.web ?? [];
}

async function aiExtractLeads(rawText: string, defaults: { modality: string; source: string }): Promise<LeadDraft[]> {
  const lovableKey = process.env.LOVABLE_API_KEY!;
  const prompt = `Extraia contatos B2B (academias, professores, projetos sociais de Jiu-Jitsu/Judô) do texto abaixo. Retorne JSON com array "leads" onde cada item tem: name, responsible, phone, email, city, instagram, website, notes (curta, com pistas úteis: nº alunos, endereço, contato). Ignore duplicatas. Se algum campo faltar, use null. Modalidade padrão: ${defaults.modality}.\n\nTexto:\n${rawText.slice(0, 18000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Você extrai contatos comerciais estruturados. Responda apenas JSON válido." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`IA ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = j.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { leads?: LeadDraft[] };
  return (parsed.leads ?? []).map((l) => ({
    ...l,
    modality: l.modality ?? defaults.modality,
    source: defaults.source,
    lead_type: l.lead_type ?? "Academia",
  }));
}

const ScrapeInput = z.object({
  source: z.enum(["google", "instagram"]),
  query: z.string().min(3).max(200),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(4).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  modality: z.string().max(40).default("BJJ"),
  limit: z.number().int().min(3).max(15).default(8),
});

export const scrapeLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScrapeInput.parse(i))
  .handler(async ({ data, context }) => {
    const location = data.city && data.state ? `${data.city} ${data.state}` : (data.city ?? "");
    const term = location ? `${data.query} ${location}` : data.query;
    const q =
      data.source === "google"
        ? `academia OR professor "jiu-jitsu" OR "judô" ${term} contato email whatsapp`
        : `site:instagram.com ${term} jiu-jitsu OR judô academia contato`;

    const web = await firecrawlSearch(q, data.limit);
    if (!web.length) return { inserted: 0, leads: [] as LeadDraft[], skipped: 0, message: "Nenhum resultado" };

    const bundle = web
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title ?? ""}\nURL: ${r.url ?? ""}\n${r.description ?? ""}\n${(r.markdown ?? "").slice(0, 2500)}`,
      )
      .join("\n\n---\n\n");

    const drafts = await aiExtractLeads(bundle, {
      modality: data.modality,
      source: data.source === "google" ? "Google" : "Instagram",
    });

    // Dedupe against existing leads (by email or name+city)
    const { data: existing } = await context.supabase.from("leads").select("name, email, notes, city");
    const seen = new Set(
      (existing ?? []).map((r) =>
        `${(r.email ?? "").toLowerCase()}|${(r.name ?? "").toLowerCase()}|${(r.city ?? "").toLowerCase()}`.trim(),
      ),
    );

    let skipped = 0;
    const toInsert = drafts.filter((d) => {
      const key = `${(d.email ?? "").toLowerCase()}|${(d.name ?? "").toLowerCase()}|${(d.city ?? data.city ?? "").toLowerCase()}`;
      if (!d.name || seen.has(key)) {
        skipped++;
        return false;
      }
      seen.add(key);
      return true;
    });

    if (!toInsert.length) return { inserted: 0, leads: [], skipped };

    const rows = toInsert.map((d) => ({
      name: d.name,
      responsible: d.responsible ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      city: d.city ?? data.city ?? null,
      state: data.state ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      modality: d.modality ?? data.modality,
      lead_type: d.lead_type ?? "Academia",
      source: d.source ?? "Scraper",
      status: "Novo",
      notes: [d.notes, d.instagram ? `IG: ${d.instagram}` : null, d.website ? `Site: ${d.website}` : null]
        .filter(Boolean)
        .join(" · "),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await context.supabase.from("leads").insert(rows as any).select();
    if (error) throw new Error(error.message);
    return { inserted: inserted?.length ?? 0, leads: inserted ?? [], skipped };
  });

const OutreachInput = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["email", "whatsapp", "direct"]),
  angle: z.string().max(200).optional(),
});

export const generateOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OutreachInput.parse(i))
  .handler(async ({ data, context }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY ausente");

    const { data: lead, error } = await context.supabase.from("leads").select("*").eq("id", data.leadId).single();
    if (error || !lead) throw new Error("Lead não encontrado");

    const { data: products } = await context.supabase
      .from("products")
      .select("name, category, price")
      .in("category", ["Kimono", "Faixa BJJ", "Faixa Judô", "Patch"])
      .limit(12);

    const catalog = (products ?? [])
      .map((p) => `- ${p.name} (${p.category}) R$${Number(p.price ?? 0).toFixed(2)}`)
      .join("\n");

    const channelBrief =
      data.channel === "email"
        ? `Formato: JSON { "subject": string curto (<=60c), "body": texto em HTML simples com <p> e <ul>, 120-180 palavras, com PS e call-to-action para amostra/atacado }`
        : data.channel === "whatsapp"
          ? `Formato: JSON { "body": string com no máximo 500 caracteres, tom próximo, com 1-2 emojis do universo de artes marciais 🥋, CTA para tabela de atacado. Sem markdown }`
          : `Formato: JSON { "body": string para Direct do Instagram, no máximo 400 caracteres, tom camarada, elogio real ao perfil, 1 emoji, CTA para conversar sobre linha B2B }`;

    const prompt = `Você é copywriter B2B da AMT Fight Wear (kimonos trançados, faixas premium, patches). Escreva uma abordagem para o lead abaixo focada em ${
      lead.lead_type ?? "academia"
    } de ${lead.modality ?? "Jiu-Jitsu"}. Ângulo: ${data.angle ?? "primeira abordagem B2B com convite para tabela atacado"}.
Lead:
Nome: ${lead.name}
Responsável: ${lead.responsible ?? "(desconhecido)"}
Cidade: ${lead.city ?? ""}
Notas: ${lead.notes ?? ""}

Catálogo de referência:
${catalog}

${channelBrief}. Responda apenas com o JSON.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Copywriter B2B AMT Fight Wear. Retorne apenas JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`IA ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as { subject?: string; body?: string };
    return { subject: parsed.subject ?? "", body: parsed.body ?? "", lead };
  });
