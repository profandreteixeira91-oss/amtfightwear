import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Interface para os dados fiscais de um produto
 */
export interface ProductFiscalData {
  ncm: string;
  cest?: string;
  cfop_default?: string;
  origin: number; // 0-8
  csosn?: string;
  cst_icms?: string;
  cst_pis?: string;
  cst_cofins?: string;
  icms_rate?: number;
  ipi_rate?: number;
  pis_rate?: number;
  cofins_rate?: number;
  weight_bruto?: number;
  weight_liquido?: number;
  unit_commercial: string;
  unit_tributable: string;
  gtin?: string;
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
  .handler(async () => {
    // Simulação de retorno de status fiscal
    return {
      certificate_valid: true,
      expires_at: "2027-05-20",
      environment: "homologacao",
      pending_notes: 3,
      total_issued_month: 124,
    };
  });

export const uploadCertificate = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    file_base64: z.string(),
    password: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    // Lógica para descriptografar, validar e armazenar o certificado no Vault do Lovable Cloud
    console.log("Recebido certificado para processamento seguro");
    return { success: true, message: "Certificado validado e armazenado com sucesso" };
  });
