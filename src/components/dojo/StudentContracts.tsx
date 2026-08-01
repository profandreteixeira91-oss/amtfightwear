import { useMemo, useState } from "react";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/dojo/RichTextEditor";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Eye, Printer, Trash2, Save, X, CheckCircle2 } from "lucide-react";
import {
  listStudentContracts,
  saveStudentContract,
  deleteStudentContract,
  listContractTemplates,
  getMyAcademyForContract,
} from "@/lib/dojo/contracts.functions";
import { buildContractValues, resolveContractHtml } from "@/lib/dojo/contracts-variables";
import { openBrandedPrintDocument } from "@/lib/dojo/print-document";
import { useDojoBranding } from "@/hooks/useDojoBranding";

type Props = { studentId: string; student: any };

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  signed: "Assinado",
  cancelled: "Cancelado",
};

export function StudentContracts({ studentId, student }: Props) {
  const qc = useQueryClient();
  const branding = useDojoBranding();

  const listFn = useServerFn(listStudentContracts);
  const templatesFn = useServerFn(listContractTemplates);
  const saveFn = useServerFn(saveStudentContract);
  const delFn = useServerFn(deleteStudentContract);
  const academyFn = useServerFn(getMyAcademyForContract);

  const list = useQuery({ queryKey: ["student-contracts", studentId], queryFn: () => listFn({ data: { student_id: studentId } }) });
  const templates = useQuery({ queryKey: ["contract-templates"], queryFn: () => templatesFn() });
  const academy = useQuery({ queryKey: ["contract-academy-profile"], queryFn: () => academyFn() });

  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [current, setCurrent] = useState<any | null>(null);
  const [newFromTemplate, setNewFromTemplate] = useState<string>("");

  const openNew = () => {
    setCurrent({
      student_id: studentId,
      title: "Contrato de prestação de serviços",
      content: "",
      status: "draft",
    });
    setNewFromTemplate("");
    setOpen(true);
  };

  const applyTemplate = (tplId: string) => {
    setNewFromTemplate(tplId);
    const tpl = (templates.data ?? []).find((t: any) => t.id === tplId);
    if (!tpl) {
      toast.error("Modelo não encontrado");
      return;
    }
    const header = tpl.header_html ? `<div data-tpl-header>${tpl.header_html}</div>` : "";
    const footer = tpl.footer_html ? `<div data-tpl-footer style="margin-top:24px;">${tpl.footer_html}</div>` : "";
    const merged = `${header}${tpl.content ?? ""}${footer}`;
    setCurrent((c: any) => ({
      ...(c ?? { student_id: studentId, status: "draft" }),
      template_id: tpl.id,
      title: (c?.title && c.title.trim()) ? c.title : tpl.name,
      content: merged,
    }));
    toast.success(`Modelo "${tpl.name}" aplicado`);
  };

  const openEdit = (row: any) => {
    setCurrent({ ...row });
    setNewFromTemplate(row.template_id ?? "");
    setOpen(true);
  };

  const openPreview = (row: any) => {
    setCurrent(row);
    setPreviewOpen(true);
  };

  const save = async () => {
    if (!current?.title?.trim()) { toast.error("Informe o título"); return; }
    try {
      await saveFn({
        data: {
          id: current.id,
          student_id: studentId,
          template_id: current.template_id ?? null,
          title: current.title,
          content: current.content ?? "",
          status: current.status ?? "draft",
          signed_at: current.signed_at ?? null,
          plan_name: current.plan_name ?? null,
          monthly_value: current.monthly_value != null && current.monthly_value !== "" ? Number(current.monthly_value) : null,
          payment_method: current.payment_method ?? null,
          due_day: current.due_day != null && current.due_day !== "" ? Number(current.due_day) : null,
          start_date: current.start_date || null,
          end_date: current.end_date || null,
        },
      });
      toast.success("Contrato salvo");
      qc.invalidateQueries({ queryKey: ["student-contracts", studentId] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Excluir contrato "${row.title}"?`)) return;
    try {
      await delFn({ data: { id: row.id } });
      toast.success("Contrato excluído");
      qc.invalidateQueries({ queryKey: ["student-contracts", studentId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const markSigned = async (row: any) => {
    try {
      await saveFn({
        data: {
          id: row.id,
          student_id: studentId,
          template_id: row.template_id ?? null,
          title: row.title,
          content: row.content,
          status: "signed",
          signed_at: new Date().toISOString(),
        },
      });
      toast.success("Marcado como assinado");
      qc.invalidateQueries({ queryKey: ["student-contracts", studentId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const values = useMemo(() => {
    return buildContractValues({
      student,
      academy: academy.data,
      contract: current,
    });
  }, [student, academy.data, current]);

  const previewHtml = current ? resolveContractHtml(current.content ?? "", values) : "";

  const printContract = (row: any) => {
    const html = resolveContractHtml(row.content ?? "", buildContractValues({
      student, academy: academy.data, contract: row,
    }));
    openBrandedPrintDocument({
      branding: branding.data as any,
      title: row.title,
      subtitle: student?.full_name ?? "",
      bodyHtml: `<div style="font-family:Georgia,serif;font-size:12pt;line-height:1.6;">${html}</div>`,
      footerLeft: `Contrato nº ${String(row.id).slice(0, 8).toUpperCase()}`,
      footerRight: (academy.data as any)?.trade_name ?? "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Contratos vinculados a este aluno. Cada um pode ser gerado a partir de um modelo.
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo contrato</Button>
      </div>

      {list.isLoading ? (
        <div className="rounded border p-6 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (list.data ?? []).length === 0 ? (
        <div className="rounded border border-dashed p-8 text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Nenhum contrato para este aluno.</div>
          <Button size="sm" variant="outline" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Criar contrato</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-2 text-left">Título</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Criado</th>
                <th className="p-2 text-left">Assinado</th>
                <th className="p-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((row: any) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="p-2 font-medium">{row.title}</td>
                  <td className="p-2">
                    <Badge variant={row.status === "signed" ? "default" : "outline"}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-muted-foreground">{new Date(row.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-2 text-muted-foreground">{row.signed_at ? new Date(row.signed_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="outline" onClick={() => openPreview(row)} title="Visualizar" aria-label="Visualizar"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" onClick={() => printContract(row)} title="Imprimir" aria-label="Imprimir"><Printer className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(row)} title="Editar" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                      {row.status !== "signed" && (
                        <Button size="icon" variant="ghost" onClick={() => markSigned(row)} title="Marcar como assinado" aria-label="Marcar como assinado"><CheckCircle2 className="h-4 w-4" /></Button>
                      )}
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(row)} title="Excluir" aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!max-w-none w-screen h-screen max-h-screen rounded-none border-0 p-0 gap-0 overflow-hidden flex flex-col z-[80] left-0 top-0 translate-x-0 translate-y-0 sm:rounded-none">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {current?.id ? "Editar contrato" : "Novo contrato"}
              </DialogTitle>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Título</label>
                <Input value={current?.title ?? ""} onChange={(e) => setCurrent({ ...current, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={current?.status ?? "draft"} onValueChange={(v) => setCurrent({ ...current, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="signed">Assinado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Aplicar modelo</label>
                <Select value={newFromTemplate || undefined} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder={templates.isLoading ? "Carregando modelos..." : "Selecionar modelo..."} />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {(templates.data ?? []).length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground">Nenhum modelo cadastrado</div>
                    ) : (templates.data ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-md border p-3 bg-muted/20">
              <div className="col-span-2 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Plano contratado</label>
                <Input value={current?.plan_name ?? ""} onChange={(e) => setCurrent({ ...current, plan_name: e.target.value })} placeholder="Ex.: Mensal Ilimitado" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Valor mensal (R$)</label>
                <Input type="number" step="0.01" min="0" value={current?.monthly_value ?? ""} onChange={(e) => setCurrent({ ...current, monthly_value: e.target.value })} placeholder="199,90" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Dia venc.</label>
                <Input type="number" min="1" max="31" value={current?.due_day ?? ""} onChange={(e) => setCurrent({ ...current, due_day: e.target.value })} placeholder="10" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
                <Select value={current?.payment_method ?? ""} onValueChange={(v) => setCurrent({ ...current, payment_method: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                    <SelectItem value="Débito automático">Débito automático</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Início</label>
                <Input type="date" value={current?.start_date ?? ""} onChange={(e) => setCurrent({ ...current, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Término</label>
                <Input type="date" value={current?.end_date ?? ""} onChange={(e) => setCurrent({ ...current, end_date: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-5 text-[11px] text-muted-foreground">
                Estes campos preenchem automaticamente as variáveis <code>{"{{contrato_plano}}"}</code>, <code>{"{{contrato_valor}}"}</code>, <code>{"{{contrato_dia_vencimento}}"}</code>, <code>{"{{contrato_forma_pagamento}}"}</code>, <code>{"{{contrato_inicio}}"}</code> e <code>{"{{contrato_fim}}"}</code>.
              </div>
            </div>
            <RichTextEditor
              value={current?.content ?? ""}
              onChange={(html) => setCurrent((c: any) => ({ ...c, content: html }))}
              placeholder="Escreva o conteúdo ou aplique um modelo acima."
            />
          </div>
          <DialogFooter className="px-6 py-3 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}><Save className="h-4 w-4 mr-1" />Salvar contrato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                {current?.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => current && printContract(current)}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
                <button onClick={() => setPreviewOpen(false)} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 bg-muted/20">
            <div
              className="bg-white text-black shadow-lg mx-auto max-w-3xl p-12 prose prose-sm max-w-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg"
              style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
