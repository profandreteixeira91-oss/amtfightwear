import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getOutreachSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("outreach_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const UpdateInput = z.object({
  enabled: z.boolean().optional(),
  daily_email_cap: z.number().int().min(0).max(500).optional(),
  daily_instagram_cap: z.number().int().min(0).max(200).optional(),
  weekly_cooldown_days: z.number().int().min(1).max(60).optional(),
  tone: z.string().max(40).optional(),
  site_url: z.string().url().optional(),
  from_email: z.string().email().nullable().optional(),
  from_name: z.string().max(80).optional(),
  priority_region: z.enum(["nordeste", "sudeste", "sul", "norte", "centro-oeste", "nenhuma"]).optional(),
});

export const updateOutreachSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: current } = await context.supabase
      .from("outreach_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!current) throw new Error("Configuração não encontrada");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase.from("outreach_settings").update(data as any).eq("id", current.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getOutreachStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: last24 }, { data: last7 }, { data: recent }] = await Promise.all([
      context.supabase.from("outreach_log").select("channel,status").gte("sent_at", since24),
      context.supabase.from("outreach_log").select("channel,status").gte("sent_at", since7),
      context.supabase
        .from("outreach_log")
        .select("id,channel,status,subject,sent_at,error,lead_id,leads(name,city)")
        .order("sent_at", { ascending: false })
        .limit(30),
    ]);
    return { last24: last24 ?? [], last7: last7 ?? [], recent: recent ?? [] };
  });

export const runOutreachNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const url = `${process.env.SUPABASE_URL?.replace(".supabase.co", ".lovable.app") ?? ""}`;
    // Chama o próprio endpoint público via URL derivada seria frágil; usa fetch relativo pela origem do request seria melhor, mas server fn não expõe request.
    // Solução simples: usa hostname do projeto via env se disponível.
    const base = process.env.PROJECT_PUBLISHED_URL || process.env.PUBLIC_APP_URL || url;
    const target = base ? `${base}/api/public/hooks/auto-outreach?force=1` : "/api/public/hooks/auto-outreach?force=1";
    const res = await fetch(target, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, result: json };
  });
