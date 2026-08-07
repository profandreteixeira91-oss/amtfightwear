import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveItemsFiscal } from "./fiscal-resolve.server";



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
      const { data: order, error: orderError } = await s
        .from('store_orders')
        .select('*')
        .eq('id', data.orderId)
        .single();
      
      if (orderError || !order) throw new Error("Pedido não encontrado");
      orderData = order;

      // Sem embed products(...): os dados fiscais são resolvidos depois,
      // direto do catálogo (produto -> categoria -> padrão).
      const { data: items, error: itemsError } = await s
        .from('store_order_items')
        .select('*')
        .eq('order_id', data.orderId);

      if (itemsError) throw new Error("Erro ao ler itens do pedido: " + itemsError.message);
      orderItems = (items as any[]) || [];


      customerData = {
        full_name: order.customer_name,
        email: order.customer_email,
        document: order.customer_document,
        address_state: (order.shipping_address as any)?.state || 'SP'
      };
    } else {
      const { data: quote, error: quoteError } = await s
        .from('store_quotes')
        .select('*')
        .eq('id', data.orderId)
        .single();
      
      if (quoteError || !quote) throw new Error("Orçamento não encontrado");
      orderData = quote;
      
      const items = Array.isArray(quote.items) ? quote.items : [];
      orderItems = (items as any[]).map((item) => ({ ...item }));


      customerData = {
        full_name: quote.customer_name,
        email: quote.customer_email,
        document: quote.customer_document,
        address_state: (quote.customer_address as any)?.state || 'SP'
      };
    }

    const { data: config } = await s
      .from('fiscal_issuer_config')
      .select('*')
      .maybeSingle();
    
    if (!config) throw new Error("Configurações do emitente não encontradas");

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
    
    const issuerState = config.address_state || 'SP';
    const customerState = customerData?.address_state || 'SP';
    
    // accessKey must be exactly 44 digits for a valid NF-e
    // Composition: cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
    const cUF = "35"; // SP code
    const AAMM = now.getFullYear().toString().substring(2, 4) + (now.getMonth() + 1).toString().padStart(2, '0');
    const cnpj = config.cnpj.replace(/\D/g, '').padStart(14, '0');
    const mod = "55";
    const serie = String(series).padStart(3, '0');
    const nNF = String(invoiceNumber).padStart(9, '0');
    const tpEmis = "1"; // Normal emission
    const cNF = Math.floor(10000000 + Math.random() * 89999999).toString();
    
    // Partial key to calculate check digit (43 digits)
    const partialKey = cUF + AAMM + cnpj + mod + serie + nNF + tpEmis + cNF;
    
    // Validate length before check digit
    if (partialKey.length !== 43) {
      console.error("Erro na geração da chave parcial:", partialKey, "Comprimento:", partialKey.length);
      throw new Error(`Erro interno na composição da chave (43 esperado, obtido ${partialKey.length})`);
    }
    
    // Modulo 11 for cDV
    let sum = 0;
    let weight = 2;
    for (let i = partialKey.length - 1; i >= 0; i--) {
      sum += parseInt(partialKey[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const remainder = sum % 11;
    const cDV = (remainder === 0 || remainder === 1) ? "0" : (11 - remainder).toString();
    
    const accessKey = partialKey + cDV;
    
    // Dados fiscais vêm do catálogo: produto -> categoria -> padrão nacional.
    // Somente o NCM bloqueia a emissão quando não existe em nenhum nível.
    const { missingNcm } = await resolveItemsFiscal(s, orderItems, {
      interstate: customerState !== issuerState,
    });

    if (missingNcm.length > 0) {
      throw new Error(
        `NCM não encontrado no catálogo para: ${missingNcm.join(", ")}. Preencha o NCM no produto ou na categoria em Catálogo > Fiscal.`,
      );
    }


    const { data: invoice, error: invoiceError } = await s
      .from('fiscal_invoices')
      .insert({
        owner_id: userId,
        order_id: data.type === 'order' ? data.orderId : null,
        quote_id: data.type === 'quote' ? data.orderId : null,
        invoice_number: invoiceNumber,
        series: series,
        access_key: accessKey,
        recipient_name: customerData?.full_name || 'Consumidor Final',
        recipient_document: customerData?.document?.replace(/\D/g, '') || '00000000000',
        total_amount: orderData.total,
        status: 'pending', // Alterado de authorized para pending: emissão agora exige transmissão real
        issue_date: new Date().toISOString(),
        xml_content: null,
        protocol: null,
        error_message: 'Módulo de transmissão aguardando configuração do provedor fiscal.'
      } as any)
      .select()
      .single();

    if (invoiceError) throw new Error("Erro ao salvar nota fiscal: " + invoiceError.message);

    if (data.type === 'order') {
      await s.from('store_orders').update({ status: 'invoiced' }).eq('id', data.orderId);
    } else {
      await s.from('store_quotes').update({ status: 'invoiced' }).eq('id', data.orderId);
    }

    await s.from('fiscal_issuer_config').update({ last_nfe_number: invoiceNumber }).eq('id', config.id);

    return {
      success: true,
      invoice: invoice
    };
  });
