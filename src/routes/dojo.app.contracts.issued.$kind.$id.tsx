import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Printer, CheckCircle2, XCircle, Clock, FileText, Send, RotateCcw,
} from "lucide-react";
import {
  getIssuedContract, listContractEvents, updateContractStatus,
  CONTRACT_STATUS_LABELS,
} from "@/lib/dojo/contracts.functions";
import { openBrandedPrintDocument } from "@/lib/dojo/print-document";
import { useDojoBranding } from "@/hooks/useDojoBranding";

export const Route = createFileRoute("/dojo/app/contracts/issued/$kind/$id")({
  head: () => ({
    meta: [
      { title: "Contrato — Central de Contratos" },
      { name: "description", content: "Detalhes do contrato emitido, histórico e ações." },
    ],
  }),
  component: IssuedContractDetail,
});

const EVENT_LABEL: Record<string, string> = {
  created: "Contrato criado",
  updated: "Contrato atualizado",
  status_signed: "Assinatura registrada",
  status_sent: "Enviado ao destinatário",
  status_cancelled: "Contrato cancelado",
  status_refused: "Assinatura recusada",
  status_pending_signature: "Aguardando assinatura",
  status_issued: "Emitido",
  status_expired: "Marcado como expirado",
  status_terminated: "Contrato rescindido",
  status_completed: "Marcado como concluído",
  downloaded: "PDF baixado",
  printed: "Contrato impresso",
};

function IssuedContractDetail() {
  const { kind, id } = Route.useParams();
  const qc = useQueryClient();
  const branding = useDojoBranding();

  const detailFn = useServerFn(getIssuedContract);
  const eventsFn = useServerFn(listContractEvents);
  const statusFn = useServerFn(updateContractStatus);

  const detail = useQuery({
    queryKey: ["issued-contract", kind, id],
    queryFn: () => detailFn({ data: { kind: kind as any, id } }),
  });
  const events = useQuery({
    queryKey: ["contract-events", kind, id],
    queryFn: () => eventsFn({ data: { kind: kind as any, contract_id: id } }),
  });

  const contract = (detail.data as any)?.contract;
  const currentStatus = contract?.status ?? contract?.signature_status ?? "draft";

  const target = useMemo(() => {
    if (!contract) return null;
    if (kind === "student") return contract.dojo_students;
    if (kind === "team") return contract.dojo_team_members;
    return contract.dojo_affiliates;
  }, [contract, kind]);

  const doPrint = () => {
    if (!contract) return;
    openBrandedPrintDocument({
      branding: branding.data as any,
      title: contract.title,
      subtitle: contract.contract_number ? `Contrato nº ${contract.contract_number}` : undefined,
      bodyHtml: `<div style="font-family:Georgia,serif;font-size:12pt;line-height:1.6;">${contract.content ?? ""}</div>`,
      headerHtml: (contract.header_html ?? "").trim() || undefined,
      footerHtml: (contract.footer_html ?? "").trim() || undefined,
      showPageNumbers: contract.show_page_numbers ?? true,
      pageSize: contract.page_size ?? "A4",
      orientation: contract.page_orientation ?? "portrait",
      marginMm: contract.margin_mm ?? 18,
    });
  };

  const changeStatus = async (status: string) => {
    try {
      await statusFn({ data: { id, kind: kind as any, status } });
      toast.success(`Status alterado para ${CONTRACT_STATUS_LABELS[status] ?? status}`);
      qc.invalidateQueries({ queryKey: ["issued-contract", kind, id] });
      qc.invalidateQueries({ queryKey: ["contract-events", kind, id] });
      qc.invalidateQueries({ queryKey: ["issued-contracts"] });
      qc.invalidateQueries({ queryKey: ["contracts-stats"] });
    } catch (e: any) { toast.error(e.message); }
  };

  if (detail.isLoading) {
    return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>;
  }
  if (!contract) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Contrato não encontrado.</div>
          <Link to="/dojo/app/contracts/issued"><Button variant="outline" size="sm">Voltar</Button></Link>
        </CardContent>
      </Card>
    );
  }

  const targetName = kind === "student" ? target?.full_name : (target?.trade_name ?? target?.legal_name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/dojo/app/contracts/issued">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={currentStatus} onValueChange={changeStatus}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => changeStatus("sent")}><Send className="h-4 w-4 mr-1" />Marcar como enviado</Button>
          <Button variant="outline" size="sm" onClick={() => changeStatus("signed")}><CheckCircle2 className="h-4 w-4 mr-1" />Registrar assinatura</Button>
          <Button variant="outline" size="sm" onClick={doPrint}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{contract.title}</CardTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    {contract.contract_number ? <span className="font-mono">{contract.contract_number}</span> : "Sem numeração"}
                    {" · "}
                    <span>{kind === "student" ? "Contrato de aluno" : "Contrato de filial"}</span>
                    {" · "}
                    <span>{new Date(contract.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <Badge>{CONTRACT_STATUS_LABELS[currentStatus] ?? currentStatus}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg bg-white text-black rounded-md border p-6"
                style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: contract.content ?? "" }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Destinatário</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="font-medium">{targetName ?? "—"}</div>
              {kind === "student" || kind === "team" ? (
                <>
                  {target?.email ? <div className="text-xs text-muted-foreground">{target.email}</div> : null}
                  {target?.phone ? <div className="text-xs text-muted-foreground">{target.phone}</div> : null}
                  {target?.cpf ? <div className="text-xs text-muted-foreground">CPF: {target.cpf}</div> : null}
                  {kind === "team" && target?.role ? <div className="text-xs text-muted-foreground">Cargo: {target.role}</div> : null}
                </>
              ) : (
                <>
                  {target?.cnpj ? <div className="text-xs text-muted-foreground">CNPJ: {target.cnpj}</div> : null}
                  {target?.city ? <div className="text-xs text-muted-foreground">{target.city}/{target.state}</div> : null}
                </>
              )}
              {kind === "student" && target?.id ? (
                <Link to="/dojo/app/students/$id" params={{ id: target.id }} className="text-xs text-primary hover:underline">
                  Abrir ficha do aluno →
                </Link>
              ) : null}
              {kind === "team" && target?.id ? (
                <Link to="/dojo/app/team/$id" params={{ id: target.id }} className="text-xs text-primary hover:underline">
                  Abrir ficha do colaborador →
                </Link>
              ) : null}
              {kind === "affiliate" && target?.id ? (
                <Link to="/dojo/app/units/affiliates/$id" params={{ id: target.id }} className="text-xs text-primary hover:underline">
                  Abrir filial →
                </Link>
              ) : null}
            </CardContent>
          </Card>

          {kind === "student" && (contract.plan_name || contract.monthly_value) ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Financeiro</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                {contract.plan_name ? <div>Plano: <span className="font-medium">{contract.plan_name}</span></div> : null}
                {contract.monthly_value ? <div>Valor: <span className="font-medium">{Number(contract.monthly_value).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span></div> : null}
                {contract.payment_method ? <div>Pagamento: <span className="font-medium capitalize">{contract.payment_method}</span></div> : null}
                {contract.due_day ? <div>Vencimento: dia <span className="font-medium">{contract.due_day}</span></div> : null}
                {contract.start_date ? <div>Início: <span className="font-medium">{new Date(contract.start_date).toLocaleDateString("pt-BR")}</span></div> : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Timeline</CardTitle></CardHeader>
            <CardContent className="p-0">
              {(events.data ?? []).length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">Nenhum evento registrado.</div>
              ) : (
                <ol className="relative border-l border-border ml-4 py-2">
                  {(events.data ?? []).map((e: any) => (
                    <li key={e.id} className="ml-4 py-2">
                      <span className={`absolute -left-1.5 h-3 w-3 rounded-full ${
                        e.event_type.includes("signed") ? "bg-emerald-500"
                          : e.event_type.includes("cancelled") || e.event_type.includes("refused") ? "bg-red-500"
                          : e.event_type.includes("sent") ? "bg-cyan-500"
                          : "bg-primary"
                      }`} />
                      <div className="text-xs font-medium">{EVENT_LABEL[e.event_type] ?? e.event_type}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</div>
                      {e.note ? <div className="text-xs mt-1">{e.note}</div> : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => changeStatus("cancelled")}>
          <XCircle className="h-4 w-4 mr-1" />Cancelar contrato
        </Button>
        <Button variant="ghost" size="sm" onClick={() => changeStatus("terminated")}>
          <RotateCcw className="h-4 w-4 mr-1" />Registrar rescisão
        </Button>
      </div>
    </div>
  );
}
