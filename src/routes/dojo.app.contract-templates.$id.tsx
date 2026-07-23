import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/dojo/RichTextEditor";
import { toast } from "sonner";
import { ArrowLeft, Save, Printer, Eye, FileText, Settings2, PanelTop, PanelBottom } from "lucide-react";
import {
  getContractTemplate,
  saveContractTemplate,
  getMyAcademyForContract,
} from "@/lib/dojo/contracts.functions";
import { buildContractValues, resolveContractHtml } from "@/lib/dojo/contracts-variables";
import { openBrandedPrintDocument } from "@/lib/dojo/print-document";
import { useDojoBranding } from "@/hooks/useDojoBranding";

export const Route = createFileRoute("/dojo/app/contract-templates/$id")({
  head: () => ({
    meta: [
      { title: "Editor de contrato — AMT Dojo Manager" },
      { name: "description", content: "Editor profissional de contratos com cabeçalho, rodapé, número de páginas e variáveis dinâmicas." },
    ],
  }),
  component: ContractEditorPage,
});

const DEFAULT_CONTENT = `<h1 style="text-align:center;">Contrato de Prestação de Serviços</h1>
<p style="text-align:center;"><strong>{{academia_nome}}</strong> — {{academia_cidade}}/{{academia_estado}}</p>
<hr />
<p><strong>CONTRATANTE:</strong> {{aluno_nome}}, CPF {{aluno_cpf}}, RG {{aluno_rg}}, residente em {{aluno_endereco}}, telefone {{aluno_telefone}}.</p>
<p><strong>CONTRATADA:</strong> {{academia_nome}}, CNPJ {{academia_cnpj}}, com sede em {{academia_endereco}}.</p>
<h2>1. Objeto</h2>
<p>O presente contrato tem por objeto a prestação de serviços de treinamento em {{aluno_modalidade}} pela CONTRATADA à CONTRATANTE, mediante o plano <strong>{{contrato_plano}}</strong>.</p>
<h2>2. Valor e Pagamento</h2>
<p>A mensalidade é de <strong>{{contrato_valor}}</strong>, paga via {{contrato_forma_pagamento}} com vencimento todo dia {{contrato_dia_vencimento}}.</p>
<h2>3. Vigência</h2>
<p>Vigência de {{contrato_inicio}} a {{contrato_fim}}, renovando-se automaticamente salvo manifestação em contrário.</p>
<p style="margin-top:48px;">{{academia_cidade}}, {{contrato_data}}.</p>
<div style="display:flex; justify-content:space-between; margin-top:64px;">
  <div style="text-align:center; width:45%;">
    <div style="border-top:1px solid #000; padding-top:6px;">CONTRATANTE / Responsável</div>
  </div>
  <div style="text-align:center; width:45%;">
    <div style="border-top:1px solid #000; padding-top:6px;">CONTRATADA — {{academia_nome}}</div>
  </div>
</div>`;

const DEFAULT_HEADER = `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #dc2626;padding-bottom:6px;">
  <strong style="font-size:12pt;">{{academia_nome}}</strong>
  <span style="font-size:9pt;color:#64748b;">CNPJ {{academia_cnpj}}</span>
</div>`;

const DEFAULT_FOOTER = `<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:4px;font-size:9pt;color:#64748b;">
  <span>{{academia_nome}}</span>
  <span>Página {{pagina_atual}} de {{total_paginas}}</span>
</div>`;

type Draft = {
  id?: string;
  name: string;
  description: string;
  content: string;
  header_html: string;
  footer_html: string;
  page_size: "A4" | "Letter";
  page_orientation: "portrait" | "landscape";
  margin_mm: number;
  show_page_numbers: boolean;
};

function ContractEditorPage() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const branding = useDojoBranding();

  const getFn = useServerFn(getContractTemplate);
  const saveFn = useServerFn(saveContractTemplate);
  const academyFn = useServerFn(getMyAcademyForContract);

  const academy = useQuery({ queryKey: ["dojo-academy-profile"], queryFn: () => academyFn() });
  const existing = useQuery({
    queryKey: ["contract-template", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !isNew,
  });

  const [draft, setDraft] = useState<Draft>({
    name: "Novo modelo de contrato",
    description: "",
    content: DEFAULT_CONTENT,
    header_html: DEFAULT_HEADER,
    footer_html: DEFAULT_FOOTER,
    page_size: "A4",
    page_orientation: "portrait",
    margin_mm: 18,
    show_page_numbers: true,
  });
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (isNew || loaded || !existing.data) return;
    const r: any = existing.data;
    setDraft({
      id: r.id,
      name: r.name ?? "",
      description: r.description ?? "",
      content: r.content ?? "",
      header_html: r.header_html ?? "",
      footer_html: r.footer_html ?? "",
      page_size: (r.page_size ?? "A4") as "A4" | "Letter",
      page_orientation: (r.page_orientation ?? "portrait") as "portrait" | "landscape",
      margin_mm: Number(r.margin_mm ?? 18),
      show_page_numbers: r.show_page_numbers ?? true,
    });
    setLoaded(true);
  }, [existing.data, isNew, loaded]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const previewValues = useMemo(() => {
    return buildContractValues({
      student: {
        full_name: "João da Silva (exemplo)",
        cpf: "000.000.000-00",
        rg: "00.000.000-0",
        address_street: "Rua Exemplo",
        address_number: "100",
        city: (academy.data as any)?.city ?? "Cidade",
        state: (academy.data as any)?.state ?? "UF",
        phone: "(00) 00000-0000",
        modality: "Jiu-Jitsu",
        current_belt_name: "Branca",
      },
      academy: academy.data,
      contract: {
        title: draft.name,
        value: 199.9,
        plan_name: "Mensal",
        payment_method: "PIX",
        due_day: 10,
        start_date: new Date().toISOString(),
      },
    });
  }, [draft.name, academy.data]);

  const resolvedContent = resolveContractHtml(draft.content, previewValues);
  const resolvedHeader = resolveContractHtml(draft.header_html, previewValues);
  const resolvedFooter = resolveContractHtml(draft.footer_html, previewValues);

  const save = async () => {
    if (!draft.name.trim()) { toast.error("Informe um nome"); return; }
    try {
      const saved: any = await saveFn({
        data: {
          id: draft.id,
          name: draft.name,
          description: draft.description || null,
          content: draft.content,
          header_html: draft.header_html,
          footer_html: draft.footer_html,
          page_size: draft.page_size,
          page_orientation: draft.page_orientation,
          margin_mm: draft.margin_mm,
          show_page_numbers: draft.show_page_numbers,
        },
      });
      toast.success("Modelo salvo");
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      if (isNew && saved?.id) {
        navigate({ to: "/dojo/app/contract-templates/$id", params: { id: saved.id } });
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const printPreview = () => {
    openBrandedPrintDocument({
      branding: branding.data as any,
      title: draft.name,
      subtitle: "Pré-visualização com dados de exemplo",
      bodyHtml: `<div style="font-family:Georgia,serif;font-size:12pt;line-height:1.6;">${resolvedContent}</div>`,
      headerHtml: draft.header_html.trim() ? resolvedHeader : undefined,
      footerHtml: draft.footer_html.trim() ? resolvedFooter : undefined,
      showPageNumbers: draft.show_page_numbers,
      pageSize: draft.page_size,
      orientation: draft.page_orientation,
      marginMm: draft.margin_mm,
    });
  };

  const paperClass = draft.page_orientation === "landscape"
    ? "aspect-[297/210]"
    : draft.page_size === "Letter" ? "aspect-[8.5/11]" : "aspect-[210/297]";

  const editor = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-muted/30 overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b bg-background px-4 md:px-6 py-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/dojo/app/contract-templates">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <Input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Nome do modelo"
              className="h-8 border-transparent hover:border-input focus:border-input font-semibold text-base px-2 -ml-2 max-w-md"
            />
            <div className="text-xs text-muted-foreground pl-2">
              {isNew ? "Novo modelo" : `Editando · atualizado ${existing.data ? new Date((existing.data as any).updated_at).toLocaleString("pt-BR") : ""}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={printPreview}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
          <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </div>
      </div>

      {/* Body: editor + preview */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* LEFT — editor */}
        <div className="min-h-0 overflow-y-auto border-r bg-background">
          <div className="p-4 md:p-6 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Descrição interna (opcional)</Label>
              <Input
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Ex.: Contrato mensal padrão"
              />
            </div>

            <Tabs defaultValue="body" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="body"><FileText className="h-3.5 w-3.5 mr-1" />Corpo</TabsTrigger>
                <TabsTrigger value="header"><PanelTop className="h-3.5 w-3.5 mr-1" />Cabeçalho</TabsTrigger>
                <TabsTrigger value="footer"><PanelBottom className="h-3.5 w-3.5 mr-1" />Rodapé</TabsTrigger>
                <TabsTrigger value="page"><Settings2 className="h-3.5 w-3.5 mr-1" />Página</TabsTrigger>
              </TabsList>

              <TabsContent value="body" className="mt-3">
                <RichTextEditor
                  value={draft.content}
                  onChange={(html) => patch({ content: html })}
                  placeholder="Escreva o corpo do contrato…"
                  minHeight={520}
                />
              </TabsContent>

              <TabsContent value="header" className="mt-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  O cabeçalho será impresso no topo de <strong>todas as páginas</strong>.
                </div>
                <RichTextEditor
                  value={draft.header_html}
                  onChange={(html) => patch({ header_html: html })}
                  placeholder="Ex.: logo, nome da academia, CNPJ…"
                  minHeight={160}
                  compact
                />
              </TabsContent>

              <TabsContent value="footer" className="mt-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  O rodapé será impresso na base de <strong>todas as páginas</strong>. Use os botões <em>Página nº</em> ou <em>X de Y</em> para inserir a numeração automática.
                </div>
                <RichTextEditor
                  value={draft.footer_html}
                  onChange={(html) => patch({ footer_html: html })}
                  placeholder="Ex.: dados de contato, Página X de Y…"
                  minHeight={160}
                  compact
                  showPageNumberTokens
                />
              </TabsContent>

              <TabsContent value="page" className="mt-3">
                <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Tamanho do papel</Label>
                    <Select value={draft.page_size} onValueChange={(v) => patch({ page_size: v as "A4" | "Letter" })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                        <SelectItem value="Letter">Carta (216 × 279 mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Orientação</Label>
                    <Select value={draft.page_orientation} onValueChange={(v) => patch({ page_orientation: v as "portrait" | "landscape" })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Retrato</SelectItem>
                        <SelectItem value="landscape">Paisagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Margem uniforme (mm)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={40}
                      value={draft.margin_mm}
                      onChange={(e) => patch({ margin_mm: Math.max(5, Math.min(40, Number(e.target.value) || 18)) })}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <Label className="text-xs">Numerar páginas</Label>
                      <div className="text-[11px] text-muted-foreground">Rodapé padrão exibe "Página X de Y".</div>
                    </div>
                    <Switch
                      checked={draft.show_page_numbers}
                      onCheckedChange={(c) => patch({ show_page_numbers: c })}
                    />
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div className="min-h-0 overflow-y-auto bg-neutral-100 dark:bg-neutral-900">
          <div className="p-4 md:p-8 flex justify-center">
            <div
              className={`w-full max-w-[820px] ${paperClass} bg-white text-black shadow-xl rounded-sm flex flex-col overflow-hidden`}
              style={{ padding: `${draft.margin_mm}mm`, fontFamily: "Georgia, serif", fontSize: "12pt", lineHeight: 1.6 }}
            >
              {draft.header_html.trim() && (
                <div className="shrink-0 pb-3" dangerouslySetInnerHTML={{ __html: resolvedHeader }} />
              )}
              <div className="flex-1 min-h-0 overflow-hidden prose prose-sm max-w-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg"
                dangerouslySetInnerHTML={{ __html: resolvedContent }} />
              {draft.footer_html.trim() && (
                <div
                  className="shrink-0 pt-3 text-xs"
                  dangerouslySetInnerHTML={{
                    __html: resolvedFooter
                      .replace(/\{\{\s*pagina_atual\s*\}\}/g, "1")
                      .replace(/\{\{\s*total_paginas\s*\}\}/g, "1"),
                  }}
                />
              )}
            </div>
          </div>
          <div className="px-8 pb-8 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <Eye className="h-3 w-3" /> Pré-visualização com dados de exemplo — a impressão respeita o layout real
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(editor, document.body);
}

