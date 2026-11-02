import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";

export type OwnerWhatsAppStatus = {
  hasCredentials: boolean;
  recipients: string[];
  template: string;
  language: string;
};

const mask = (n: string) => (n.length > 6 ? `+${n.slice(0, 4)} ••••• ${n.slice(-4)}` : "••••");

/** Situação do aviso de "pedido pago" no WhatsApp do dono (sem expor números completos). */
export const adminGetOwnerWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnerWhatsAppStatus> => {
    await assertSaasOwner(context);
    const { ownerWhatsAppConfig } = await import("@/lib/store/whatsapp.server");
    const cfg = ownerWhatsAppConfig();
    return { ...cfg, recipients: cfg.recipients.map(mask) };
  });

/** Envia o template com dados de exemplo para os números configurados. */
export const adminSendOwnerWhatsAppTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { sendOwnerTemplate } = await import("@/lib/store/whatsapp.server");
    return sendOwnerTemplate(["TESTE-0001", "Cliente de teste", "R$ 199,90", "1x Faixa Jiu-Jitsu Azul - Linha Pro (A2)"]);
  });
