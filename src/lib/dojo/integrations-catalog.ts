// Catálogo declarativo de integrações do AMT Dojo Manager.
// Adicionar um novo provedor = adicionar um objeto aqui.
// Nunca importar módulos server-only neste arquivo (é usado no client).

export type IntegrationCategory =
  | "payments"
  | "corporate"
  | "communication"
  | "storage"
  | "apis";

export type IntegrationStatusHint = "connected" | "available" | "coming_soon";

export type WizardStep = {
  title: string;
  description: string;
  helperLinks?: { label: string; url: string }[];
  fields?: {
    key: string;
    label: string;
    placeholder?: string;
    secret?: boolean;
    optional?: boolean;
    help?: string;
    type?: "text" | "url" | "select";
    options?: { value: string; label: string }[];
  }[];
};

export type IntegrationDef = {
  id: string;
  name: string;
  vendor: string;
  category: IntegrationCategory;
  description: string;
  version: string;
  docsUrl: string;
  logoInitials: string;
  logoColor: string; // classe tailwind bg (fallback quando logoUrl falha)
  /** Domínio oficial do fornecedor — usado para puxar o logotipo real. */
  logoDomain?: string;
  /** Chave usada nas tabelas dojo_payment_gateways / dojo_partner_integrations */
  backendKey?: string;
  /** Módulo backend responsável (payments | partners | custom | placeholder) */
  backend: "payments-gateway" | "partner" | "communication" | "storage" | "apis" | "placeholder";
  defaultStatus: IntegrationStatusHint;
  features?: string[];
  wizard?: WizardStep[];
};

/** URL do logotipo oficial do fornecedor via logo.dev (fallback público sem token). */
export function getIntegrationLogoUrl(def: Pick<IntegrationDef, "logoDomain">): string | null {
  if (!def.logoDomain) return null;
  const token = (import.meta as any)?.env?.VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY;
  const base = `https://img.logo.dev/${def.logoDomain}?size=128&format=png`;
  return token ? `${base}&token=${token}` : base;
}

export const INTEGRATION_CATEGORIES: {
  id: IntegrationCategory;
  label: string;
  description: string;
}[] = [
  { id: "payments", label: "Pagamentos", description: "Gateways para cobrança de mensalidades e vendas" },
  { id: "corporate", label: "Programas Corporativos", description: "Gympass, TotalPass e parceiros de check-in" },
  { id: "communication", label: "Comunicação", description: "WhatsApp, e-mail transacional e SMS" },
  { id: "storage", label: "Armazenamento", description: "Backup e sincronização de arquivos" },
  { id: "apis", label: "APIs & Webhooks", description: "Chaves de acesso, webhooks e endpoints" },
];

export const INTEGRATIONS: IntegrationDef[] = [
  // ===== Pagamentos =====
  {
    id: "mercadopago",
    name: "Mercado Pago",
    vendor: "Mercado Pago",
    category: "payments",
    description: "Cobrança via Pix, cartão e boleto. Suporta assinaturas recorrentes.",
    version: "1.0",
    docsUrl: "https://www.mercadopago.com.br/developers/pt/docs",
    logoInitials: "MP",
    logoColor: "bg-sky-500",
    logoDomain: "mercadopago.com.br",
    backendKey: "mercadopago",
    backend: "payments-gateway",
    defaultStatus: "available",
    features: ["Pix", "Cartão", "Boleto", "Recorrência", "Webhook"],
    wizard: [
      {
        title: "Criar conta no Mercado Pago",
        description: "Acesse o portal de desenvolvedores e faça login com sua conta.",
        helperLinks: [{ label: "Abrir portal", url: "https://www.mercadopago.com.br/developers/panel" }],
      },
      {
        title: "Obter credenciais",
        description: "Em 'Suas integrações', crie uma aplicação e copie o Access Token de produção.",
        helperLinks: [{ label: "Painel de credenciais", url: "https://www.mercadopago.com.br/developers/panel/app" }],
      },
      {
        title: "Inserir credenciais",
        description: "Cole o Access Token e a Public Key. O sistema criptografa automaticamente.",
        fields: [
          { key: "access_token", label: "Access Token", placeholder: "APP_USR-...", secret: true },
          { key: "public_key", label: "Public Key", placeholder: "APP_USR-...", optional: true },
          { key: "webhook_secret", label: "Webhook Secret", placeholder: "opcional", secret: true, optional: true },
        ],
      },
      { title: "Testar conexão", description: "Validamos suas credenciais chamando /users/me na API oficial." },
      { title: "Concluir", description: "Pronto! Este gateway ficará disponível no módulo Financeiro e no App do Aluno." },
    ],
  },
  {
    id: "asaas",
    name: "Asaas",
    vendor: "Asaas",
    category: "payments",
    description: "Gateway brasileiro com foco em cobrança recorrente, Pix e boleto.",
    version: "1.0",
    docsUrl: "https://docs.asaas.com/",
    logoInitials: "AS",
    logoColor: "bg-emerald-500",
    logoDomain: "asaas.com",
    backendKey: "asaas",
    backend: "payments-gateway",
    defaultStatus: "available",
    features: ["Pix", "Cartão", "Boleto", "Split", "Webhook"],
    wizard: [
      {
        title: "Criar conta Asaas",
        description: "Cadastre-se no Asaas e conclua o KYC da empresa.",
        helperLinks: [{ label: "Cadastro Asaas", url: "https://www.asaas.com/" }],
      },
      {
        title: "Gerar API Key",
        description: "Em Configurações → Integrações, gere a chave de produção.",
        helperLinks: [{ label: "Manual oficial", url: "https://docs.asaas.com/docs/autenticacao" }],
      },
      {
        title: "Inserir credenciais",
        description: "Cole a API Key da Asaas.",
        fields: [
          { key: "access_token", label: "API Key", placeholder: "$aact_...", secret: true },
          { key: "webhook_secret", label: "Webhook Token", placeholder: "opcional", secret: true, optional: true },
        ],
      },
      { title: "Testar conexão", description: "Chamamos GET /v3/finance/balance para validar." },
      { title: "Concluir", description: "Habilite recorrência automática no módulo Financeiro." },
    ],
  },
  {
    id: "pagseguro",
    name: "PagSeguro",
    vendor: "UOL PagSeguro",
    category: "payments",
    description: "Cobranças via Pix, boleto e cartão com a maquininha PagSeguro.",
    version: "1.0",
    docsUrl: "https://dev.pagbank.uol.com.br/reference",
    logoInitials: "PS",
    logoColor: "bg-orange-500",
    logoDomain: "pagseguro.uol.com.br",
    backendKey: "pagseguro",
    backend: "payments-gateway",
    defaultStatus: "available",
    features: ["Pix", "Cartão", "Boleto"],
    wizard: [
      { title: "Ativar conta PagBank", description: "Crie sua conta de vendedor no PagBank.", helperLinks: [{ label: "PagBank", url: "https://pagseguro.uol.com.br/" }] },
      { title: "Gerar token", description: "Em Vendas → Preferências → Integrações, gere o token.", helperLinks: [{ label: "Docs oficiais", url: "https://dev.pagbank.uol.com.br/reference/autenticacao" }] },
      { title: "Inserir credenciais", description: "", fields: [
        { key: "access_token", label: "Access Token", secret: true },
        { key: "webhook_secret", label: "Webhook Secret", secret: true, optional: true },
      ] },
      { title: "Testar conexão", description: "Validamos com GET /public-keys." },
      { title: "Concluir", description: "Pronto." },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    vendor: "Stripe",
    category: "payments",
    description: "Aceite pagamentos internacionais e assinaturas globais.",
    version: "1.0",
    docsUrl: "https://stripe.com/docs/api",
    logoInitials: "ST",
    logoColor: "bg-indigo-500",
    logoDomain: "stripe.com",
    backend: "placeholder",
    defaultStatus: "coming_soon",
    features: ["Cartão", "Assinaturas", "Multi-moeda"],
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    vendor: "Stone / Pagar.me",
    category: "payments",
    description: "Gateway do grupo Stone com anti-fraude integrado.",
    version: "1.0",
    docsUrl: "https://docs.pagar.me/",
    logoInitials: "PG",
    logoColor: "bg-lime-600",
    logoDomain: "pagar.me",
    backend: "placeholder",
    defaultStatus: "coming_soon",
  },
  {
    id: "efi",
    name: "Efí Bank (Gerencianet)",
    vendor: "Efí",
    category: "payments",
    description: "Pix, boleto e cartão com tarifas competitivas.",
    version: "1.0",
    docsUrl: "https://dev.efipay.com.br/",
    logoInitials: "EF",
    logoColor: "bg-teal-600",
    logoDomain: "efipay.com.br",
    backend: "placeholder",
    defaultStatus: "coming_soon",
  },
  {
    id: "stone",
    name: "Stone",
    vendor: "Stone",
    category: "payments",
    description: "Estrutura preparada — em breve.",
    version: "0.1",
    docsUrl: "https://docs.stone.com.br/",
    logoInitials: "SN",
    logoColor: "bg-green-700",
    logoDomain: "stone.com.br",
    backend: "placeholder",
    defaultStatus: "coming_soon",
  },
  {
    id: "cielo",
    name: "Cielo",
    vendor: "Cielo",
    category: "payments",
    description: "Estrutura preparada — em breve.",
    version: "0.1",
    docsUrl: "https://developercielo.github.io/",
    logoInitials: "CL",
    logoColor: "bg-cyan-700",
    logoDomain: "cielo.com.br",
    backend: "placeholder",
    defaultStatus: "coming_soon",
  },
  {
    id: "rede",
    name: "Rede",
    vendor: "Itaú Rede",
    category: "payments",
    description: "Estrutura preparada — em breve.",
    version: "0.1",
    docsUrl: "https://www.userede.com.br/desenvolvedores",
    logoInitials: "RE",
    logoColor: "bg-red-600",
    logoDomain: "userede.com.br",
    backend: "placeholder",
    defaultStatus: "coming_soon",
  },

  // ===== Corporativos =====
  {
    id: "gympass",
    name: "Gympass / Wellhub",
    vendor: "Wellhub",
    category: "corporate",
    description: "Valida check-in de alunos com benefício Wellhub.",
    version: "1.0",
    docsUrl: "https://wellhub.com/partners",
    logoInitials: "GP",
    logoColor: "bg-yellow-500",
    logoDomain: "wellhub.com",
    backendKey: "gympass",
    backend: "partner",
    defaultStatus: "available",
    features: ["Check-in", "Webhook", "Elegibilidade"],
    wizard: [
      { title: "Contrato Wellhub", description: "Solicite acesso ao portal de parceiros Wellhub.", helperLinks: [{ label: "Parceiros Wellhub", url: "https://wellhub.com/pt-br/parceiros/" }] },
      { title: "Configurar webhook", description: "Cadastre a URL de webhook do sistema no painel do parceiro." },
      { title: "Credenciais", description: "", fields: [
        { key: "webhook_secret", label: "Segredo do webhook (HMAC)", secret: true },
        { key: "api_key_hint", label: "Referência da API Key", optional: true, help: "Identificador interno da chave" },
      ] },
      { title: "Testar conexão", description: "Enviamos um ping ao endpoint de elegibilidade." },
      { title: "Concluir", description: "Disponível no módulo Check-in." },
    ],
  },
  {
    id: "totalpass",
    name: "TotalPass",
    vendor: "TotalPass",
    category: "corporate",
    description: "Valida check-in de alunos com benefício TotalPass.",
    version: "1.0",
    docsUrl: "https://totalpass.com/br/rede-credenciada",
    logoInitials: "TP",
    logoColor: "bg-fuchsia-600",
    logoDomain: "totalpass.com",
    backendKey: "totalpass",
    backend: "partner",
    defaultStatus: "available",
    features: ["Check-in", "Webhook"],
    wizard: [
      { title: "Contrato TotalPass", description: "Ative sua academia no portal TotalPass.", helperLinks: [{ label: "Portal TotalPass", url: "https://totalpass.com/br/" }] },
      { title: "Webhook", description: "Cadastre a URL de webhook do sistema." },
      { title: "Credenciais", description: "", fields: [
        { key: "webhook_secret", label: "Segredo do webhook (HMAC)", secret: true },
        { key: "api_key_hint", label: "Referência da API Key", optional: true },
      ] },
      { title: "Testar conexão", description: "Validamos com endpoint de elegibilidade." },
      { title: "Concluir", description: "Disponível no módulo Check-in." },
    ],
  },

  // ===== Comunicação =====
  {
    id: "whatsapp_cloud",
    name: "WhatsApp Cloud API",
    vendor: "Meta",
    category: "communication",
    description: "Envio de mensagens transacionais e atendimento pelo WhatsApp oficial.",
    version: "1.0",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    logoInitials: "WA",
    logoColor: "bg-green-500",
    logoDomain: "whatsapp.com",
    backend: "communication",
    defaultStatus: "coming_soon",
    features: ["Template", "Sessão", "Webhook"],
  },
  {
    id: "resend",
    name: "Resend",
    vendor: "Resend",
    category: "communication",
    description: "E-mail transacional com alta entregabilidade.",
    version: "1.0",
    docsUrl: "https://resend.com/docs",
    logoInitials: "RS",
    logoColor: "bg-black",
    logoDomain: "resend.com",
    backend: "communication",
    defaultStatus: "coming_soon",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    vendor: "Twilio",
    category: "communication",
    description: "E-mail transacional e marketing.",
    version: "1.0",
    docsUrl: "https://docs.sendgrid.com/",
    logoInitials: "SG",
    logoColor: "bg-blue-500",
    logoDomain: "sendgrid.com",
    backend: "communication",
    defaultStatus: "coming_soon",
  },
  {
    id: "smtp",
    name: "SMTP",
    vendor: "Custom",
    category: "communication",
    description: "Servidor SMTP próprio para envio de e-mails.",
    version: "1.0",
    docsUrl: "https://datatracker.ietf.org/doc/html/rfc5321",
    logoInitials: "SM",
    logoColor: "bg-slate-600",
    backend: "communication",
    defaultStatus: "coming_soon",
  },
  {
    id: "twilio",
    name: "Twilio",
    vendor: "Twilio",
    category: "communication",
    description: "SMS, voz e verificação em dois fatores.",
    version: "1.0",
    docsUrl: "https://www.twilio.com/docs",
    logoInitials: "TW",
    logoColor: "bg-red-500",
    logoDomain: "twilio.com",
    backend: "communication",
    defaultStatus: "coming_soon",
  },
  {
    id: "gcal",
    name: "Google Calendar",
    vendor: "Google",
    category: "communication",
    description: "Sincronize aulas e eventos com o Google Calendar.",
    version: "0.1",
    docsUrl: "https://developers.google.com/calendar",
    logoInitials: "GC",
    logoColor: "bg-blue-600",
    logoDomain: "calendar.google.com",
    backend: "placeholder",
    defaultStatus: "coming_soon",
  },
  {
    id: "mscal",
    name: "Microsoft Calendar",
    vendor: "Microsoft",
    category: "communication",
    description: "Integração via Microsoft Graph.",
    version: "0.1",
    docsUrl: "https://learn.microsoft.com/graph/api/resources/calendar",
    logoInitials: "MC",
    logoColor: "bg-blue-800",
    logoDomain: "outlook.live.com",
    backend: "placeholder",
    defaultStatus: "coming_soon",
  },

  // ===== Armazenamento =====
  {
    id: "gdrive",
    name: "Google Drive",
    vendor: "Google",
    category: "storage",
    description: "Backup automático de fichas, certificados e vídeos.",
    version: "0.1",
    docsUrl: "https://developers.google.com/drive/api",
    logoInitials: "GD",
    logoColor: "bg-yellow-600",
    logoDomain: "drive.google.com",
    backend: "storage",
    defaultStatus: "coming_soon",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    vendor: "Microsoft",
    category: "storage",
    description: "Backup em nuvem via Microsoft Graph.",
    version: "0.1",
    docsUrl: "https://learn.microsoft.com/onedrive/developer/",
    logoInitials: "OD",
    logoColor: "bg-sky-700",
    logoDomain: "onedrive.live.com",
    backend: "storage",
    defaultStatus: "coming_soon",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    vendor: "Dropbox",
    category: "storage",
    description: "Sincronização de arquivos em nuvem.",
    version: "0.1",
    docsUrl: "https://www.dropbox.com/developers/documentation",
    logoInitials: "DB",
    logoColor: "bg-blue-500",
    logoDomain: "dropbox.com",
    backend: "storage",
    defaultStatus: "coming_soon",
  },
  {
    id: "s3",
    name: "Amazon S3",
    vendor: "AWS",
    category: "storage",
    description: "Buckets S3 para armazenamento escalável.",
    version: "0.1",
    docsUrl: "https://docs.aws.amazon.com/s3/",
    logoInitials: "S3",
    logoColor: "bg-orange-600",
    logoDomain: "aws.amazon.com",
    backend: "storage",
    defaultStatus: "coming_soon",
  },
  {
    id: "r2",
    name: "Cloudflare R2",
    vendor: "Cloudflare",
    category: "storage",
    description: "Armazenamento S3-compatível sem taxa de egress.",
    version: "0.1",
    docsUrl: "https://developers.cloudflare.com/r2/",
    logoInitials: "R2",
    logoColor: "bg-orange-500",
    logoDomain: "cloudflare.com",
    backend: "storage",
    defaultStatus: "coming_soon",
  },

  // ===== APIs =====
  {
    id: "api_keys",
    name: "API Keys",
    vendor: "AMT Dojo Manager",
    category: "apis",
    description: "Gere chaves de API com permissões independentes.",
    version: "1.0",
    docsUrl: "https://dojomanager.amtfightwear.com.br/docs/api",
    logoInitials: "AK",
    logoColor: "bg-neutral-900",
    backend: "apis",
    defaultStatus: "available",
    features: ["Read", "Write", "Webhook"],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    vendor: "AMT Dojo Manager",
    category: "apis",
    description: "Envie eventos do sistema para URLs externas em tempo real.",
    version: "1.0",
    docsUrl: "https://dojomanager.amtfightwear.com.br/docs/webhooks",
    logoInitials: "WH",
    logoColor: "bg-violet-600",
    backend: "apis",
    defaultStatus: "available",
    features: ["Retry", "HMAC", "Filtros"],
  },
];

export function getIntegrationById(id: string) {
  return INTEGRATIONS.find((i) => i.id === id);
}

export function integrationsByCategory(cat: IntegrationCategory) {
  return INTEGRATIONS.filter((i) => i.category === cat);
}
