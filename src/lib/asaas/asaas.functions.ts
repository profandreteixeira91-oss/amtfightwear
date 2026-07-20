/**
 * AMT Pay / Asaas — Server Functions (thin wrappers).
 *
 * Este módulo é client-reachable, então NÃO importa `client.server.ts` no topo.
 * As chamadas ao módulo Asaas são feitas dentro dos handlers.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Verifica a conexão com o Asaas e retorna informações do ambiente. */
export const asaasCheckConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getAsaasEnv, asaasGetBalance, getAmtWalletId } = await import(
      "@/lib/asaas/client.server"
    );

    try {
      const env = getAsaasEnv();
      const walletId = (() => {
        try {
          return getAmtWalletId();
        } catch {
          return null;
        }
      })();

      const balance = await asaasGetBalance();

      return {
        ok: true as const,
        env,
        walletId,
        balance: balance.totalBalance,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  });

/** Salva a chave PIX no perfil do dojo. */
export const setDojoPixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        pixKey: z.string().trim().min(1).max(200),
        pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { detectPixKeyType } = await import("@/lib/asaas/client.server");

    const keyType = data.pixKeyType || detectPixKeyType(data.pixKey);
    if (!keyType) {
      throw new Error("Formato de chave PIX inválido. Use CPF, CNPJ, email, telefone ou chave aleatória.");
    }

    const { error } = await context.supabase
      .from("dojo_academy_profile")
      .update({
        pix_key: data.pixKey.trim(),
        pix_key_type: keyType.toLowerCase(),
      })
      .eq("owner_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true, pixKeyType: keyType };
  });

/** Retorna a config do AMT Pay do dojo logado (status, chave PIX, wallet). */
export const getMyAsaasConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_academy_profile")
      .select(
        "asaas_subaccount_id, asaas_wallet_id, asaas_onboarding_status, asaas_onboarding_url, pix_key, pix_key_type",
      )
      .eq("owner_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return {
      subaccountId: data?.asaas_subaccount_id ?? null,
      walletId: data?.asaas_wallet_id ?? null,
      onboardingStatus: data?.asaas_onboarding_status ?? "not_started",
      onboardingUrl: data?.asaas_onboarding_url ?? null,
      pixKey: data?.pix_key ?? null,
      pixKeyType: data?.pix_key_type ?? null,
      hasSplit: !!data?.asaas_wallet_id,
    };
  });
