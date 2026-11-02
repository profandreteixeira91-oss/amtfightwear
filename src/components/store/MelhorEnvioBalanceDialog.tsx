import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, QrCode, RefreshCw } from "lucide-react";
import { adminMelhorEnvioAddBalance } from "@/lib/store/shipping.functions";
import { qrToDataURL } from "@/lib/qrcode-lazy";
import { formatBRL } from "@/lib/store/cart-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Payment = { pix_code: string | null; qr_image: string | null; link: string | null };

/**
 * Adiciona saldo à carteira do Melhor Envio por Pix. O saldo paga as etiquetas;
 * depois de pagar, `onPaid` atualiza o saldo exibido.
 */
export function MelhorEnvioBalanceDialog({
  open,
  onOpenChange,
  suggested,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Valor inicial (ex.: o que falta para pagar a etiqueta). */
  suggested?: number;
  onPaid: () => void;
}): React.ReactNode {
  const addBalance = useServerFn(adminMelhorEnvioAddBalance);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPayment(null);
    setQr(null);
    setValue(suggested && suggested > 0 ? String(Math.ceil(suggested)) : "50");
  }, [open, suggested]);

  useEffect(() => {
    if (!payment) return;
    if (payment.qr_image) setQr(payment.qr_image);
    else if (payment.pix_code) qrToDataURL(payment.pix_code, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [payment]);

  const amount = Number(value.replace(",", "."));
  const generate = async () => {
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error("Informe um valor a partir de R$ 1,00.");
      return;
    }
    setBusy(true);
    try {
      setPayment(await addBalance({ data: { value: Math.round(amount * 100) / 100 } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o Pix.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar saldo no Melhor Envio</DialogTitle>
          <DialogDescription>O saldo da carteira paga as etiquetas de frete. O Pix cai na hora.</DialogDescription>
        </DialogHeader>

        {!payment ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="me-balance-value">Valor (R$)</Label>
              <Input
                id="me-balance-value"
                inputMode="decimal"
                value={value}
                disabled={busy}
                onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ""))}
              />
              {suggested && suggested > 0 ? (
                <p className="text-xs text-muted-foreground">Falta {formatBRL(suggested)} para pagar esta etiqueta.</p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button disabled={busy} onClick={generate}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Gerar Pix de {Number.isFinite(amount) && amount > 0 ? formatBRL(amount) : "—"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {qr ? <img src={qr} alt="QR Code Pix" className="mx-auto h-60 w-60 rounded-md border bg-white p-2" /> : null}
            {payment.pix_code ? (
              <div className="space-y-1.5">
                <Label>Pix copia e cola</Label>
                <div className="flex gap-2">
                  <Input readOnly value={payment.pix_code} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Copiar código Pix"
                    onClick={() => navigator.clipboard.writeText(payment.pix_code!).then(() => toast.success("Código Pix copiado"))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
            {payment.link ? (
              <Button variant="outline" className="w-full" asChild>
                <a href={payment.link} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir pagamento no Melhor Envio
                </a>
              </Button>
            ) : null}
            <Button
              className="w-full"
              onClick={() => {
                onPaid();
                onOpenChange(false);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Já paguei — atualizar saldo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
