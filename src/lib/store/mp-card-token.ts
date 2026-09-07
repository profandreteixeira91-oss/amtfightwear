/**
 * Tokenização de cartão da LOJA no navegador (SDK oficial MercadoPago.js v2).
 *
 * Motivo: o Mercado Pago recusa cobranças com `payment_method_id` adivinhado
 * por regex de BIN (`bin_not_found`, HTTP 400). O SDK resolve a bandeira e o
 * emissor reais a partir do BIN e devolve um token de uso único — nenhum dado
 * de cartão trafega pelo nosso servidor.
 *
 * Usado apenas pelo checkout da loja (varejo e atacado). Não afeta o AMT Pay
 * do Dojo Manager, que possui componente próprio.
 */

type MpInstance = {
  createCardToken: (data: Record<string, unknown>) => Promise<{ id?: string; error?: { message?: string } }>;
  getPaymentMethods: (data: { bin: string }) => Promise<{
    results?: Array<{ id?: string; issuer?: { id?: number | string } }>;
  }>;
};

type MpCtor = new (publicKey: string, opts?: { locale?: string }) => MpInstance;

function mpCtor(): MpCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { MercadoPago?: MpCtor }).MercadoPago;
}

export type StoreCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  /** CPF/CNPJ do titular (obrigatório pelo Mercado Pago). */
  document: string;
};

export type StoreCardToken = {
  cardToken: string;
  paymentMethodId: string;
  issuerId: string | null;
  last4: string;
  /** Primeiros 6 dígitos — reserva para o servidor quando o SDK não resolve a bandeira. */
  bin: string;
};

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (mpCtor()) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar o ambiente seguro do Mercado Pago"));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

function digits(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

let mpCache: { key: string; instance: MpInstance } | null = null;

async function getMp(publicKey: string): Promise<MpInstance> {
  await loadSdk();
  const Ctor = mpCtor();
  if (!Ctor) throw new Error("Ambiente seguro do Mercado Pago indisponível");
  if (mpCache?.key === publicKey) return mpCache.instance;
  const instance = new Ctor(publicKey, { locale: "pt-BR" });
  mpCache = { key: publicKey, instance };
  return instance;
}

/** Cria o token do cartão e resolve bandeira/emissor reais pelo BIN. */
export async function tokenizeStoreCard(
  publicKey: string,
  card: StoreCardInput,
): Promise<StoreCardToken> {
  const number = digits(card.number);
  if (number.length < 13) throw new Error("Número do cartão inválido");
  const doc = digits(card.document);
  if (doc.length !== 11 && doc.length !== 14) {
    throw new Error("Informe o CPF do titular do cartão para pagar com cartão de crédito");
  }
  const year = card.expiryYear.length === 2 ? `20${digits(card.expiryYear)}` : digits(card.expiryYear);
  if (digits(card.expiryMonth).length < 1 || year.length !== 4) {
    throw new Error("Validade do cartão inválida");
  }

  const mp = await getMp(publicKey);

  const bin = number.slice(0, 6);
  let paymentMethodId = "";
  let issuerId: string | null = null;
  // Tenta 6 e 8 dígitos: o Mercado Pago reconhece parte dos emissores só no BIN estendido.
  for (const probe of [bin, number.slice(0, 8)]) {
    if (paymentMethodId) break;
    try {
      const methods = await mp.getPaymentMethods({ bin: probe });
      const results = methods?.results ?? [];
      const credit = results.find((r) => String(r.id ?? "") !== "" && r.payment_type_id === "credit_card");
      const hit = credit ?? results[0];
      if (hit?.id) paymentMethodId = String(hit.id);
      if (hit?.issuer?.id != null) issuerId = String(hit.issuer.id);
    } catch {
      /* segue para o fallback do servidor */
    }
  }


  const token = await mp.createCardToken({
    cardNumber: number,
    cardholderName: card.holderName.trim(),
    cardExpirationMonth: digits(card.expiryMonth).padStart(2, "0"),
    cardExpirationYear: year,
    securityCode: digits(card.ccv),
    identificationType: doc.length === 14 ? "CNPJ" : "CPF",
    identificationNumber: doc,
  });

  if (!token?.id) {
    throw new Error(token?.error?.message ?? "Não foi possível validar o cartão");
  }

  return {
    cardToken: token.id,
    paymentMethodId,
    issuerId,
    last4: number.slice(-4),
  };
}
