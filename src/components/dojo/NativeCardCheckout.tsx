import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMpPublicKey,
  subscribeWithCardToken,
  PLAN_AMOUNT,
} from "@/lib/dojo/subscription.functions";

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

let mpSdkPromise: Promise<void> | null = null;
function loadMpSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  if (mpSdkPromise) return mpSdkPromise;
  mpSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar SDK do Mercado Pago"));
    document.head.appendChild(s);
  });
  return mpSdkPromise;
}

function onlyDigits(v: string) {
  return v.replace(/\D+/g, "");
}
function formatCardNumber(v: string) {
  return onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

interface Props {
  defaultEmail?: string;
  onSuccess?: () => void;
}

export function NativeCardCheckout({ defaultEmail, onSuccess }: Props) {
  const getKey = useServerFn(getMpPublicKey);
  const subscribe = useServerFn(subscribeWithCardToken);

  const mpRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [docType, setDocType] = useState("CPF");
  const [docNumber, setDocNumber] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await loadMpSdk();
        const { publicKey } = await getKey({});
        if (cancel) return;
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        setReady(true);
      } catch (e: any) {
        toast.error(e?.message ?? "Falha ao iniciar checkout");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [getKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !mpRef.current) return;
    const [mm, yy] = expiry.split("/");
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2) {
      toast.error("Validade do cartão inválida (MM/AA)");
      return;
    }
    if (!email) {
      toast.error("Informe o e-mail do titular");
      return;
    }
    setBusy(true);
    try {
      const token = await mpRef.current.createCardToken({
        cardNumber: onlyDigits(number),
        cardholderName: holder.trim(),
        cardExpirationMonth: mm,
        cardExpirationYear: `20${yy}`,
        securityCode: cvv,
        identificationType: docType,
        identificationNumber: onlyDigits(docNumber),
      });
      if (!token?.id) throw new Error(token?.error?.message ?? "Não foi possível validar o cartão");

      const res = await subscribe({ data: { cardTokenId: token.id, payerEmail: email } });
      if (res.status === "active") {
        toast.success("Assinatura ativada com sucesso!");
      } else {
        toast.success("Assinatura enviada — aguardando confirmação do Mercado Pago");
      }
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.cause?.[0]?.description ||
        (Array.isArray(err) ? err[0]?.message : null) ||
        "Falha ao processar pagamento";
      toast.error(String(msg));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <CreditCard className="h-4 w-4 text-red-600" /> Cartão de crédito
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-500">
            <Lock className="h-3 w-3" /> Pagamento seguro Mercado Pago
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="mp-num">Número do cartão</Label>
            <Input
              id="mp-num"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              value={number}
              onChange={(e) => setNumber(formatCardNumber(e.target.value))}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mp-hold">Nome impresso no cartão</Label>
            <Input
              id="mp-hold"
              autoComplete="cc-name"
              placeholder="Como aparece no cartão"
              value={holder}
              onChange={(e) => setHolder(e.target.value.toUpperCase())}
              required
            />
          </div>
          <div>
            <Label htmlFor="mp-exp">Validade (MM/AA)</Label>
            <Input
              id="mp-exp"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="mp-cvv">CVV</Label>
            <Input
              id="mp-cvv"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              value={cvv}
              onChange={(e) => setCvv(onlyDigits(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="mp-doct">Documento</Label>
            <select
              id="mp-doct"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </select>
          </div>
          <div>
            <Label htmlFor="mp-docn">Número do documento</Label>
            <Input
              id="mp-docn"
              inputMode="numeric"
              value={docNumber}
              onChange={(e) => setDocNumber(onlyDigits(e.target.value))}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mp-email">E-mail do titular</Label>
            <Input
              id="mp-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3 text-sm">
        <span className="text-neutral-600">Total mensal</span>
        <span className="text-lg font-bold text-neutral-900">
          R$ {PLAN_AMOUNT.toFixed(2).replace(".", ",")}
        </span>
      </div>

      <Button
        type="submit"
        disabled={!ready || busy}
        className="w-full bg-red-600 hover:bg-red-700"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…
          </>
        ) : (
          <>Assinar por R$ {PLAN_AMOUNT.toFixed(2).replace(".", ",")}/mês</>
        )}
      </Button>

      <p className="text-center text-[11px] text-neutral-500">
        Ao confirmar, você autoriza a cobrança mensal recorrente. Nenhum dado do cartão é
        armazenado no AMT Dojo Manager — a tokenização é feita direto pelo Mercado Pago.
      </p>
    </form>
  );
}
