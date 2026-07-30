import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
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
import { ArrowLeft, Save, Printer, Eye, FileText, Settings2, PanelTop, PanelBottom, ChevronDown, Image as ImageIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  getContractTemplate,
  saveContractTemplate,
  getMyAcademyForContract,
  deleteContractTemplate,
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
  const [activeTab, setActiveTab] = useState<"body" | "header" | "footer" | "page">("body");
  const deleteFn = useServerFn(deleteContractTemplate);

  const exec = (cmd: string, value?: string) => {
    // Foca o contenteditable visível (corpo/cabeçalho/rodapé) antes de executar,
    // caso contrário execCommand não tem alvo e comandos como undo/copy/paste falham silenciosamente.
    const el = document.querySelector<HTMLElement>('[role="textbox"][contenteditable="true"]');
    if (el) {
      el.focus({ preventScroll: true });
      // Se não há seleção dentro dele, coloca o caret no fim para viabilizar copy/cut/selectAll.
      const sel = window.getSelection();
      if (sel && (!sel.anchorNode || !el.contains(sel.anchorNode))) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    try { document.execCommand(cmd, false, value); } catch {}
  };

  const insertAtCursor = (html: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && (document.activeElement as HTMLElement)?.isContentEditable) {
      exec("insertHTML", html);
      return;
    }
    // Fallback: append to current tab content
    if (activeTab === "body") patch({ content: draft.content + html });
    else if (activeTab === "header") patch({ header_html: draft.header_html + html });
    else if (activeTab === "footer") patch({ footer_html: draft.footer_html + html });
    else patch({ content: draft.content + html });
    toast.message("Variável inserida no final do documento (clique no editor antes para posicionar).");
  };
  const insertAcademyLogo = (heightPx = 56) => {
    const url = (branding.data as any)?.logo_url || (academy.data as any)?.logo_url;
    if (!url) {
      toast.error("Sua academia ainda não tem logo. Envie a logo em Configurações › Identidade visual.");
      return;
    }
    const name = (academy.data as any)?.trade_name ?? (academy.data as any)?.legal_name ?? "Logo da academia";
    const safeName = String(name).replace(/"/g, "&quot;");
    const html = `<img src="${url}" alt="${safeName}" style="height:${heightPx}px;width:auto;max-width:220px;object-fit:contain;display:inline-block;vertical-align:middle;" />`;
    insertAtCursor(html);
  };
  const removeTemplate = async () => {
    if (isNew || !draft.id) { navigate({ to: "/dojo/app/contracts/templates" }); return; }
    if (!confirm("Excluir este modelo de contrato?")) return;
    try {
      await deleteFn({ data: { id: draft.id } });
      toast.success("Modelo excluído");
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      navigate({ to: "/dojo/app/contracts/templates" });
    } catch (e: any) { toast.error(e.message); }
  };

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
    <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-hidden">

      {/* Google Docs-style title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-50 dark:bg-neutral-950 px-3 sm:px-6 pt-2 pb-1 shrink-0 border-b sm:border-b-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/dojo/app/contracts/templates" className="shrink-0">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="hidden xs:flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Sem título"
              className="h-8 border-transparent hover:border-input focus:border-input font-medium text-base px-1 sm:px-2 -ml-1 w-full max-w-lg truncate"
            />
            <div className="flex items-center gap-1 sm:gap-4 pl-1 sm:pl-2 -mt-0.5 text-[13px] text-neutral-700 dark:text-neutral-300 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <MenuButton label="Arquivo">
                <DropdownMenuItem onClick={() => navigate({ to: "/dojo/app/contract-templates/$id", params: { id: "new" } })}>Novo modelo</DropdownMenuItem>
                <DropdownMenuItem onClick={save}><Save className="h-3.5 w-3.5 mr-2" />Salvar<span className="ml-auto text-[10px] text-muted-foreground">Ctrl+S</span></DropdownMenuItem>
                <DropdownMenuItem onClick={printPreview}><Printer className="h-3.5 w-3.5 mr-2" />Imprimir<span className="ml-auto text-[10px] text-muted-foreground">Ctrl+P</span></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/dojo/app/contracts/templates" })}>Voltar aos modelos</DropdownMenuItem>
                {!isNew && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={removeTemplate} className="text-red-600 focus:text-red-600">Excluir modelo…</DropdownMenuItem>
                  </>
                )}
              </MenuButton>
              <MenuButton label="Editar">
                <DropdownMenuItem onClick={() => exec("undo")}>Desfazer<span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Z</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => exec("redo")}>Refazer<span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Y</span></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exec("selectAll")}>Selecionar tudo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exec("copy")}>Copiar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exec("cut")}>Recortar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exec("paste")}>Colar</DropdownMenuItem>
              </MenuButton>
              <MenuButton label="Ver">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Aba do editor</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setActiveTab("body")}>Corpo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("header")}>Cabeçalho</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("footer")}>Rodapé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("page")}>Configuração da página</DropdownMenuItem>
              </MenuButton>
              <MenuButton label="Inserir">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Variáveis</DropdownMenuLabel>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Aluno</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="z-[130]">
                    {["aluno_nome","aluno_cpf","aluno_rg","aluno_endereco","aluno_telefone","aluno_modalidade"].map(v => (
                      <DropdownMenuItem key={v} onClick={() => insertAtCursor(`{{${v}}}`)}>{v}</DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Academia</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="z-[130]">
                    {["academia_nome","academia_cnpj","academia_endereco","academia_cidade","academia_estado"].map(v => (
                      <DropdownMenuItem key={v} onClick={() => insertAtCursor(`{{${v}}}`)}>{v}</DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Contrato</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="z-[130]">
                    {["contrato_plano","contrato_valor","contrato_forma_pagamento","contrato_dia_vencimento","contrato_inicio","contrato_fim","contrato_data"].map(v => (
                      <DropdownMenuItem key={v} onClick={() => insertAtCursor(`{{${v}}}`)}>{v}</DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Logo da academia</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => insertAcademyLogo(40)}>Logo — pequena (40 px)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertAcademyLogo(56)}>Logo — média (56 px)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertAcademyLogo(80)}>Logo — grande (80 px)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => insertAtCursor("<hr />")}>Linha horizontal</DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertAtCursor('<p style="page-break-after:always"></p>')}>Quebra de página</DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertAtCursor("{{pagina_atual}} de {{total_paginas}}")}>Número da página</DropdownMenuItem>
              </MenuButton>
              <MenuButton label="Formatar">
                <DropdownMenuItem onClick={() => exec("bold")}><strong>Negrito</strong><span className="ml-auto text-[10px] text-muted-foreground">Ctrl+B</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => exec("italic")}><em>Itálico</em><span className="ml-auto text-[10px] text-muted-foreground">Ctrl+I</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => exec("underline")}><span className="underline">Sublinhado</span><span className="ml-auto text-[10px] text-muted-foreground">Ctrl+U</span></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Alinhamento</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="z-[130]">
                    <DropdownMenuItem onClick={() => exec("justifyLeft")}>Esquerda</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exec("justifyCenter")}>Centro</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exec("justifyRight")}>Direita</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exec("justifyFull")}>Justificado</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Listas</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="z-[130]">
                    <DropdownMenuItem onClick={() => exec("insertUnorderedList")}>Lista com marcadores</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exec("insertOrderedList")}>Lista numerada</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exec("removeFormat")}>Limpar formatação</DropdownMenuItem>
              </MenuButton>
              <MenuButton label="Ferramentas">
                <DropdownMenuItem onClick={() => patch({ show_page_numbers: !draft.show_page_numbers })}>
                  {draft.show_page_numbers ? "✓ " : ""}Numerar páginas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("page")}>Configuração da página…</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={printPreview}>Pré-visualizar impressão</DropdownMenuItem>
              </MenuButton>
              <span className="hidden md:inline text-xs text-muted-foreground ml-2">
                {isNew ? "Novo modelo" : existing.data ? `Salvo · ${new Date((existing.data as any).updated_at).toLocaleString("pt-BR")}` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 px-2 sm:px-0">
          <Button variant="outline" size="sm" onClick={printPreview} className="rounded-full h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-auto" aria-label="Imprimir">
            <Printer className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button size="sm" onClick={save} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-auto" aria-label="Salvar">
            <Save className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Salvar</span>
          </Button>
        </div>
      </div>


      {/* Body: main document (emphasis) + small preview sidebar */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-0">
        {/* MAIN — editor */}
        <div className="min-h-0 overflow-y-auto bg-neutral-100/50 dark:bg-neutral-900/30">
          <div className="px-2 sm:px-4 md:px-8 py-3 sm:py-6 max-w-5xl mx-auto w-full space-y-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <TabsList className="bg-neutral-200/60 dark:bg-neutral-800/60 w-full sm:w-auto overflow-x-auto justify-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
                  <TabsTrigger value="body" className="shrink-0"><FileText className="h-3.5 w-3.5 mr-1" />Corpo</TabsTrigger>
                  <TabsTrigger value="header" className="shrink-0"><PanelTop className="h-3.5 w-3.5 mr-1" />Cabeçalho</TabsTrigger>
                  <TabsTrigger value="footer" className="shrink-0"><PanelBottom className="h-3.5 w-3.5 mr-1" />Rodapé</TabsTrigger>
                  <TabsTrigger value="page" className="shrink-0"><Settings2 className="h-3.5 w-3.5 mr-1" />Página</TabsTrigger>
                </TabsList>
                <Input
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Descrição interna (opcional)"
                  className="h-8 w-full sm:max-w-xs text-xs"
                />
              </div>


              <TabsContent value="body" className="mt-3">
                <RichTextEditor
                  value={draft.content}
                  onChange={(html) => patch({ content: html })}
                  placeholder="Escreva o corpo do contrato…"
                  minHeight={720}
                />
              </TabsContent>

              <TabsContent value="header" className="mt-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  O cabeçalho será impresso no topo de <strong>todas as páginas</strong>. Recomendado: logo com altura entre 40 e 80 px para caber bem em A4.
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 rounded-md border border-dashed border-red-500/40 bg-red-500/5 p-2">
                  <span className="text-xs font-medium text-red-700 dark:text-red-300 inline-flex items-center gap-1 w-full sm:w-auto">
                    <ImageIcon className="h-3.5 w-3.5" /> Logo da academia:
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1 sm:flex-none" onClick={() => insertAcademyLogo(40)}>Pequena (40 px)</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1 sm:flex-none" onClick={() => insertAcademyLogo(56)}>Média (56 px)</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1 sm:flex-none" onClick={() => insertAcademyLogo(80)}>Grande (80 px)</Button>
                  {!(branding.data as any)?.logo_url && !(academy.data as any)?.logo_url && (
                    <span className="text-[11px] text-muted-foreground w-full">Envie a logo em Configurações › Identidade visual.</span>
                  )}
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

        {/* ASIDE — small live preview */}
        <aside className="hidden lg:flex min-h-0 overflow-y-auto border-l bg-white/60 dark:bg-neutral-900/60 backdrop-blur flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 dark:bg-neutral-900/90 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
              <Eye className="h-3.5 w-3.5" /> Pré-visualização
            </div>
            <span className="text-[10px] text-muted-foreground">dados de exemplo</span>
          </div>
          <div className="p-3 flex flex-col items-center gap-2">
            <div
              className={`w-full ${paperClass} bg-white text-black shadow-md rounded-sm flex flex-col overflow-hidden border border-neutral-200`}
              style={{
                padding: `${Math.max(4, draft.margin_mm / 2)}mm`,
                fontFamily: "'Arial', 'Helvetica', sans-serif",
                fontSize: "6.5pt",
                lineHeight: 1.35,
              }}
            >
              {draft.header_html.trim() && (
                <div className="shrink-0 pb-1.5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolvedHeader) }} />
              )}
              <div
                className="flex-1 min-h-0 overflow-hidden prose max-w-none [&_h1]:text-[10pt] [&_h1]:font-bold [&_h2]:text-[8pt] [&_h2]:font-semibold [&_h3]:text-[7pt] [&_p]:my-0.5 [&_hr]:my-1 [&_*]:!leading-snug"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolvedContent) }}
              />
              {draft.footer_html.trim() && (
                <div
                  className="shrink-0 pt-1.5 text-[5.5pt] text-neutral-600"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(resolvedFooter
                      .replace(/\{\{\s*pagina_atual\s*\}\}/g, "1")
                      .replace(/\{\{\s*total_paginas\s*\}\}/g, "1")),

                  }}
                />
              )}
            </div>
            <div className="text-[10px] text-muted-foreground text-center">
              {draft.page_size} · {draft.page_orientation === "portrait" ? "Retrato" : "Paisagem"} · Página 1
            </div>
          </div>
        </aside>
      </div>
    </div>
  );


  if (typeof document === "undefined") return null;
  return createPortal(editor, document.body);
}


function MenuButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[13px] text-neutral-700 hover:bg-neutral-200/60 focus:outline-none focus:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
        >
          {label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px] z-[130]">
        {children}
      </DropdownMenuContent>

    </DropdownMenu>
  );
}
