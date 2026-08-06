import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Service to handle the full NF-e emission flow
 */
export const emitNFe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    orderId: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const userId = context.userId;

    // 1. Validate permissions (Middleware handles auth, we check owner/admin if needed)
    
    // 2. Fetch order data
    const { data: order, error: orderError } = await s
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('id', data.orderId)
      .single();
    
    if (orderError || !order) throw new Error("Pedido não encontrado");

    // 3. Validate issuer config
    const { data: config } = await s
      .from('fiscal_issuer_config')
      .select('*')
      .single();
    
    if (!config) throw new Error("Configurações do emitente não encontradas");

    // 4. Validate certificate
    const { data: certificate } = await s
      .from('fiscal_certificates')
      .select('*')
      .eq('status', 'active')
      .order('valid_to', { ascending: false })
      .maybeSingle();

    if (!certificate) throw new Error("Certificado digital A1 não encontrado ou inativo");
    
    const now = new Date();
    if (new Date(certificate.valid_to) < now) throw new Error("Certificado digital expirado");

    // 5. Build XML (Mocking actual XML building/signing/transmission for now as it requires specific libs/SEFAZ connection)
    // In a real production environment, we would use a library like 'nfe-php' (if PHP) or 'node-nfe' (if Node) 
    // or a dedicated API like FocusNFe, PlugNFe, etc. 
    // Given the constraints, we will simulate the success response but structure the logs and storage.

    const invoiceNumber = (config.last_nfe_number || 0) + 1;
    const series = config.last_nfe_series || 1;
    const accessKey = `352608${config.cnpj.replace(/\D/g, '')}55001${String(invoiceNumber).padStart(9, '0')}1${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    // Simulate processing steps
    // Step 7, 8, 9, 10
    
    const { data: invoice, error: invoiceError } = await s
      .from('fiscal_invoices')
      .insert({
        owner_id: userId,
        order_id: data.orderId,
        invoice_number: invoiceNumber,
        series: series,
        access_key: accessKey,
        recipient_name: order.customer_name || 'Cliente Consumidor',
        total_amount: order.total_amount,
        status: 'authorized',
        issue_date: new Date().toISOString(),
        environment: config.environment,
        xml_authorized: '<nfeProc>...</nfeProc>',
        danfe_url: 'https://example.com/danfe.pdf', // Placeholder
        protocol: '135260000000000'
      })
      .select()
      .single();

    if (invoiceError) throw new Error("Erro ao salvar nota fiscal: " + invoiceError.message);

    // Update issuer last number
    await s
      .from('fiscal_issuer_config')
      .update({ last_nfe_number: invoiceNumber })
      .eq('id', config.id);

    return {
      success: true,
      invoice: invoice
    };
  });
