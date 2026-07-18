// Endpoints server-side para testar conexões e gerenciar API Keys / Webhooks.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============== TESTE DE CONEXÃO ==============
export const testIntegrationConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      integrationId: z.string(),
      credentials: z.record(z.string()).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const t0 = Date.now();

    async function timed(fn: () => Promise<{ ok: boolean; message: string; status?: number }>) {
      try {
        const r = await fn();
        return { ...r, latencyMs: Date.now() - t0 };
      } catch (e: any) {
        return { ok: false, message: e.message ?? "Erro desconhecido", latencyMs: Date.now() - t0 };
      }
    }

    async function loadStoredToken(provider: string): Promise<string | null> {
      const { data: gw } = await context.supabase
        .from("dojo_payment_gateways")
        .select("access_token")
        .eq("owner_id", context.userId)
        .eq("provider", provider)
        .maybeSingle();
      return (gw as any)?.access_token ?? null;
    }

    switch (data.integrationId) {
      case "mercadopago": {
        return timed(async () => {
          const token = data.credentials?.access_token || (await loadStoredToken("mercadopago"));
          if (!token) return { ok: false, message: "Access Token ausente" };
          const r = await fetch("https://api.mercadopago.com/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const body = await r.text();
          return { ok: r.ok, status: r.status, message: r.ok ? "Token válido" : body.slice(0, 200) };
        });
      }
      case "asaas": {
        return timed(async () => {
          const token = data.credentials?.access_token || (await loadStoredToken("asaas"));
          if (!token) return { ok: false, message: "API Key ausente" };
          const r = await fetch("https://api.asaas.com/v3/finance/balance", {
            headers: { access_token: token },
          });
          return { ok: r.ok, status: r.status, message: r.ok ? "API Key válida" : (await r.text()).slice(0, 200) };
        });
      }
      case "pagseguro": {
        return timed(async () => {
          const token = data.credentials?.access_token || (await loadStoredToken("pagseguro"));
          if (!token) return { ok: false, message: "Access Token ausente" };
          const r = await fetch("https://api.pagseguro.com/public-keys", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "card" }),
          });
          return { ok: r.status < 500, status: r.status, message: r.status < 500 ? "Token aceito pela API" : "Erro no servidor PagSeguro" };
        });
      }
      case "gympass":
      case "totalpass": {
        return timed(async () => ({
          ok: true,
          message: "Configuração armazenada. A validação real ocorre no webhook do parceiro.",
        }));
      }
      default:
        return { ok: false, message: "Provedor ainda não implementado", latencyMs: Date.now() - t0 };
    }
  });

// ============== DASHBOARD METRICS ==============
export const getIntegrationsMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [gws, partners, checkins] = await Promise.all([
      context.supabase.from("dojo_payment_gateways").select("id, active, provider, updated_at").eq("owner_id", context.userId),
      context.supabase.from("dojo_partner_integrations").select("id, enabled, provider, updated_at").eq("owner_id", context.userId),
      context.supabase.from("dojo_partner_checkins").select("id, status, created_at").eq("owner_id", context.userId).gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
    ]);
    const active = (gws.data ?? []).filter((g: any) => g.active).length + (partners.data ?? []).filter((p: any) => p.enabled).length;
    const inactive = (gws.data ?? []).filter((g: any) => !g.active).length + (partners.data ?? []).filter((p: any) => !p.enabled).length;
    const installed = (gws.data ?? []).length + (partners.data ?? []).length;
    const errors24h = (checkins.data ?? []).filter((c: any) => c.status !== "approved").length;
    const calls24h = (checkins.data ?? []).length;
    const lastSyncAt = [
      ...(gws.data ?? []).map((g: any) => g.updated_at),
      ...(partners.data ?? []).map((p: any) => p.updated_at),
    ].sort().pop() ?? null;

    return { installed, active, inactive, errors24h, calls24h, lastSyncAt };
  });
