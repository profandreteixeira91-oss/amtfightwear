import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";

export type OwnerWhatsAppStatus = {
  configured: boolean;
  instance: string | null;
  /** "open" = conectado; null = instância ainda não criada no servidor. */
  state: "open" | "connecting" | "close" | null;
  connectedNumber: string | null;
  profileName: string | null;
  /** Números que recebem o aviso de pedido pago (mascarados). */
  recipients: string[];
  error: string | null;
};

const mask = (n: string) => (n.length > 6 ? `+${n.slice(0, 4)} ••••• ${n.slice(-4)}` : "••••");

/** Situação do WhatsApp da loja, sem expor chaves nem números completos dos destinatários. */
export const adminGetOwnerWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnerWhatsAppStatus> => {
    await assertSaasOwner(context);
    const evo = await import("@/lib/whatsapp/evolution.server");
    const { ownerRecipients } = await import("@/lib/store/whatsapp.server");
    const cfg = evo.evolutionConfig();
    const base: OwnerWhatsAppStatus = {
      configured: !!cfg,
      instance: cfg?.instance ?? null,
      state: null,
      connectedNumber: null,
      profileName: null,
      recipients: ownerRecipients().map(mask),
      error: null,
    };
    if (!cfg) return base;
    try {
      base.state = await evo.evolutionConnectionState();
      if (base.state === "open") {
        const info = await evo.evolutionInstanceInfo();
        base.connectedNumber = info.number;
        base.profileName = info.profileName;
      }
    } catch (err) {
      base.error = err instanceof Error ? err.message : String(err);
    }
    return base;
  });

/** Inicia a conexão do número da loja: QR Code ou, com `number`, código de pareamento. */
export const adminConnectStoreWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ number: z.string().trim().max(20).optional().nullable() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const evo = await import("@/lib/whatsapp/evolution.server");
    const number = data.number ? evo.normalizeWhatsAppNumber(data.number) : null;
    if (data.number && !number) throw new Error("Número inválido. Use DDD + número, ex.: 82 99999-8888.");
    return evo.evolutionStartConnection(number ?? undefined);
  });

/** Desconecta o número da loja (para trocar de aparelho ou de número). */
export const adminDisconnectStoreWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { evolutionLogout } = await import("@/lib/whatsapp/evolution.server");
    await evolutionLogout();
    return { ok: true };
  });

/** Envia um aviso de pedido pago fictício para os números do dono. */
export const adminSendOwnerWhatsAppTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { sendToOwners, ownerTestMessage } = await import("@/lib/store/whatsapp.server");
    return sendToOwners(ownerTestMessage());
  });
