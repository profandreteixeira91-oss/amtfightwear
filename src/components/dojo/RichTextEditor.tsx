import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3, Pilcrow,
  Undo, Redo, Link2, Image as ImageIcon, Upload, Braces, Table as TableIcon,
  Minus, Type,
} from "lucide-react";
import { CONTRACT_VARIABLE_MENU } from "@/lib/dojo/contracts-variables";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Adiciona botões extras (Página X de Y) no toolbar. Útil no editor de rodapé. */
  showPageNumberTokens?: boolean;
  /** Reduz altura mínima para uso em header/footer. */
  compact?: boolean;
};

const FONT_FAMILIES = [
  { label: "Padrão", value: "" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans", value: "Inter, Arial, sans-serif" },
  { label: "Mono", value: "'JetBrains Mono', 'Courier New', monospace" },
  { label: "Playfair", value: "'Playfair Display', serif" },
  { label: "Merriweather", value: "Merriweather, serif" },
];

const FONT_SIZES = ["10", "12", "14", "16", "18", "20", "24", "28", "32", "40"];

const exec = (cmd: string, value?: string) => {
  document.execCommand(cmd, false, value);
};

export function RichTextEditor({ value, onChange, placeholder, minHeight = 500, showPageNumberTokens = false, compact = false }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [imgOpen, setImgOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const savedRange = useRef<Range | null>(null);

  // Initialize the editor's HTML only once (or when value differs and editor isn't focused)
  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value ?? "";
    }
  }, [value]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    } else if (ref.current) {
      // If no selection was ever captured, focus the editor and put caret at end
      ref.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const doExec = (cmd: string, val?: string) => {
    restoreSelection();
    exec(cmd, val);
    handleInput();
    saveSelection();
  };

  const insertHtml = (html: string) => {
    restoreSelection();
    exec("insertHTML", html);
    handleInput();
    saveSelection();
  };

  const insertVariable = (key: string) => {
    insertHtml(`{{${key}}}`);
  };

  const insertImage = (url: string) => {
    if (!url) return;
    insertHtml(
      `<img src="${url}" alt="" style="max-width:100%;height:auto;margin:8px 0;" />`,
    );
    setImgOpen(false);
    setImgUrl("");
  };

  const insertLink = () => {
    const url = window.prompt("URL do link:");
    if (!url) return;
    doExec("createLink", url);
  };

  const insertTable = () => {
    const rows = 3;
    const cols = 3;
    let html = `<table style="border-collapse:collapse;width:100%;margin:8px 0;">`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="border:1px solid #ccc;padding:6px;min-width:60px;">&nbsp;</td>`;
      }
      html += "</tr>";
    }
    html += "</table>";
    insertHtml(html);
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `contracts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("ig-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("ig-media").getPublicUrl(path);
      insertImage(data.publicUrl);
      toast.success("Imagem inserida");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-md border bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-2 sticky top-0 z-10">
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("undo")} title="Desfazer"><Undo className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("redo")} title="Refazer"><Redo className="h-4 w-4" /></Button>
        <span className="mx-1 h-5 w-px bg-border" />

        <Select onValueChange={(v) => doExec("formatBlock", v)}>
          <SelectTrigger className="h-8 w-[140px]" onMouseDown={saveSelection}><SelectValue placeholder="Parágrafo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Parágrafo</SelectItem>
            <SelectItem value="h1">Título 1</SelectItem>
            <SelectItem value="h2">Título 2</SelectItem>
            <SelectItem value="h3">Título 3</SelectItem>
            <SelectItem value="blockquote">Citação</SelectItem>
            <SelectItem value="pre">Código</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => doExec("fontName", v)}>
          <SelectTrigger className="h-8 w-[130px]" onMouseDown={saveSelection}><SelectValue placeholder="Fonte" /></SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.label} value={f.value || "inherit"}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="h-8 w-[80px]" onMouseDown={saveSelection}><SelectValue placeholder="Tam." /></SelectTrigger>

          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s} value={s} onPointerDown={(e) => {
                e.preventDefault();
                restoreSelection();
                // wrap selection in a span with inline font-size
                document.execCommand("styleWithCSS", false, "true");
                document.execCommand("fontSize", false, "7");
                // replace the just-inserted font tags
                if (ref.current) {
                  ref.current.querySelectorAll('font[size="7"]').forEach((el) => {
                    const span = document.createElement("span");
                    span.style.fontSize = `${s}px`;
                    span.innerHTML = (el as HTMLElement).innerHTML;
                    el.replaceWith(span);
                  });
                  handleInput();
                }
              }}>{s}px</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="mx-1 h-5 w-px bg-border" />

        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("bold")} title="Negrito"><Bold className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("italic")} title="Itálico"><Italic className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("underline")} title="Sublinhado"><UnderlineIcon className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("strikeThrough")} title="Tachado"><Strikethrough className="h-4 w-4" /></Button>

        <label className="ml-1 inline-flex items-center gap-1 rounded px-2 py-1 text-xs cursor-pointer hover:bg-accent" title="Cor do texto">
          <Type className="h-4 w-4" />
          <input
            type="color"
            className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
            onMouseDown={saveSelection}
            onChange={(e) => doExec("foreColor", e.target.value)}
          />
        </label>

        <span className="mx-1 h-5 w-px bg-border" />

        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("justifyLeft")} title="Esquerda"><AlignLeft className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("justifyCenter")} title="Centro"><AlignCenter className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("justifyRight")} title="Direita"><AlignRight className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("justifyFull")} title="Justificado"><AlignJustify className="h-4 w-4" /></Button>

        <span className="mx-1 h-5 w-px bg-border" />

        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("insertUnorderedList")} title="Lista"><List className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("insertOrderedList")} title="Lista numerada"><ListOrdered className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => doExec("insertHorizontalRule")} title="Linha"><Minus className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={insertTable} title="Tabela"><TableIcon className="h-4 w-4" /></Button>

        <span className="mx-1 h-5 w-px bg-border" />

        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={insertLink} title="Link"><Link2 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setImgOpen(true); }} title="Imagem"><ImageIcon className="h-4 w-4" /></Button>

        <span className="mx-1 h-5 w-px bg-border" />

        {/* Variables */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onMouseDown={saveSelection}>
              <Braces className="h-4 w-4" /> Variáveis
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-[420px] overflow-y-auto p-2" align="start">
            <div className="text-xs text-muted-foreground mb-2 px-1">
              Clique para inserir. As variáveis serão substituídas pelos dados reais ao imprimir.
            </div>
            <div className="space-y-3">
              {CONTRACT_VARIABLE_MENU.map((cat) => (
                <div key={cat.id}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">{cat.label}</div>
                  <div className="grid grid-cols-1 gap-1">
                    {cat.items.map((it) => (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => insertVariable(it.key)}
                        className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-accent text-left"
                      >
                        <span>{it.label}</span>
                        <code className="text-[10px] text-muted-foreground">{`{{${it.key}}}`}</code>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {showPageNumberTokens && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertHtml("{{pagina_atual}}")}
              title="Inserir número da página atual">
              Página nº
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertHtml("Página {{pagina_atual}} de {{total_paginas}}")}
              title="Inserir 'Página X de Y'">
              X de Y
            </Button>
          </>
        )}
      </div>

      {/* Editor surface */}
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={saveSelection}
        data-placeholder={placeholder ?? "Escreva o contrato..."}
        className={`prose prose-sm max-w-none focus:outline-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:border-collapse [&_table_td]:border [&_table_td]:p-1 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground ${compact ? "px-3 py-2" : "px-6 py-6"}`}
        style={{ minHeight: compact ? Math.min(minHeight, 120) : minHeight }}
      />

      {/* Image dialog */}
      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inserir imagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Do computador</label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Enviando..." : "Escolher arquivo"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground">— ou —</div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">URL da imagem</label>
              <Input
                className="mt-1"
                placeholder="https://..."
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImgOpen(false)}>Cancelar</Button>
            <Button onClick={() => insertImage(imgUrl)} disabled={!imgUrl}>Inserir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
