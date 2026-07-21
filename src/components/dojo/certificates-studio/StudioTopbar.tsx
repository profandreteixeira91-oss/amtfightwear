import { useEffect, useState } from "react";
import { useStudioStore, ZOOM_STEPS } from "@/lib/dojo/certificates/studio-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Undo2, Redo2, ZoomIn, ZoomOut, Save, FileDown, Image as ImageIcon, Printer, Eye, Grid3x3, Ruler, ChevronLeft, Copy, FilePlus, History } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { exportCanvasAsPdf, exportCanvasAsPng, exportCanvasAsJpeg, printCanvas } from "@/lib/dojo/certificates/export";
import { useServerFn } from "@tanstack/react-start";
import { saveCertificateTemplate } from "@/lib/dojo/dojo.functions";
import { toLegacyFields } from "@/components/dojo/certificate-editor/types";

export function StudioTopbar({ onSave, saving, onPreview }: { onSave: () => Promise<void>; saving: boolean; onPreview: () => void }) {
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

  return (
    <header className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-neutral-200 bg-white">
      <Link to="/dojo/app/certificates" className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 text-sm">
        <ChevronLeft className="h-4 w-4" /> Certificados
      </Link>
      <div className="mx-2 h-6 border-l border-neutral-200" />
      <Input value={name} onChange={(e) => setName(e.target.value)} className="w-64 h-8" placeholder="Nome do modelo" />
      <div className="text-xs text-neutral-400 ml-2">
        {dirty ? <span className="text-amber-600">Não salvo</span> : lastSavedAt ? `Salvo às ${new Date(lastSavedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "—"}
      </div>

      <div className="ml-4 flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={undo} disabled={historyIndex <= 0} title="Desfazer (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1} title="Refazer (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={duplicateSelected} title="Duplicar seleção (Ctrl+D)"><Copy className="h-4 w-4" /></Button>
      </div>

      <div className="ml-2 flex items-center gap-1">
        <Button size="icon" variant={showGrid ? "default" : "ghost"} onClick={toggleGrid} title="Grade"><Grid3x3 className="h-4 w-4" /></Button>
        <Button size="icon" variant={showRulers ? "default" : "ghost"} onClick={toggleRulers} title="Réguas"><Ruler className="h-4 w-4" /></Button>
      </div>

      <div className="ml-2 flex items-center gap-1 bg-neutral-100 rounded-md px-1 py-0.5">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(zoom - 0.1)} title="Diminuir zoom"><ZoomOut className="h-3.5 w-3.5" /></Button>
        <select className="text-xs bg-transparent w-14 text-center outline-none" value={zoom.toFixed(2)} onChange={(e) => setZoom(Number(e.target.value))}>
          {ZOOM_STEPS.map((z) => <option key={z} value={z.toFixed(2)}>{Math.round(z * 100)}%</option>)}
          {!ZOOM_STEPS.some((z) => Math.abs(z - zoom) < 0.01) && <option value={zoom.toFixed(2)}>{Math.round(zoom * 100)}%</option>}
        </select>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(zoom + 0.1)} title="Aumentar zoom"><ZoomIn className="h-3.5 w-3.5" /></Button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPreview}><Eye className="h-4 w-4 mr-1" /> Visualizar</Button>
        <div className="relative group">
          <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-1" /> Exportar</Button>
          <div className="absolute right-0 top-full hidden group-hover:block bg-white border border-neutral-200 rounded-md shadow-lg py-1 min-w-[160px] z-20">
            <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 flex items-center gap-2" onClick={() => doExport("pdf")}><FileDown className="h-4 w-4" /> PDF</button>
            <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 flex items-center gap-2" onClick={() => doExport("png")}><ImageIcon className="h-4 w-4" /> PNG</button>
            <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 flex items-center gap-2" onClick={() => doExport("jpeg")}><ImageIcon className="h-4 w-4" /> JPEG</button>
            <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 flex items-center gap-2" onClick={() => doExport("print")}><Printer className="h-4 w-4" /> Imprimir</button>
          </div>
        </div>
        <Button size="sm" onClick={onSave} disabled={saving} className="bg-red-700 hover:bg-red-800">
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </header>
  );
}
