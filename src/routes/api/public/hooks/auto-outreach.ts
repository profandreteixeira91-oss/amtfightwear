import { createFileRoute } from "@tanstack/react-router";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const SITE = "https://www.amtfightwear.com.br";

type SB = Awaited<ReturnType<typeof getAdmin>>;
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Settings = {
  enabled: boolean;
  daily_email_cap: number;
  daily_instagram_cap: number;
  weekly_cooldown_days: number;
  tone: string;
  site_url: string;
  from_email: string | null;
  from_name: string;
  priority_region: string | null;
};

type Lead = {
  id: string;
  name: string;
  responsible: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  modality: string | null;
  lead_type: string | null;
  notes: string | null;
};

const REGION_UFS: Record<string, string[]> = {
  nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  sudeste: ["ES", "MG", "RJ", "SP"],
  sul: ["PR", "RS", "SC"],
  norte: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"],
  "centro-oeste": ["DF", "GO", "MS", "MT"],
};

async function generateCopy(
  apiKey: string,
  lead: Lead,
  channel: "email" | "instagram",
  tone: string,
  site: string,
) {
  const brief =
    channel === "email"
      ? `Retorne JSON: {
  "subject": string curto (<=65c), objetivo e comercial, sem gírias, sem emoji, sem "oi" e sem "olá". Exemplos de estilo: "Proposta comercial B2B - AMT Fight Wear", "Kimonos e faixas premium para ${lead.lead_type ?? "sua academia"}".
  "body_html": HTML simples (<p>, <ul>, <li>) em português do Brasil, 140-200 palavras, registro FORMAL e PROFISSIONAL de fabricante para revendedor/academia. Regras: (1) Abrir com "Prezados," ou "Prezado(a) responsável,"; (2) Apresentar a AMT Fight Wear como fabricante brasileira de kimonos trançados, faixas premium e patches para ${lead.modality ?? "Jiu-Jitsu/Judô"}; (3) Apresentar objetivamente a linha B2B/atacado (kimonos, faixas, patches personalizados, uniformes para equipe), com bullets curtos; (4) Oferecer envio de catálogo, tabela de preços para revenda e amostra sob consulta; (5) Encerrar com CTA discreto ("Podemos enviar catálogo e condições comerciais?") e assinatura "Atenciosamente,<br/>Equipe Comercial – AMT Fight Wear<br/><a href='${site}'>${site}</a>". PROIBIDO: comentar sobre o perfil, dizer "vi seu instagram", elogios pessoais, tom íntimo, exclamações repetidas, emojis, promessas exageradas. Não mencionar cidade nem responsável pelo nome no corpo. Tratar sempre por "vocês"/"a academia"/"a equipe". SEMPRE incluir <a href='${site}'>${site}</a>.
}`
      : `Retorne JSON: {
  "body": string até 500 caracteres para Direct do Instagram, registro FORMAL, INSTITUCIONAL e CORDIAL (fabricante contatando estabelecimento comercial). Regras OBRIGATÓRIAS: (1) Abrir com "Prezados," — NUNCA usar "Fala", "E aí", "Opa", "Oi", nome próprio do responsável ou saudações informais; (2) Apresentar-se em uma frase: "Somos a AMT Fight Wear, fabricante brasileira de kimonos trançados, faixas premium e patches para artes marciais."; (3) Em uma frase objetiva, comunicar a proposta: apresentação da tabela de atacado e condições comerciais para revenda/fardamento de ${lead.lead_type ?? "academias"}; (4) Encerrar com CTA discreto ("Podemos encaminhar o catálogo e a tabela comercial para avaliação?") e o site ${site}. PROIBIDO EM QUALQUER HIPÓTESE: emojis, gírias, "parça", "camarada", "topa", "trocar uma ideia", "👊", comentários sobre postagens/perfil/atletas, elogios pessoais, referências ao trabalho específico do destinatário, tom íntimo, exclamações repetidas, uso do primeiro nome do responsável.
}`;


  const prompt = `Você é redator comercial B2B da AMT Fight Wear (fabricante brasileira). Escreva uma abordagem comercial inicial, com POSTURA e FORMALIDADE — nunca íntima, nunca "vi seu perfil", nunca elogios pessoais.
Lead: ${lead.name} (${lead.lead_type ?? "academia"} - ${lead.modality ?? "BJJ"}).
Notas internas (uso apenas para contextualizar a oferta, NÃO citar no texto): ${(lead.notes ?? "").slice(0, 400)}
Tom desejado: ${tone} — sempre respeitoso, profissional, direto e objetivo. Português do Brasil.
${brief}
Responda apenas o JSON, sem comentários.`;


  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Copywriter B2B. Retorne apenas JSON válido." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as {
    subject?: string;
    body_html?: string;
    body?: string;
  };
}

async function sendEmail(
  supabase: SB,
  request: Request,
  lead: Lead,
  subject: string,
  html: string,
  from: { email: string; name: string },
): Promise<{ ok: boolean; error?: string }> {
  // Ensure link to site is present
  const bodyHtml = html.includes(SITE) ? html : `${html}<p><a href="${SITE}">${SITE}</a></p>`;
  try {
    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
      },
      body: JSON.stringify({
        to: lead.email,
        from: `${from.name} <${from.email}>`,
        subject,
        html: bodyHtml,
      }),
    });
    if (!res.ok) {
      const txt = (await res.text()).slice(0, 200);
      // Fallback: log outreach as queued so it's not lost
      await supabase.from("outreach_log").insert({
        lead_id: lead.id,
        channel: "email",
        status: "queued",
        subject,
        body: bodyHtml,
        error: `email infra: ${res.status} ${txt}`,
      });
      return { ok: false, error: txt };
    }
    await supabase.from("outreach_log").insert({
      lead_id: lead.id,
      channel: "email",
      status: "sent",
      subject,
      body: bodyHtml,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("outreach_log").insert({
      lead_id: lead.id,
      channel: "email",
      status: "queued",
      subject,
      body: bodyHtml,
      error: msg,
    });
    return { ok: false, error: msg };
  }
}

async function queueInstagram(supabase: SB, lead: Lead, body: string) {
  // IG Graph API não permite DM frio para não-seguidores.
  // Registramos como "queued" com a copy pronta para envio manual ou humano-no-loop.
  const finalBody = body.includes(SITE) ? body : `${body}\n${SITE}`;
  await supabase.from("outreach_log").insert({
    lead_id: lead.id,
    channel: "instagram",
    status: "queued",
    body: finalBody,
  });
}

export const Route = createFileRoute("/api/public/hooks/auto-outreach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        const url = new URL(request.url);
        const force = url.searchParams.get("force") === "1";

        const supabase = await getAdmin();
        const { data: s } = await supabase
          .from("outreach_settings")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!s) return Response.json({ error: "no settings" }, { status: 500 });
        const settings = s as unknown as Settings;
        if (!settings.enabled && !force) return Response.json({ skipped: "disabled" });

        const site = settings.site_url || SITE;
        const from = {
          email: settings.from_email || "contato@amtfightwear.com.br",
          name: settings.from_name || "AMT Fight Wear",
        };

        // Contagem de disparos nas últimas 24h
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: todayRows } = await supabase
          .from("outreach_log")
          .select("channel,status")
          .gte("sent_at", since);
        const sentEmails = (todayRows ?? []).filter(
          (r) => r.channel === "email" && r.status === "sent",
        ).length;
        const sentIG = (todayRows ?? []).filter(
          (r) => r.channel === "instagram" && (r.status === "sent" || r.status === "queued"),
        ).length;

        const emailBudget = Math.max(0, settings.daily_email_cap - sentEmails);
        const igBudget = Math.max(0, settings.daily_instagram_cap - sentIG);

        // Batching por chamada: no máximo 5 por vez (para diluir ao longo do dia via cron horário)
        const batchLimit = force ? 20 : 5;
        const emailBatch = Math.min(emailBudget, batchLimit);
        const igBatch = Math.min(igBudget, batchLimit);

        if (emailBatch === 0 && igBatch === 0) {
          return Response.json({ skipped: "daily cap reached" });
        }

        // Leads ativos (não convertidos/rejeitados)
        const { data: leads } = await supabase
          .from("leads")
          .select("id,name,responsible,email,city,state,modality,lead_type,notes")
          .in("status", ["Novo", "Em contato", "Qualificado"])
          .limit(400);

        if (!leads || !leads.length) return Response.json({ skipped: "no leads" });

        // Filtro de cooldown: nenhum disparo nos últimos N dias
        const cutoff = new Date(
          Date.now() - settings.weekly_cooldown_days * 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: recentLogs } = await supabase
          .from("outreach_log")
          .select("lead_id")
          .gte("sent_at", cutoff);
        const blocked = new Set((recentLogs ?? []).map((r) => r.lead_id));

        // Ordena por prioridade regional: leads da região preferida primeiro
        const priorityUfs = new Set(REGION_UFS[settings.priority_region ?? "nordeste"] ?? []);
        const eligible = (leads as Lead[])
          .filter((l) => !blocked.has(l.id))
          .sort((a, b) => {
            const ap = a.state && priorityUfs.has(a.state) ? 0 : 1;
            const bp = b.state && priorityUfs.has(b.state) ? 0 : 1;
            return ap - bp;
          });

        const emailTargets = eligible.filter((l) => l.email).slice(0, emailBatch);
        // Instagram = leads que têm menção "IG:" nas notas
        const igTargets = eligible
          .filter((l) => !l.email && /IG:|instagram\.com/i.test(l.notes ?? ""))
          .slice(0, igBatch);

        const results: Array<{ id: string; channel: string; ok: boolean; error?: string }> = [];

        for (const lead of emailTargets) {
          try {
            const copy = await generateCopy(apiKey, lead, "email", settings.tone, site);
            const subject = copy.subject || `Proposta comercial B2B – AMT Fight Wear`;
            const html = copy.body_html || `<p>Prezados,</p><p>Somos a AMT Fight Wear, fabricante brasileira de kimonos trançados, faixas premium e patches. Gostaríamos de encaminhar nosso catálogo e tabela comercial para revenda.</p><p>Atenciosamente,<br/>Equipe Comercial – AMT Fight Wear<br/><a href="${site}">${site}</a></p>`;
            const r = await sendEmail(supabase, request, lead, subject, html, from);
            results.push({ id: lead.id, channel: "email", ok: r.ok, error: r.error });
            // Espaça 1-2s para evitar rajada
            await new Promise((res) => setTimeout(res, 1200));
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await supabase.from("outreach_log").insert({
              lead_id: lead.id,
              channel: "email",
              status: "failed",
              error: msg,
            });
            results.push({ id: lead.id, channel: "email", ok: false, error: msg });
          }
        }

        for (const lead of igTargets) {
          try {
            const copy = await generateCopy(apiKey, lead, "instagram", settings.tone, site);
            await queueInstagram(supabase, lead, copy.body || "");
            results.push({ id: lead.id, channel: "instagram", ok: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await supabase.from("outreach_log").insert({
              lead_id: lead.id,
              channel: "instagram",
              status: "failed",
              error: msg,
            });
            results.push({ id: lead.id, channel: "instagram", ok: false, error: msg });
          }
        }

        return Response.json({
          ok: true,
          processed: results.length,
          emailBudgetRemaining: emailBudget - emailTargets.length,
          igBudgetRemaining: igBudget - igTargets.length,
          results,
        });
      },
    },
  },
});
