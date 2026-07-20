// CRUD de gateways de pagamento por dono de dojo.
// Cada dono cadastra as credenciais do seu próprio Mercado Pago / Asaas / PagSeguro
// para cobrar seus alunos com a conta dele.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const providerSchema = z.enum(["mercadopago", "asaas", "pagseguro"]);

/** Mascara o token, retornando só os últimos 4 caracteres para exibição. */
function maskToken(token: string | null): string | null {
  if (!token) return null;
  if (token.length <= 6) return "••••";
  return `••••${token.slice(-4)}`;
}

export const listMyGateways = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_payment_gateways")
      .select("id, provider, label, is_default, active, public_key, access_token, webhook_secret, updated_at")
      .eq("owner_id", context.userId)
      .order("provider", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      access_token: maskToken(row.access_token),
      webhook_secret: row.webhook_secret ? "••••••••" : null,
    }));
  });

export const upsertMyGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        provider: providerSchema,
        label: z.string().max(60).optional().nullable(),
        access_token: z.string().min(4).optional().nullable(),
        public_key: z.string().max(200).optional().nullable(),
        webhook_secret: z.string().max(200).optional().nullable(),
        active: z.boolean().optional(),
        is_default: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, any> = {
      owner_id: context.userId,
      provider: data.provider,
      label: data.label ?? null,
      public_key: data.public_key ?? null,
      active: data.active ?? true,
    };
    // Só sobrescreve credenciais se o usuário enviar algo (não regravar máscara).
    if (data.access_token && !data.access_token.startsWith("••••")) {
      patch.access_token = data.access_token;
    }
    if (data.webhook_secret && !data.webhook_secret.startsWith("••••")) {
      patch.webhook_secret = data.webhook_secret;
    }

    const { data: existing } = await context.supabase
      .from("dojo_payment_gateways")
      .select("id")
      .eq("owner_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();

    const id = (existing as any)?.id as string | undefined;

    if (id) {
      const { error } = await context.supabase
        .from("dojo_payment_gateways")
        .update(patch as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      // Primeiro gateway do dono vira o default automaticamente.
      const { count } = await context.supabase
        .from("dojo_payment_gateways")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", context.userId);
      if (!count) patch.is_default = true;
      const { error } = await context.supabase
        .from("dojo_payment_gateways")
        .insert(patch as never);
      if (error) throw new Error(error.message);
    }

    // Se o usuário pediu para tornar padrão, desmarca os demais e ativa este.
    if (data.is_default) {
      await context.supabase
        .from("dojo_payment_gateways")
        .update({ is_default: false } as never)
        .eq("owner_id", context.userId)
        .neq("provider", data.provider);
      await context.supabase
        .from("dojo_payment_gateways")
        .update({ is_default: true } as never)
        .eq("owner_id", context.userId)
        .eq("provider", data.provider);
    }

    await context.supabase.from("dojo_gateway_history").insert({
      owner_id: context.userId,
      provider: data.provider,
      action: id ? "reconfigured" : "connected",
      actor_user_id: context.userId,
      actor_email: (context.claims as any)?.email ?? null,
      details: {
        label: data.label ?? null,
        active: patch.active ?? null,
        is_default: data.is_default ?? null,
        credentials_updated: !!(data.access_token || data.webhook_secret),
      },
    } as never);

    return { ok: true };
  });

export const deleteMyGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ provider: providerSchema, reason: z.string().max(400).optional().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // Bloqueia remoção se houver fatura em processamento vinculada a este provedor.
    const { count: pending } = await context.supabase
      .from("dojo_invoices")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", context.userId)
      .eq("payment_provider", data.provider)
      .in("status", ["pending", "processing"]);
    if ((pending ?? 0) > 0) {
      throw new Error(
        "Existe uma sincronização financeira em andamento. Aguarde sua conclusão antes de remover esta integração.",
      );
    }

    const { error } = await context.supabase
      .from("dojo_payment_gateways")
      .delete()
      .eq("owner_id", context.userId)
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);

    await context.supabase.from("dojo_gateway_history").insert({
      owner_id: context.userId,
      provider: data.provider,
      action: "disconnected",
      actor_user_id: context.userId,
      actor_email: (context.claims as any)?.email ?? null,
      reason: data.reason ?? null,
      details: {},
    } as never);

    return { ok: true };
  });

export const listMyGatewayHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_gateway_history")
      .select("id, provider, action, actor_email, reason, details, created_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
