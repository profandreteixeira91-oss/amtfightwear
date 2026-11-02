import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";

export type OwnerWhatsAppStatus = {
  configured: boolean;
  instance: string | null;
  /** "open" = número conectado; null quando a Evolution não está configurada. */
  state: string | null;
  recipients: string[];
};

const mask = (n: string) => (n.length > 6 ? `+${n.slice(0, 4)} ••••• ${n.slice(-4)}` : "••••");

/** Situação do WhatsApp (Evolution API) sem expor chaves nem números completos. */
export const adminGetOwnerWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnerWhatsAppStatus> => {
    await assertSaasOwner(context);
    const { evolutionConfig, evolutionConnectionState } = await import("@/lib/whatsapp/evolution.server");
    const { ownerRecipients } = await import("@/lib/store/whatsapp.server");
    const cfg = evolutionConfig();
    return {
      configured: !!cfg,
      instance: cfg?.instance ?? null,
      state: cfg ? await evolutionConnectionState() : null,
      recipients: ownerRecipients().map(mask),
    };
  });

/** Envia um aviso de pedido pago fictício para os números do dono. */
export const adminSendOwnerWhatsAppTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { sendToOwners, ownerTestMessage } = await import("@/lib/store/whatsapp.server");
    return sendToOwners(ownerTestMessage());
  });
