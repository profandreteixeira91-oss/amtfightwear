import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, ShieldCheck, CheckCircle2, QrCode, CreditCard, FileText, Loader2, Download } from "lucide-react";
import { getPublicInvoice } from "@/lib/dojo/public-invoice.functions";
import {
  getInvoicePix,
  getInvoiceBoleto,
  payInvoiceWithCard,
  pollInvoiceStatus,
} from "@/lib/dojo/public-payment.functions";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function maskCpfCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
function maskCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatBoletoLine(line: string) {
  const d = line.replace(/\D/g, "");
  if (d.length !== 47) return line;
  return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
}

export function PayPageView({ invoiceId }: { invoiceId: string }) {
  const fetchInvoice = useServerFn(getPublicInvoice);
  const fetchPix = useServerFn(getInvoicePix);
  const fetchBoleto = useServerFn(getInvoiceBoleto);
  const chargeCard = useServerFn(payInvoiceWithCard);
  const pollStatus = useServerFn(pollInvoiceStatus);

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: Awaited<ReturnType<typeof getPublicInvoice>> }
  >({ status: "loading" });
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchInvoice({ data: { invoiceId } });
        if (!alive) return;
        setState({ status: "ready", data });
        if (data.invoice.status === "paid" || data.invoice.paid_at) setPaid(true);
      } catch (e: any) {
        if (alive) setState({ status: "error", message: e?.message ?? "Erro ao carregar cobrança" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [invoiceId, fetchInvoice]);

  // Poll status a cada 6s enquanto não pago
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (paid || state.status !== "ready") return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await pollStatus({ data: { invoiceId } });
        if (!alive) return;
        if (r.status === "paid") setPaid(true);
      } catch {
        /* ignore */
      }
    };
    pollRef.current = window.setInterval(tick, 6000) as unknown as number;
    return () => {
      alive = false;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [paid, state.status, invoiceId, pollStatus]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Carregando cobrança…</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Não foi possível abrir a cobrança</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invoice, identity } = state.data;
  const isCanceled = invoice.status === "canceled";
  const isPaid = paid || invoice.status === "paid" || !!invoice.paid_at;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3 pb-2">
          {identity.logoUrl ? (
            <img
              src={identity.logoUrl}
              alt={identity.name}
              className="h-14 w-14 rounded-lg object-cover border bg-white"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {identity.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Cobrança emitida por</p>
            <h1 className="text-xl font-semibold leading-tight">{identity.name}</h1>
            {identity.document ? (
              <p className="text-xs text-muted-foreground">{identity.document}</p>
            ) : null}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Detalhes da cobrança</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Vencimento {new Date(invoice.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              {isPaid ? (
                <Badge className="bg-green-600 hover:bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Pago
                </Badge>
              ) : isCanceled ? (
                <Badge variant="destructive">Cancelada</Badge>
              ) : (
                <Badge variant="secondary">Aguardando pagamento</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {invoice.description || "Cobrança"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Valor total</span>
              <span className="text-3xl font-bold">{brl(invoice.amount)}</span>
            </div>

            {isPaid ? (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-4 text-center space-y-1">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Pagamento confirmado
                </p>
                <p className="text-xs text-muted-foreground">
                  Obrigado! Você já pode fechar esta página.
                </p>
              </div>
            ) : isCanceled ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Esta cobrança foi cancelada. Entre em contato com {identity.name}.
              </div>
            ) : !state.data.payment.anyOnline ? (
              <OfflineOnlyPanel
                identityName={identity.name}
                phone={identity.phone}
                email={identity.email}
                amtPayActive={state.data.payment.amtPayActive}
                offlineMethods={state.data.payment.offlineMethods}
              />
            ) : (
              <PaymentTabs
                invoiceId={invoiceId}
                amount={invoice.amount}
                dueDate={invoice.due_date}
                initialPix={{
                  qr: invoice.pix_qrcode ?? null,
                  copypaste: invoice.pix_copypaste ?? null,
                }}
                fetchPix={fetchPix}
                fetchBoleto={fetchBoleto}
                chargeCard={chargeCard}
                onPaid={() => setPaid(true)}
                allowPix={state.data.payment.allowPix}
                allowCard={state.data.payment.allowCard}
                allowBoleto={state.data.payment.allowBoleto}
                offlineMethods={state.data.payment.offlineMethods}
              />
            )}
          </CardContent>
        </Card>

        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Pagamento processado com segurança
          </p>
          {identity.phone || identity.email ? (
            <p className="text-xs text-muted-foreground">
              Dúvidas? Fale com {identity.name}
              {identity.phone ? ` • ${identity.phone}` : ""}
              {identity.email ? ` • ${identity.email}` : ""}
            </p>
          ) : null}
          {identity.footerNote ? (
            <p className="text-xs text-muted-foreground">{identity.footerNote}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------- Tabs ----------------
type TabsProps = {
  invoiceId: string;
  amount: number;
  dueDate: string;
  initialPix: { qr: string | null; copypaste: string | null };
  fetchPix: ReturnType<typeof useServerFn<typeof getInvoicePix>>;
  fetchBoleto: ReturnType<typeof useServerFn<typeof getInvoiceBoleto>>;
  chargeCard: ReturnType<typeof useServerFn<typeof payInvoiceWithCard>>;
  onPaid: () => void;
  allowPix?: boolean;
  allowCard?: boolean;
  allowBoleto?: boolean;
  offlineMethods?: Array<{ code: string; label: string }>;
};

function PaymentTabs(props: TabsProps) {
  const allowPix = props.allowPix ?? true;
  const allowCard = props.allowCard ?? true;
  const allowBoleto = props.allowBoleto ?? true;
  const tabs: Array<{ key: string; label: string; icon: any; render: () => React.ReactElement }> = [];
  if (allowPix) tabs.push({ key: "pix", label: "Pix", icon: QrCode, render: () => <PixPanel {...props} /> });
  if (allowCard) tabs.push({ key: "card", label: "Cartão", icon: CreditCard, render: () => <CardPanel {...props} /> });
  if (allowBoleto) tabs.push({ key: "boleto", label: "Boleto", icon: FileText, render: () => <BoletoPanel {...props} /> });
  if (tabs.length === 0) return null;

  return (
    <div className="space-y-3">
      <Tabs defaultValue={tabs[0].key} className="w-full">
        <TabsList
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.key} value={t.key}>
                <Icon className="h-4 w-4 mr-1" /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {t.render()}
          </TabsContent>
        ))}
      </Tabs>
      {props.offlineMethods && props.offlineMethods.length > 0 ? (
        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Também aceitamos presencialmente:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {props.offlineMethods.map((m) => (
              <li key={m.code}>{m.label}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function OfflineOnlyPanel({
  identityName,
  phone,
  email,
  amtPayActive,
  offlineMethods,
}: {
  identityName: string;
  phone?: string | null;
  email?: string | null;
  amtPayActive: boolean;
  offlineMethods: Array<{ code: string; label: string }>;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
          Pagamento online indisponível
        </p>
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {amtPayActive
            ? `${identityName} não habilitou formas de pagamento online para esta cobrança.`
            : `${identityName} ainda não ativou o AMT Pay. O pagamento online desta cobrança não está disponível no momento.`}
        </p>
      </div>
      {offlineMethods.length > 0 ? (
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">Formas de pagamento aceitas</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {offlineMethods.map((m) => (
              <li key={m.code}>{m.label}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {phone || email ? (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Combine o pagamento diretamente:</p>
          {phone ? <p>Telefone/WhatsApp: {phone}</p> : null}
          {email ? <p>E-mail: {email}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------- Pix ----------------
function PixPanel({ invoiceId, initialPix, fetchPix }: TabsProps) {
  const [qr, setQr] = useState<string | null>(initialPix.qr);
  const [copy, setCopy] = useState<string | null>(initialPix.copypaste);
  const [loading, setLoading] = useState(!initialPix.qr);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetchPix({ data: { invoiceId } });
        if (!alive) return;
        if (!("paid" in r) || r.paid) return;
        setQr(r.qr);
        setCopy(r.copypaste);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Não foi possível gerar o Pix");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const doCopy = async () => {
    if (!copy) return;
    await navigator.clipboard.writeText(copy);
    toast.success("Código Pix copiado!");
  };

  if (loading && !qr) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">Gerando QR Code Pix…</p>
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive text-center py-4">{error}</p>;
  if (!qr || !copy) return null;

  const src = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="rounded-xl border-4 border-primary/10 bg-white p-3 shadow-sm">
          <img src={src} alt="QR Code Pix" className="h-56 w-56 object-contain" />
        </div>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium">Escaneie com o app do seu banco</p>
        <p className="text-xs text-muted-foreground">
          Ou copie o código Pix e cole no seu banco
        </p>
      </div>
      <div className="rounded-lg border p-3 space-y-2">
        <Label className="text-xs">Pix Copia e Cola</Label>
        <div className="flex gap-2">
          <input
            readOnly
            value={copy}
            className="flex-1 rounded-md border bg-muted/40 px-2 py-2 text-xs font-mono truncate"
          />
          <Button size="sm" onClick={doCopy}>
            <Copy className="h-3 w-3 mr-1" /> Copiar
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-center text-muted-foreground">
        A confirmação é automática assim que o pagamento cair.
      </p>
    </div>
  );
}

// ---------------- Boleto ----------------
function BoletoPanel({ invoiceId, fetchBoleto }: TabsProps) {
  const [data, setData] = useState<{
    bankSlipUrl: string | null;
    identificationField: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetchBoleto({ data: { invoiceId } });
        if (!alive) return;
        if (!("paid" in r) || r.paid) return;
        setData({
          bankSlipUrl: r.bankSlipUrl ?? null,
          identificationField: r.identificationField ?? null,
        });
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Não foi possível gerar o boleto");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const doCopy = async () => {
    if (!data?.identificationField) return;
    await navigator.clipboard.writeText(data.identificationField.replace(/\D/g, ""));
    toast.success("Linha digitável copiada!");
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">Gerando boleto…</p>
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive text-center py-4">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.identificationField ? (
        <div className="rounded-lg border p-3 space-y-2">
          <Label className="text-xs">Linha digitável</Label>
          <div className="flex gap-2">
            <input
              readOnly
              value={formatBoletoLine(data.identificationField)}
              className="flex-1 rounded-md border bg-muted/40 px-2 py-2 text-xs font-mono"
            />
            <Button size="sm" onClick={doCopy}>
              <Copy className="h-3 w-3 mr-1" /> Copiar
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          Linha digitável ficará disponível após o boleto ser registrado (alguns minutos).
        </p>
      )}
      {data.bankSlipUrl ? (
        <a href={data.bankSlipUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" /> Baixar boleto (PDF)
          </Button>
        </a>
      ) : null}
      <p className="text-[11px] text-center text-muted-foreground">
        Boletos podem levar até 1 dia útil para compensar após o pagamento.
      </p>
    </div>
  );
}

// ---------------- Cartão ----------------
function CardPanel({ invoiceId, amount, chargeCard, onPaid }: TabsProps) {
  const [form, setForm] = useState({
    holderName: "",
    number: "",
    expiry: "",
    ccv: "",
    // holder info
    name: "",
    email: "",
    cpfCnpj: "",
    postalCode: "",
    addressNumber: "",
    addressComplement: "",
    mobilePhone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit = useMemo(() => {
    const numOk = form.number.replace(/\D/g, "").length >= 13;
    const expiryOk = /^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(form.expiry.trim());
    const ccvOk = /^\d{3,4}$/.test(form.ccv.trim());
    const cpfOk = /^\d{11}$|^\d{14}$/.test(form.cpfCnpj.replace(/\D/g, ""));
    const cepOk = /^\d{8}$/.test(form.postalCode.replace(/\D/g, ""));
    return (
      form.holderName.trim().length >= 2 &&
      numOk &&
      expiryOk &&
      ccvOk &&
      form.name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      cpfOk &&
      cepOk &&
      form.addressNumber.trim().length >= 1
    );
  }, [form]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const [mm, yyRaw] = form.expiry.split("/").map((s) => s.trim());
      const yyyy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
      const r = await chargeCard({
        data: {
          invoiceId,
          holderName: form.holderName,
          number: form.number.replace(/\s/g, ""),
          expiryMonth: mm,
          expiryYear: yyyy,
          ccv: form.ccv,
          holderInfo: {
            name: form.name,
            email: form.email,
            cpfCnpj: form.cpfCnpj,
            postalCode: form.postalCode,
            addressNumber: form.addressNumber,
            addressComplement: form.addressComplement || undefined,
            mobilePhone: form.mobilePhone || undefined,
          },
        },
      });
      if (r.paid) {
        toast.success("Pagamento aprovado!");
        onPaid();
      } else {
        setError(r.error || "Pagamento não aprovado. Verifique os dados ou tente outra forma.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Erro ao processar cartão");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5" />
        Ambiente seguro. Os dados do cartão não são armazenados.
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Dados do cartão</Label>
        <Input
          placeholder="Nome impresso no cartão"
          value={form.holderName}
          onChange={(e) =>
            setForm((f) => ({ ...f, holderName: e.target.value.toUpperCase() }))
          }
          maxLength={60}
        />
        <Input
          placeholder="Número do cartão"
          inputMode="numeric"
          value={form.number}
          onChange={(e) => setForm((f) => ({ ...f, number: maskCard(e.target.value) }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Validade MM/AA"
            inputMode="numeric"
            value={form.expiry}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 6);
              setForm((f) => ({
                ...f,
                expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d,
              }));
            }}
          />
          <Input
            placeholder="CVV"
            inputMode="numeric"
            value={form.ccv}
            onChange={(e) =>
              setForm((f) => ({ ...f, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Dados do titular (para emissão fiscal)</Label>
        <Input placeholder="Nome completo" value={form.name} onChange={set("name")} />
        <Input placeholder="E-mail" type="email" value={form.email} onChange={set("email")} />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="CPF/CNPJ"
            inputMode="numeric"
            value={form.cpfCnpj}
            onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: maskCpfCnpj(e.target.value) }))}
          />
          <Input
            placeholder="Celular"
            inputMode="tel"
            value={form.mobilePhone}
            onChange={(e) =>
              setForm((f) => ({ ...f, mobilePhone: e.target.value.replace(/\D/g, "").slice(0, 11) }))
            }
          />
        </div>
        <div className="grid grid-cols-[1fr_100px] gap-2">
          <Input
            placeholder="CEP"
            inputMode="numeric"
            value={form.postalCode}
            onChange={(e) => setForm((f) => ({ ...f, postalCode: maskCep(e.target.value) }))}
          />
          <Input
            placeholder="Número"
            value={form.addressNumber}
            onChange={set("addressNumber")}
          />
        </div>
        <Input
          placeholder="Complemento (opcional)"
          value={form.addressComplement}
          onChange={set("addressComplement")}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processando…
          </>
        ) : (
          <>Pagar {brl(amount)}</>
        )}
      </Button>
      <p className="text-[11px] text-center text-muted-foreground">
        Cobrança única. A aprovação é confirmada em segundos.
      </p>
    </form>
  );
}
