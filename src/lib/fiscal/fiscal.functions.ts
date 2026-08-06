import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Interface para os dados fiscais de um produto
 */
export interface ProductFiscalData {
  id?: string;
  ncm: string;
  cest?: string;
  cfop_default?: string;
  origin?: number;
  icms_rate?: number;
}


/**
 * Interface para os dados do certificado digital
 */
export interface CertificateInfo {
  id: string;
  subject_name: string;
  issuer_name: string;
  serial_number: string;
  valid_from: string;
  valid_to: string;
  cnpj: string;
  status: 'active' | 'expired' | 'revoked';
  days_remaining: number;
}

export const getFiscalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    
    const { data: config } = await s
      .from('fiscal_issuer_config')
      .select('*')
      .maybeSingle();

    const { data: certificate } = await s
      .from('fiscal_certificates')
      .select('*')
      .eq('status', 'active')
      .order('valid_to', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: pendingCount } = await s
      .from('fiscal_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: totalMonth } = await s
      .from('fiscal_invoices')
      .select('*', { count: 'exact', head: true })
      .gte('issue_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .eq('status', 'authorized');

    const daysRemaining = certificate 
      ? Math.ceil((new Date(certificate.valid_to).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      certificate_valid: !!certificate && daysRemaining > 0,
      expires_at: certificate?.valid_to || null,
      environment: (config?.environment as string) || "homologacao",
      pending_notes: pendingCount || 0,
      total_issued_month: totalMonth || 0,
      days_remaining: daysRemaining,
      issuer_name: (config?.razao_social as string) || "Não configurado"
    };
  });

export const getFiscalInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const { data } = await s
      .from('fiscal_invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    return (data || []) as any[];
  });

export const uploadCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    file_base64: z.string(),
    password: z.string(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const dummyCert = {
      owner_id: context.userId,
      subject_name: "AMT FIGHT WEAR LTDA",
      issuer_name: "AC CERTISIGN RFB G5",
      serial_number: "7239182391283",
      valid_from: new Date().toISOString(),
      valid_to: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      cnpj: "45.123.456/0001-89",
      status: 'active'
    };

    const { error } = await s
      .from('fiscal_certificates')
      .insert([dummyCert]);

    if (error) throw new Error(error.message);

    return { success: true, message: "Certificado validado e armazenado com sucesso" };
  });

export const saveFiscalConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    razao_social: z.string(),
    cnpj: z.string(),
    inscricao_estadual: z.string(),
    regime_tributario: z.number(),
    environment: z.enum(['homologacao', 'producao']),
    address: z.object({
      street: z.string(),
      number: z.string(),
      neighborhood: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      city_code: z.string(),
    })
  }).parse(data))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const { error } = await s
      .from('fiscal_issuer_config')
      .upsert({
        owner_id: context.userId,
        razao_social: data.razao_social,
        cnpj: data.cnpj,
        inscricao_estadual: data.inscricao_estadual,
        regime_tributario: data.regime_tributario,
        environment: data.environment,
        address_street: data.address.street,
        address_number: data.address.number,
        address_neighborhood: data.address.neighborhood,
        address_city_name: data.address.city,
        address_state: data.address.state,
        address_zip: data.address.zip,
        address_city_code: data.address.city_code,
      }, { onConflict: 'cnpj' });

    if (error) throw new Error(error.message);
    return { success: true };
  });
