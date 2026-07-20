import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Landmark, ExternalLink } from "lucide-react";
import {
  getPrimaryBankAccount,
  getWalletBalance,
  requestWithdrawal,
  getWalletSettings,
  getGatewayCapabilities,
} from "@/lib/dojo/amtpay.functions";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function WithdrawDialog({
  open,
  onOpenChange,
  onNeedBankAccount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNeedBankAccount: () => void;
}) {
  const qc = useQueryClient();
  const getBank = useServerFn(getPrimaryBankAccount);
  const getBal = useServerFn(getWalletBalance);
  const getSettings = useServerFn(getWalletSettings);
  const getCaps = useServerFn(getGatewayCapabilities);
  const request = useServerFn(requestWithdrawal);

  const bankQ = useQuery({ queryKey: ["amtpay-bank"], queryFn: () => getBank(), enabled: open });
  const balQ = useQuery({ queryKey: ["amtpay-balance"], queryFn: () => getBal(), enabled: open });
  const settingsQ = useQuery({ queryKey: ["amtpay-settings"], queryFn: () => getSettings(), enabled: open });
  const capsQ = useQuery({ queryKey: ["amtpay-caps"], queryFn: () => getCaps(), enabled: open });

  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [useAltPix, setUseAltPix] = useState(false);
  const [altPix, setAltPix] = useState("");
  const [altPixType, setAltPixType] = useState<"cpf" | "cnpj" | "email" | "phone" | "random">("email");
  const [submitting, setSubmitting] = useState(false);

  const caps = capsQ.data;
  const available = balQ.data?.available ?? 0;
  const min = Number(settingsQ.data?.min_withdrawal_amount ?? 0);
  const hasBank = !!bankQ.data;
  const withdrawalsOk = caps?.withdrawals === true;

  async function submit() {
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSubmitting(true);
    try {
      await request({
        data: {
          amount: value,
          notes: notes || null,
          pix_key: useAltPix ? altPix : null,
          pix_key_type: useAltPix ? altPixType : null,
        },
      });
      toast.success("Solicitação de saque enviada ao gateway.");
      qc.invalidateQueries({ queryKey: ["amtpay-balance"] });
      qc.invalidateQueries({ queryKey: ["amtpay-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["amtpay-dashboard"] });
      qc.invalidateQueries({ queryKey: ["amtpay-tx"] });
      setAmount(""); setNotes(""); setAltPix(""); setUseAltPix(false);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar saque</DialogTitle>
        </DialogHeader>

        {caps && !withdrawalsOk ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">Saques indisponíveis via {caps.providerName}</div>
              <div className="text-muted-foreground mt-1">
                Este gateway não permite solicitar saques via API. Acesse o painel do gateway para transferir seu saldo.
              </div>
              {caps.dashboardUrl && (
                <Button size="sm" className="mt-3" asChild>
                  <a href={caps.dashboardUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir painel do {caps.providerName}
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : !hasBank && !useAltPix ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">Nenhuma conta bancária cadastrada.</div>
              <div className="text-muted-foreground mt-1">Cadastre uma conta ou informe uma chave PIX para receber o saque.</div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => { onOpenChange(false); onNeedBankAccount(); }}>
                  <Landmark className="h-4 w-4 mr-2" /> Cadastrar conta
                </Button>
                {caps?.withdrawals && (
                  <Button size="sm" variant="outline" onClick={() => setUseAltPix(true)}>
                    Usar chave PIX
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Saldo disponível no {caps?.providerName ?? "gateway"}</div>
              <div className="text-2xl font-semibold tracking-tight">{brl(available)}</div>
              {min > 0 && <div className="text-[11px] text-muted-foreground mt-1">Valor mínimo: {brl(min)}</div>}
            </div>

            <div>
              <Label>Valor do saque</Label>
              <Input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <div className="flex gap-2 mt-2 flex-wrap">
                {[0.25, 0.5, 1].map((p) => (
                  <Button key={p} type="button" variant="outline" size="sm"
                    onClick={() => setAmount((available * p).toFixed(2))}>
                    {p === 1 ? "Tudo" : `${p * 100}%`}
                  </Button>
                ))}
              </div>
            </div>

            {caps?.chooseWithdrawalPixKey && (
              <div className="rounded-lg border p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={useAltPix} onChange={(e) => setUseAltPix(e.target.checked)} />
                  Usar uma chave PIX diferente da conta cadastrada
                </label>
                {useAltPix && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={altPixType} onValueChange={(v: any) => setAltPixType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="random">Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Chave PIX</Label>
                      <Input value={altPix} onChange={(e) => setAltPix(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {!useAltPix && hasBank && (
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
                  <Landmark className="h-3.5 w-3.5" /> Destino
                </div>
                <div className="font-medium">{bankQ.data?.bank_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  Ag {bankQ.data?.branch ?? "—"} · Cc {bankQ.data?.account_number ?? "—"}-{bankQ.data?.account_digit ?? ""}
                </div>
                {bankQ.data?.pix_key && (
                  <div className="text-xs mt-1">
                    PIX ({bankQ.data.pix_key_type}): <span className="font-mono">{bankQ.data.pix_key}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">Titular: {bankQ.data?.holder_name}</div>
              </div>
            )}

            <div>
              <Label>Observações (opcional)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {withdrawalsOk && (hasBank || useAltPix) && (
            <Button onClick={submit} disabled={submitting}>{submitting ? "Enviando..." : "Solicitar saque"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

