/**
 * Catálogo canônico de formas de pagamento do AMT Dojo Manager.
 * Fonte única de verdade — módulos de Planos, Financeiro, Cobranças,
 * Matrículas e futuras integrações com gateways devem consumir daqui.
 */
import {
  Banknote,
  QrCode,
  CreditCard,
  Landmark,
  FileText,
  Link as LinkIcon,
  Repeat,
  Wallet,
  Building2,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export type PaymentMethodCode =
  | "cash"
  | "pix"
  | "card_machine"
  | "payment_link";

export type GatewayCode =
  | "manual"
  | "asaas"
  | "mercadopago"
  | "pagseguro"
  | "stripe"
  | "banco_inter";

/** Configurações específicas por método (todos opcionais). */
export type PaymentMethodConfig = {
  /** Desconto percentual (0-100). */
  discount_pct?: number;
  /** Desconto em valor fixo (R$). */
  discount_value?: number;
  /** Vencimento em dias (PIX, boleto). */
  due_days?: number;
  /** Nº máximo de parcelas (cartão). */
  max_installments?: number;
  /** Nº mínimo de parcelas (cartão). */
  min_installments?: number;
  /** Juros por conta do cliente (%). */
  interest_customer_pct?: number;
  /** Juros por conta da academia (%). */
  interest_house_pct?: number;
  /** Multa por atraso (%). */
  late_fee_pct?: number;
  /** Juros por atraso ao mês (%). */
  late_interest_pct?: number;
  /** Taxa administrativa (R$). */
  admin_fee?: number;
  /** Desconto à vista (%). */
  cash_discount_pct?: number;
};

export type PlanPaymentMethod = {
  code: PaymentMethodCode;
  enabled: boolean;
  gateway?: GatewayCode;
  config?: PaymentMethodConfig;
};

export type PlanRules = {
  allow_prepay?: boolean;
  /** @deprecated Renovação automática é obrigatória em todos os planos (sempre true). */
  auto_renew?: boolean;
  /** @deprecated Geração automática de mensalidade é obrigatória (sempre true). */
  auto_generate_invoice?: boolean;
  allow_default?: boolean;
  block_after_days?: number | null;
  suspend_checkin?: boolean;
  /** Dias de inadimplência necessários para suspender os check-ins (0 = imediatamente após vencer). */
  suspend_checkin_days?: number | null;
  /** @deprecated Regra removida do produto. Mantido apenas para compatibilidade de leitura. */
  suspend_app?: boolean;
  requires_enrollment_fee?: boolean;
  /** Dias de antecedência para geração automática da cobrança (1..60). */
  billing_advance_days?: number | null;
};

/** Antecedência padrão (em dias) para gerar a cobrança antes do vencimento. */
export const DEFAULT_BILLING_ADVANCE_DAYS = 5;

/** Normaliza a antecedência configurada no plano. */
export function planAdvanceDays(rules: unknown): number {
  const raw = (rules as PlanRules | null | undefined)?.billing_advance_days;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BILLING_ADVANCE_DAYS;
  return Math.min(60, Math.round(n));
}


export type PlanFrequency =
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "quadrimestral"
  | "semiannual"
  | "annual"
  | "custom";

export const FREQUENCY_LABELS: Record<PlanFrequency, string> = {
  monthly: "Mensal",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  quadrimestral: "Quadrimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizado",
};

export const FREQUENCY_MONTHS: Record<Exclude<PlanFrequency, "custom">, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  quadrimestral: 4,
  semiannual: 6,
  annual: 12,
};

/** Duração do ciclo do plano em meses. */
export function planCycleMonths(
  frequency: string | null | undefined,
  customMonths?: number | null,
): number {
  if (frequency === "custom") return Math.max(1, Math.round(Number(customMonths) || 1));
  const key = (frequency ?? "monthly") as Exclude<PlanFrequency, "custom">;
  return FREQUENCY_MONTHS[key] ?? 1;
}

/** Nº de parcelas (cobranças) geradas dentro do ciclo do plano. */
export function planInstallments(
  installments: number | null | undefined,
  cycleMonths: number,
): number {
  const n = Math.round(Number(installments) || 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.max(1, cycleMonths), n);
}

/** Intervalo, em meses, entre duas cobranças do mesmo ciclo. */
export function planChargeIntervalMonths(cycleMonths: number, installments: number): number {
  return Math.max(1, Math.floor(cycleMonths / Math.max(1, installments)));
}

/** Valor de cada parcela dentro do ciclo (2 casas). */
export function planChargeAmount(cycleAmount: number, installments: number): number {
  const n = Math.max(1, installments);
  return Math.round((Number(cycleAmount || 0) / n) * 100) / 100;
}


export type PaymentMethodDef = {
  code: PaymentMethodCode;
  label: string;
  icon: LucideIcon;
  /** Lista de configs relevantes para esta forma de pagamento. */
  configFields: Array<keyof PaymentMethodConfig>;
  /** Gateways compatíveis. */
  gateways: GatewayCode[];
};

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  {
    code: "cash",
    label: "Dinheiro",
    icon: Banknote,
    configFields: ["cash_discount_pct"],
    gateways: ["manual"],
  },
  {
    code: "pix",
    label: "PIX (QR Code ou maquininha)",
    icon: QrCode,
    configFields: ["discount_pct", "discount_value", "due_days"],
    gateways: ["manual"],
  },
  {
    code: "card_machine",
    label: "Cartões (débito ou crédito — maquininha)",
    icon: CreditCard,
    configFields: [
      "max_installments",
      "min_installments",
      "interest_customer_pct",
      "interest_house_pct",
    ],
    gateways: ["manual"],
  },
  {
    code: "payment_link",
    label: "Link de pagamento (PIX, cartões, boleto)",
    icon: LinkIcon,
    configFields: ["due_days", "max_installments"],
    gateways: ["manual"],
  },
];

export const GATEWAY_LABELS: Record<GatewayCode, string> = {
  manual: "Manual (registro interno)",
  asaas: "AMT Pay",
  mercadopago: "Mercado Pago",
  pagseguro: "PagSeguro",
  stripe: "Stripe",
  banco_inter: "Banco Inter",
};

export const CONFIG_LABELS: Record<keyof PaymentMethodConfig, string> = {
  discount_pct: "Desconto (%)",
  discount_value: "Desconto em valor (R$)",
  due_days: "Dias para vencimento",
  max_installments: "Parcelamento máximo",
  min_installments: "Parcelamento mínimo",
  interest_customer_pct: "Juros por conta do cliente (%)",
  interest_house_pct: "Juros por conta da academia (%)",
  late_fee_pct: "Multa por atraso (%)",
  late_interest_pct: "Juros por atraso ao mês (%)",
  admin_fee: "Taxa administrativa (R$)",
  cash_discount_pct: "Desconto à vista (%)",
};

/**
 * Métodos aceitos pelo Asaas (gateway centralizado do AMT Pay).
 * Somente estes aparecem como opção nas Regras de Planos.
 */
export const ASAAS_SUPPORTED_METHODS: PaymentMethodCode[] = [
  "pix",
  "payment_link",
];


export function findPaymentMethod(code: PaymentMethodCode | string | undefined) {
  if (!code) return undefined;
  return PAYMENT_METHODS.find((m) => m.code === code);
}

export function paymentMethodLabel(code: string | null | undefined): string {
  return findPaymentMethod(code as PaymentMethodCode)?.label ?? code ?? "—";
}

/** Constrói a lista completa (todos os métodos, desabilitados por padrão). */
export function defaultPlanPaymentMethods(): PlanPaymentMethod[] {
  return PAYMENT_METHODS.map((m) => ({
    code: m.code,
    enabled: false,
    gateway: "manual",
    config: {},
  }));
}

/** Faz merge do array salvo em jsonb com o catálogo. Métodos ausentes ficam desabilitados. */
export function normalizePlanPaymentMethods(raw: unknown): PlanPaymentMethod[] {
  const arr = Array.isArray(raw) ? (raw as any[]) : [];
  return PAYMENT_METHODS.map((m) => {
    const found = arr.find((x) => x?.code === m.code);
    return {
      code: m.code,
      enabled: Boolean(found?.enabled),
      gateway: (found?.gateway as GatewayCode) ?? "manual",
      config: (found?.config as PaymentMethodConfig) ?? {},
    };
  });
}

export function defaultPlanRules(): PlanRules {
  return {
    allow_prepay: true,
    auto_renew: true,
    auto_generate_invoice: true,
    allow_default: true,
    block_after_days: null,
    suspend_checkin: false,
    suspend_checkin_days: null,
    requires_enrollment_fee: false,
    billing_advance_days: DEFAULT_BILLING_ADVANCE_DAYS,

  };
}
