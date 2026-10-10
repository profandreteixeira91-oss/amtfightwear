import { useEffect, useState } from "react";
import { useStudioStore, ZOOM_STEPS } from "@/lib/dojo/certificates/studio-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Undo2, Redo2, ZoomIn, ZoomOut, Save, FileDown, Image as ImageIcon, Printer, Eye, Grid3x3, Ruler, ChevronLeft, Copy, FilePlus, History, Play } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCanvasAsPdf, exportCanvasAsPng, exportCanvasAsJpeg, printCanvas } from "@/lib/dojo/certificates/export";
import { useServerFn } from "@tanstack/react-start";
import { saveCertificateTemplate } from "@/lib/dojo/dojo.functions";
import { toLegacyFields } from "@/components/dojo/certificate-editor/types";

export function StudioTopbar({ onSave, saving, onPreview, onPresentation }: { onSave: () => Promise<void>; saving: boolean; onPreview: () => void; onPresentation?: () => void }) {
  const { doc, zoom, setZoom, undo, redo, history, historyIndex, name, setName, dirty, lastSavedAt, showGrid, toggleGrid, showRulers, toggleRulers, duplicateSelected } = useStudioStore();
  const navigate = useNavigate();

  const doExport = async (fmt: "pdf" | "png" | "jpeg" | "print") => {
    const node = document.querySelector<HTMLElement>("[data-cert-canvas]");
    if (!node) return;
    try {
      const filename = (name || "certificado").replace(/[^a-zA-Z0-9._-]/g, "_");
      if (fmt === "pdf") await exportCanvasAsPdf(node, filename, doc);
      else if (fmt === "png") await exportCanvasAsPng(node, filename, doc);
      else if (fmt === "jpeg") await exportCanvasAsJpeg(node, filename, doc);
      else await printCanvas(node, doc, filename);
    } catch (e: any) {
      toast.error("Falha ao exportar: " + (e.message || e));
    }
  };

  const savedLabel = saving
    ? "Salvando…"
    : dirty
      ? "Alterações não salvas"
      : lastSavedAt
        ? `Salvo às ${new Date(lastSavedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
        : "Rascunho";
  const toggleCls = (on: boolean) =>
    on ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground hover:text-foreground";

  return (
    <header className="shrink-0 border-b border-border bg-card text-foreground">
      <div className="flex h-14 min-w-0 items-center gap-2 px-2 sm:px-3">
        <Link
          to="/dojo/app/certificates"
          aria-label="Voltar para certificados"
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" /> <span className="hidden lg:inline">Certificados</span>
        </Link>
        <div className="hidden h-6 border-l border-border sm:block" />
        <div className="flex min-w-0 flex-1 flex-col md:flex-none">
          <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:block">Editor de certificados</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nome do modelo"
            className="h-8 w-full min-w-0 bg-background md:w-56 lg:w-64"
            placeholder="Nome do modelo"
          />
        </div>
        <span
          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium xl:inline ${dirty ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
          aria-live="polite"
        >
          {savedLabel}
        </span>

        <div className="ml-2 hidden items-center gap-0.5 md:flex">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={undo} disabled={historyIndex <= 0} title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Undo2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={redo} disabled={historyIndex >= history.length - 1} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Redo2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={duplicateSelected} title="Duplicar seleção (Ctrl+D)" aria-label="Duplicar seleção"><Copy className="h-4 w-4" /></Button>
          <div className="mx-1 h-5 border-l border-border" />
          <Button size="icon" variant="ghost" className={`h-8 w-8 ${toggleCls(showGrid)}`} onClick={toggleGrid} title="Grade" aria-label="Mostrar grade" aria-pressed={showGrid}><Grid3x3 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className={`h-8 w-8 ${toggleCls(showRulers)}`} onClick={toggleRulers} title="Réguas" aria-label="Mostrar réguas" aria-pressed={showRulers}><Ruler className="h-4 w-4" /></Button>
        </div>

        <div className="ml-1 hidden items-center gap-0.5 rounded-md border border-border bg-background px-0.5 md:flex">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(zoom - 0.1)} title="Diminuir zoom" aria-label="Diminuir zoom"><ZoomOut className="h-3.5 w-3.5" /></Button>
          <select aria-label="Zoom" className="w-14 bg-transparent text-center text-xs text-foreground outline-none" value={zoom.toFixed(2)} onChange={(e) => setZoom(Number(e.target.value))}>
            {ZOOM_STEPS.map((z) => <option key={z} value={z.toFixed(2)}>{Math.round(z * 100)}%</option>)}
            {!ZOOM_STEPS.some((z) => Math.abs(z - zoom) < 0.01) && <option value={zoom.toFixed(2)}>{Math.round(zoom * 100)}%</option>}
          </select>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(zoom + 0.1)} title="Aumentar zoom" aria-label="Aumentar zoom"><ZoomIn className="h-3.5 w-3.5" /></Button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onPreview} aria-label="Visualizar" className="px-2 lg:px-3"><Eye className="h-4 w-4" /><span className="hidden lg:inline">Visualizar</span></Button>
          {onPresentation && (
            <Button variant="outline" size="sm" onClick={onPresentation} title="Modo apresentação (F11)" aria-label="Apresentar" className="hidden px-2 sm:inline-flex lg:px-3"><Play className="h-4 w-4" /><span className="hidden lg:inline">Apresentar</span></Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Exportar" className="px-2 lg:px-3"><FileDown className="h-4 w-4" /><span className="hidden lg:inline">Exportar</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem onSelect={() => doExport("pdf")}><FileDown className="h-4 w-4" /> PDF</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => doExport("png")}><ImageIcon className="h-4 w-4" /> PNG</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => doExport("jpeg")}><ImageIcon className="h-4 w-4" /> JPEG</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => doExport("print")}><Printer className="h-4 w-4" /> Imprimir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={onSave} disabled={saving} aria-label="Salvar" className="px-2 sm:px-3">
            <Save className="h-4 w-4" /> <span className="hidden sm:inline">{saving ? "Salvando..." : "Salvar"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
