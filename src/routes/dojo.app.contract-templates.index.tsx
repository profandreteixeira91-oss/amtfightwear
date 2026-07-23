import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Plus, Pencil, Trash2, Eye, Copy, Printer, X, Sparkles,
} from "lucide-react";
import {
  listContractTemplates,
  saveContractTemplate,
  deleteContractTemplate,
  getMyAcademyForContract,
} from "@/lib/dojo/contracts.functions";

import { buildContractValues, resolveContractHtml } from "@/lib/dojo/contracts-variables";
import { openBrandedPrintDocument } from "@/lib/dojo/print-document";
import { useDojoBranding } from "@/hooks/useDojoBranding";
import { DEFAULT_CONTRACT_PRESET } from "@/lib/dojo/contracts-presets";

export const Route = createFileRoute("/dojo/app/contract-templates")({
  head: () => ({
    meta: [
      { title: "Modelos de contrato — AMT Dojo Manager" },
      { name: "description", content: "Gerencie modelos de contrato do seu dojo com editor profissional e variáveis dinâmicas." },
    ],
  }),
  component: ContractTemplatesPage,
});

const DEFAULT_CONTENT = `<h1 style="text-align:center;">Contrato de Prestação de Serviços</h1>
<p style="text-align:center;"><strong>{{academia_nome}}</strong> — {{academia_cidade}}/{{academia_estado}}</p>
<hr />
<p><strong>CONTRATANTE:</strong> {{aluno_nome}}, CPF {{aluno_cpf}}, RG {{aluno_rg}}, residente em {{aluno_endereco}}, telefone {{aluno_telefone}}.</p>
<p><strong>RESPONSÁVEL (se menor):</strong> {{responsavel_nome}}, CPF {{responsavel_cpf}}, parentesco {{responsavel_parentesco}}.</p>
<p><strong>CONTRATADA:</strong> {{academia_nome}}, CNPJ {{academia_cnpj}}, com sede em {{academia_endereco}}.</p>
<h2>1. Objeto</h2>
<p>O presente contrato tem por objeto a prestação de serviços de treinamento em {{aluno_modalidade}} pela CONTRATADA à CONTRATANTE, mediante o plano <strong>{{contrato_plano}}</strong>.</p>
<h2>2. Valor e Pagamento</h2>
<p>A mensalidade é de <strong>{{contrato_valor}}</strong>, paga via {{contrato_forma_pagamento}} com vencimento todo dia {{contrato_dia_vencimento}}.</p>
<h2>3. Vigência</h2>
<p>Vigência de {{contrato_inicio}} a {{contrato_fim}}, renovando-se automaticamente salvo manifestação em contrário.</p>
<h2>4. Disposições Gerais</h2>
<p>A CONTRATANTE compromete-se a respeitar o regulamento interno e a etiqueta do dojo. Em caso de menor, o responsável assume integralmente as obrigações civis.</p>
<p style="margin-top:48px;">{{academia_cidade}}, {{contrato_data}}.</p>
<div style="display:flex; justify-content:space-between; margin-top:64px;">
  <div style="text-align:center; width:45%;">
    <div style="border-top:1px solid #000; padding-top:6px;">CONTRATANTE / Responsável</div>
  </div>
  <div style="text-align:center; width:45%;">
    <div style="border-top:1px solid #000; padding-top:6px;">CONTRATADA — {{academia_nome}}</div>
  </div>
</div>`;

function ContractTemplatesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const branding = useDojoBranding();

  const listFn = useServerFn(listContractTemplates);
  const saveFn = useServerFn(saveContractTemplate);
  const delFn = useServerFn(deleteContractTemplate);
  const academyFn = useServerFn(getMyAcademyForContract);

  const list = useQuery({ queryKey: ["contract-templates"], queryFn: () => listFn() });
  const academy = useQuery({ queryKey: ["dojo-academy-profile"], queryFn: () => academyFn() });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [current, setCurrent] = useState<any | null>(null);
  const [installing, setInstalling] = useState(false);

  const openNew = () => navigate({ to: "/dojo/app/contract-templates/$id", params: { id: "new" } });

  const installDefault = async () => {
    setInstalling(true);
    try {
      const saved: any = await saveFn({ data: { ...DEFAULT_CONTRACT_PRESET } });
      toast.success("Modelo padrão instalado");
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      if (saved?.id) navigate({ to: "/dojo/app/contract-templates/$id", params: { id: saved.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setInstalling(false);
    }
  };
  const openEdit = (row: any) => navigate({ to: "/dojo/app/contract-templates/$id", params: { id: row.id } });
  const openPreview = (row: any) => { setCurrent(row); setPreviewOpen(true); };

  const duplicate = async (row: any) => {
    try {
      await saveFn({ data: {
        name: `${row.name} (cópia)`, description: row.description, content: row.content,
        header_html: row.header_html, footer_html: row.footer_html,
        page_size: row.page_size, page_orientation: row.page_orientation,
        margin_mm: row.margin_mm, show_page_numbers: row.show_page_numbers,
      } });
      toast.success("Modelo duplicado");
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Excluir "${row.name}"?`)) return;
    try {
      await delFn({ data: { id: row.id } });
      toast.success("Modelo excluído");
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const previewValues = useMemo(() => {
    return buildContractValues({
      student: {
        full_name: "João da Silva (exemplo)",
        cpf: "000.000.000-00", rg: "00.000.000-0",
        address_street: "Rua Exemplo", address_number: "100",
        city: (academy.data as any)?.city ?? "Cidade",
        state: (academy.data as any)?.state ?? "UF",
        phone: "(00) 00000-0000",
        modality: "Jiu-Jitsu", current_belt_name: "Branca",
      },
      academy: academy.data,
      contract: {
        title: current?.name ?? "Contrato",
        value: 199.9, plan_name: "Mensal", payment_method: "PIX",
        due_day: 10, start_date: new Date().toISOString(),
      },
    });
  }, [current, academy.data]);

  const previewHtml = current ? resolveContractHtml(current.content ?? "", previewValues) : "";
  const previewHeader = current ? resolveContractHtml(current.header_html ?? "", previewValues) : "";
  const previewFooter = current ? resolveContractHtml(current.footer_html ?? "", previewValues) : "";

  const printPreview = () => {
    if (!current) return;
    openBrandedPrintDocument({
      branding: branding.data as any,
      title: current.name,
      subtitle: "Modelo de contrato — dados de exemplo",
      bodyHtml: `<div style="font-family:Georgia,serif;font-size:12pt;line-height:1.6;">${previewHtml}</div>`,
      headerHtml: (current.header_html ?? "").trim() ? previewHeader : undefined,
      footerHtml: (current.footer_html ?? "").trim() ? previewFooter : undefined,
      showPageNumbers: current.show_page_numbers ?? true,
      pageSize: current.page_size ?? "A4",
      orientation: current.page_orientation ?? "portrait",
      marginMm: current.margin_mm ?? 18,
    });
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dojo/app/students"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Modelos de contrato</h1>
            <p className="text-sm text-muted-foreground">Editor profissional com cabeçalho, rodapé e numeração automática.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={installDefault} disabled={installing}>
            <Sparkles className="h-4 w-4 mr-1" />
            {installing ? "Instalando..." : "Instalar modelo padrão"}
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo modelo</Button>
        </div>
      </div>

      {list.isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
      ) : (list.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Você ainda não criou nenhum modelo de contrato.</div>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Criar primeiro modelo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(list.data ?? []).map((t: any) => (
            <Card key={t.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    {t.description ? <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</div> : null}
                  </div>
                  <Badge variant="outline" className="shrink-0"><FileText className="h-3 w-3 mr-1" />{t.page_size ?? "A4"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Atualizado {new Date(t.updated_at).toLocaleDateString("pt-BR")}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openPreview(t)}><Eye className="h-3.5 w-3.5 mr-1" />Visualizar</Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5 mr-1" />Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(t)}><Copy className="h-3.5 w-3.5 mr-1" />Duplicar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t)} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" />Excluir</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Visualização — {current?.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={printPreview}><Printer className="h-4 w-4 mr-1" />Imprimir modelo</Button>
                <button onClick={() => setPreviewOpen(false)} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 bg-muted/20">
            <div
              className="bg-white text-black shadow-lg mx-auto max-w-3xl p-12 prose prose-sm max-w-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg"
              style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
