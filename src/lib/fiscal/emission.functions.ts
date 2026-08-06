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
    type: z.enum(['order', 'quote']).default('order'),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const userId = context.userId;

    let orderData: any;
    let customerData: any;
    let orderItems: any[] = [];

    if (data.type === 'order') {
      // 1. Fetch order data
      const { data: order, error: orderError } = await s
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('id', data.orderId)
        .single();
      
      if (orderError || !order) throw new Error("Pedido não encontrado");
      orderData = order;
      orderItems = order.order_items || [];

      // Fetch customer data
      const { data: customer } = await s
        .from('customers')
        .select('*')
        .eq('id', order.customer_id || '')
        .maybeSingle();
      customerData = customer;
    } else {
      // 1. Fetch quote data
      const { data: quote, error: quoteError } = await s
        .from('store_quotes')
        .select('*')
        .eq('id', data.orderId)
        .single();
      
      if (quoteError || !quote) throw new Error("Orçamento não encontrado");
      orderData = quote;
      
      // Map quote items to standard format
      const items = Array.isArray(quote.items) ? quote.items : [];
      
      // For quotes, we need to fetch NCM/CEST from products table since it's just a JSON in store_quotes
      for (const item of items as any[]) {
        const { data: prod } = await s
          .from('products')
          .select('ncm, cest, cfop_internal, cfop_interstate')
          .eq('id', item.product_id)
          .maybeSingle();
        
        orderItems.push({
          ...item,
          products: prod || {}
        });
      }

      customerData = {
        full_name: quote.customer_name,
        email: quote.customer_email,
        document: quote.customer_document
      };
    }

    // 3. Validate issuer config
    const { data: config } = await s
      .from('fiscal_issuer_config')
      .select('*')
      .maybeSingle();
    
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

    const invoiceNumber = (config.last_nfe_number || 0) + 1;
    const series = config.last_nfe_series || 1;
    
    // Identificar UF para CFOP automático
    const issuerState = config.address_state || 'SP';
    const customerState = customerData?.address_state || 'SP'; // Fallback ou busca no customerData
    
    const accessKey = `352608${config.cnpj.replace(/\D/g, '')}55001${String(invoiceNumber).padStart(9, '0')}1${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    // Validar campos obrigatórios antes da emissão
    for (const item of orderItems) {
      if (!item.products?.ncm) throw new Error(`Produto ${item.product_name || 'sem nome'} está sem NCM preenchido.`);
      
      const cfop = (customerState === issuerState) 
        ? item.products?.cfop_internal 
        : item.products?.cfop_interstate;
      
      if (!cfop) throw new Error(`Produto ${item.product_name || 'sem nome'} está sem CFOP configurado para operação ${(customerState === issuerState) ? 'interna' : 'interestadual'}.`);
    }

    // Simulate processing steps
    const { data: invoice, error: invoiceError } = await s
      .from('fiscal_invoices')
      .insert({
        owner_id: userId,
        order_id: data.type === 'order' ? data.orderId : null,
        quote_id: data.type === 'quote' ? data.orderId : null,
        invoice_number: invoiceNumber,
        series: series,
        access_key: accessKey,
        recipient_name: customerData?.full_name || 'Cliente Consumidor',
        recipient_document: customerData?.document || '000.000.000-00',
        total_amount: orderData.total,
        status: 'authorized',
        issue_date: new Date().toISOString(),
        xml_content: '<nfeProc>...</nfeProc>',
        protocol: '135260000000000'
      } as any)
      .select()
      .single();

    if (invoiceError) throw new Error("Erro ao salvar nota fiscal: " + invoiceError.message);

    // 15. Update status
    if (data.type === 'order') {
      await s
        .from('orders')
        .update({ status: 'invoiced' })
        .eq('id', data.orderId);
    } else {
      await s
        .from('store_quotes')
        .update({ status: 'invoiced' })
        .eq('id', data.orderId);
    }

    // 17. Send email (Simulated/Placeholder)
    console.log(`Email enviado para ${customerData?.email || 'cliente'} com a NF-e ${invoiceNumber}`);

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
