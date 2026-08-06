import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, QrCode, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subscribeWithPix, PLAN_AMOUNT } from "@/lib/dojo/subscription.functions";

interface Props {
  defaultEmail?: string;
  onSuccess?: () => void;
}

export function NativePixCheckout({ defaultEmail, onSuccess }: Props) {
  const subscribePix = useServerFn(subscribeWithPix);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; ticketUrl: string } | null>(null); // Mantido por compatibilidade de tipo se necessário, mas não mais usado no fluxo principal
  const [copied, setCopied] = useState(false);

  async function handlePix(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }
    setBusy(true);
    try {
      const res = await subscribePix({ data: { payerEmail: email } });
      if (res.initPoint) {
        // Para Pix Automático (preapproval), o MP exige que o usuário autorize no site deles
        // pois não é um Pix comum, é uma autorização de débito recorrente.
        window.location.href = res.initPoint;
      } else {
        toast.error("URL de autorização indisponível");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao gerar Pix");
    } finally {
      setBusy(false);
    }
  }

  function copyToClipboard() {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (pixData) {
    return (
      <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <QrCode className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-neutral-900">Pague com PIX</h3>
          <p className="text-sm text-neutral-500">
            Escaneie o QR Code ou copie o código abaixo para finalizar sua assinatura de 
            <span className="font-semibold text-neutral-900"> R$ {PLAN_AMOUNT.toFixed(2).replace(".", ",")}</span>.
          </p>
        </div>

        <div className="mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-xl bg-white p-4 shadow-sm border ring-4 ring-emerald-50">
          {pixData.qrCodeBase64 ? (
            <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code Pix" className="h-full w-full" />
          ) : (
            <div className="text-xs text-neutral-400">QR Code indisponível</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Input 
              readOnly 
              value={pixData.qrCode} 
              className="pr-20 text-xs font-mono bg-neutral-50 border-neutral-200"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1.5">{copied ? "Copiado" : "Copiar"}</span>
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => window.open(pixData.ticketUrl, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Ver comprovante / Pagar no banco
            </Button>
            <p className="text-[10px] text-neutral-400">
              Sua assinatura será ativada automaticamente assim que o pagamento for confirmado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePix} className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <QrCode className="h-3 w-3" />
            </div>
            Pagamento via Pix Automático
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="pix-email">E-mail para confirmação</Label>
            <Input
              id="pix-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="rounded-md bg-emerald-50 p-3 text-[11px] text-emerald-800 border border-emerald-100">
            <strong>Pix Automático:</strong> Você será redirecionado para autorizar a recorrência. 
            O valor será cobrado automaticamente da sua conta Mercado Pago ou via QR Code mensal.
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
        disabled={busy}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando…
          </>
        ) : (
          <>Ativar Pix Automático</>
        )}
      </Button>
    </form>
  );
}
