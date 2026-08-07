import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const reconcileFakeInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    
    // Identifica notas com o protocolo fictício usado anteriormente
    const { data, error } = await s
      .from('fiscal_invoices')
      .update({ 
        status: 'error', 
        error_message: 'NF-e auditada: identificada como registro fictício sem transmissão real à SEFAZ (Módulo de Simulação desativado).'
      })
      .eq('protocol', '135260000000000')
      .select('id');

    if (error) throw new Error("Erro na reconciliação: " + error.message);
    
    return { success: true, count: data?.length || 0 };
  });
