import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Save, Truck } from "lucide-react";
import { adminMelhorEnvioPrepare, adminMelhorEnvioSaveRecipient, adminMelhorEnvioAddToCart } from "@/lib/store/shipping.functions";
import { type ShippingRecipient } from "@/lib/store/shipping-preflight";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ShippingSelection = { id: number; name: string };
const fields: Array<{ key: keyof ShippingRecipient; label: string }> = [
  { key: "name", label: "Nome" }, { key: "email", label: "E-mail" }, { key: "phone", label: "Telefone" },
  { key: "document", label: "CPF/CNPJ" }, { key: "postal_code", label: "CEP" }, { key: "state_abbr", label: "UF" },
  { key: "address", label: "Rua" }, { key: "number", label: "Número" }, { key: "complement", label: "Complemento" },
  { key: "district", label: "Bairro" }, { key: "city", label: "Cidade" },
];

export function ShippingPreparationDialog({ orderId, selection, onClose, onChange }: { orderId: string; selection: ShippingSelection | null; onClose: () => void; onChange: () => void }): React.ReactNode {
  return <Dialog open={selection !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Revisar envio</DialogTitle><DialogDescription>{selection?.name}</DialogDescription></DialogHeader>
      {selection ? <PreparationForm key={`${orderId}-${selection.id}`} orderId={orderId} selection={selection} onClose={onClose} onChange={onChange} /> : null}
    </DialogContent>
  </Dialog>;
}

function PreparationForm({ orderId, selection, onClose, onChange }: { orderId: string; selection: ShippingSelection; onClose: () => void; onChange: () => void }): React.ReactNode {
  const prepare = useServerFn(adminMelhorEnvioPrepare);
  const save = useServerFn(adminMelhorEnvioSaveRecipient);
  const add = useServerFn(adminMelhorEnvioAddToCart);
  const query = useQuery({ queryKey: ["admin", "shipping", "prepare", orderId, selection.id], queryFn: () => prepare({ data: { order_id: orderId, service_id: selection.id } }), staleTime: 0 });
  const [draft, setDraft] = useState<ShippingRecipient | null>(null);
  const [agency, setAgency] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const recipient = draft ?? query.data?.recipient;
  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try { await action(); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir o envio."); } finally { setBusy(false); }
  };
  if (query.isPending) return <div role="status" className="flex items-center gap-2 py-8"><Loader2 className="h-4 w-4 animate-spin" /> Conferindo dados e exigências da transportadora…</div>;
  if (query.error || !query.data || !recipient) return <div className="space-y-3"><p role="alert" className="text-destructive">{query.error?.message || "Dados indisponíveis."}</p><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></div>;
  const data = query.data;
  return <div className="space-y-4">
    {data.issues.length > 0 ? <div role="alert" className="space-y-2 text-sm text-destructive"><ul className="list-inside list-disc">{data.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul><Button variant="link" asChild><Link to="/admin/envio">Configurar remetente e medidas</Link></Button></div> : <p className="text-sm text-muted-foreground">Dados do envio conferidos.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(({ key, label }) => <div key={key}><Label htmlFor={`recipient-${orderId}-${key}`}>{label}</Label><Input id={`recipient-${orderId}-${key}`} disabled={busy} value={recipient[key]} onChange={(event) => setDraft({ ...recipient, [key]: key === "state_abbr" ? event.target.value.toUpperCase() : event.target.value })} /></div>)}
    </div>
    {draft ? <Button variant="outline" disabled={busy} onClick={() => run(async () => { await save({ data: { order_id: orderId, recipient: draft } }); setDraft(null); await query.refetch(); onChange(); toast.success("Destinatário atualizado"); })}><Save className="mr-2 h-4 w-4" /> Salvar destinatário</Button> : null}
    {data.agency_required ? <div className="space-y-2"><Label>Agência de postagem obrigatória</Label><Select value={agency} onValueChange={setAgency} disabled={busy}><SelectTrigger className="h-auto min-h-10 [&>span]:whitespace-normal [&>span]:text-left"><SelectValue placeholder="Selecione onde vai postar o pacote" /></SelectTrigger><SelectContent>{data.agencies.map((a) => <SelectItem key={a.id} value={String(a.id)} className="whitespace-normal">{a.label}</SelectItem>)}</SelectContent></Select></div> : null}
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button>
      <Button disabled={busy || query.isFetching || draft !== null || data.issues.length > 0 || (data.agency_required && !agency)} onClick={() => run(async () => {
        await add({ data: { order_id: orderId, service_id: selection.id, service_name: selection.name, ...(agency ? { agency_id: Number(agency) } : {}) } });
        toast.success("Envio adicionado. O pagamento ainda não foi efetuado."); onChange(); onClose();
      })}><Truck className="mr-2 h-4 w-4" />{busy ? "Processando…" : "Adicionar envio ao carrinho"}</Button>
    </div>
  </div>;
}