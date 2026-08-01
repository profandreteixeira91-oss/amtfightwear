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
  List, ListOrdered,
  Undo, Redo, Link2, Image as ImageIcon, Upload, Braces, Table as TableIcon,
  Minus, Type, Trash2,
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
  { label: "Padrão", value: "inherit" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans", value: "Inter, Arial, sans-serif" },
  { label: "Mono", value: "'JetBrains Mono', 'Courier New', monospace" },
  { label: "Playfair", value: "'Playfair Display', serif" },
  { label: "Merriweather", value: "Merriweather, serif" },
];

const FONT_SIZES = ["10", "12", "14", "16", "18", "20", "24", "28", "32", "40"];

const BLOCK_FORMATS = [
  { label: "Parágrafo", value: "p" },
  { label: "Título 1", value: "h1" },
  { label: "Título 2", value: "h2" },
  { label: "Título 3", value: "h3" },
  { label: "Citação", value: "blockquote" },
  { label: "Código", value: "pre" },
];

// z-index acima do modal do editor (Dialog usa z-[80]).
const OVERLAY_Z = "z-[130]";

export function RichTextEditor({ value, onChange, placeholder, minHeight = 500, showPageNumberTokens = false, compact = false }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [imgOpen, setImgOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgBox, setImgBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value ?? "";
    }
  }, [value]);

  // Recompute overlay box relative to the surface container.
  const recomputeImgBox = () => {
    if (!selectedImg || !surfaceRef.current) { setImgBox(null); return; }
    if (!surfaceRef.current.contains(selectedImg)) { setSelectedImg(null); setImgBox(null); return; }
    const s = surfaceRef.current.getBoundingClientRect();
    const r = selectedImg.getBoundingClientRect();
    setImgBox({
      left: r.left - s.left + surfaceRef.current.scrollLeft,
      top: r.top - s.top + surfaceRef.current.scrollTop,
      width: r.width,
      height: r.height,
    });
  };

  useEffect(() => {
    recomputeImgBox();
    if (!selectedImg) return;
    const onWinChange = () => recomputeImgBox();
    window.addEventListener("resize", onWinChange);
    surfaceRef.current?.addEventListener("scroll", onWinChange);
    const ro = new ResizeObserver(onWinChange);
    ro.observe(selectedImg);
    return () => {
      window.removeEventListener("resize", onWinChange);
      surfaceRef.current?.removeEventListener("scroll", onWinChange);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImg]);

  // Click handler inside the editor to select/deselect images.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t && t.tagName === "IMG") {
        e.preventDefault();
        setSelectedImg(t as HTMLImageElement);
      } else {
        setSelectedImg(null);
      }
    };
    node.addEventListener("mousedown", onMouseDown);
    return () => node.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Delete/Backspace remove a imagem selecionada.
  useEffect(() => {
    if (!selectedImg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        selectedImg.remove();
        setSelectedImg(null);
        setImgBox(null);
        handleInput();
      } else if (e.key === "Escape") {
        setSelectedImg(null);
        setImgBox(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImg]);



  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const focusEditor = () => {
    if (!ref.current) return;
    ref.current.focus({ preventScroll: true });
  };

  const restoreSelection = () => {
    focusEditor();
    const sel = window.getSelection();
    if (savedRange.current && ref.current?.contains(savedRange.current.startContainer)) {
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
      return;
    }
    if (ref.current) {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      savedRange.current = range.cloneRange();
    }
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const doExec = (cmd: string, val?: string) => {
    restoreSelection();
    try { document.execCommand("styleWithCSS", false, "true"); } catch {}
    document.execCommand(cmd, false, val);
    handleInput();
    saveSelection();
  };

  const insertHtml = (html: string) => {
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    handleInput();
    saveSelection();
  };

  const applyFontSize = (px: string) => {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontSize", false, "7");
    if (ref.current) {
      ref.current.querySelectorAll('font[size="7"]').forEach((el) => {
        const span = document.createElement("span");
        span.style.fontSize = `${px}px`;
        span.innerHTML = (el as HTMLElement).innerHTML;
        el.replaceWith(span);
      });
      handleInput();
    }
    saveSelection();
  };

  const applyBlock = (tag: string) => {
    // Alguns navegadores exigem o formato <tag>
    doExec("formatBlock", `<${tag}>`);
  };

  const insertVariable = (key: string) => insertHtml(`{{${key}}}`);

  const insertImage = (url: string) => {
    if (!url) return;
    insertHtml(`<img src="${url}" alt="" style="max-width:100%;height:auto;margin:8px 0;" />`);
    setImgOpen(false);
    setImgUrl("");
  };

  const insertLink = () => {
    const url = window.prompt("URL do link:");
    if (!url) return;
    doExec("createLink", url);
  };

  const insertTable = () => {
    const rows = 3, cols = 3;
    let html = `<table style="border-collapse:collapse;width:100%;margin:8px 0;">`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) html += `<td style="border:1px solid #ccc;padding:6px;min-width:60px;">&nbsp;</td>`;
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

  // Handler dedicado para os SelectItem — precisa capturar a seleção do
  // editor ANTES do Radix devolver o foco ao trigger.
  const preventBlur = (e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
  };

  const tbBtn =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground/80 hover:bg-accent hover:text-foreground transition-colors";
  const tbDivider = "mx-1 h-6 w-px shrink-0 bg-border/70";


  return (
    <div className="rounded-lg border border-border/80 bg-background shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex flex-nowrap md:flex-wrap items-center gap-0.5 border-b bg-gradient-to-b from-muted/60 to-muted/30 backdrop-blur px-2 py-2 sticky top-0 z-10 overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden print:hidden"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) e.preventDefault();
        }}
      >

        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("undo")} title="Desfazer" aria-label="Desfazer"><Undo className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("redo")} title="Refazer" aria-label="Refazer"><Redo className="h-4 w-4" /></button>
        <span className={tbDivider} />

        {/* Bloco / Parágrafo */}
        <Select onValueChange={(v) => applyBlock(v)}>
          <SelectTrigger
            className="h-8 w-[130px] shrink-0 bg-background/80"
            onPointerDown={() => saveSelection()}
          >
            <SelectValue placeholder="Parágrafo" />
          </SelectTrigger>
          <SelectContent className={`${OVERLAY_Z} bg-popover shadow-xl border`}>
            {BLOCK_FORMATS.map((b) => (
              <SelectItem key={b.value} value={b.value} onPointerDown={preventBlur}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Fonte */}
        <Select onValueChange={(v) => doExec("fontName", v)}>
          <SelectTrigger
            className="h-8 w-[130px] shrink-0 bg-background/80"
            onPointerDown={() => saveSelection()}
          >
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent className={`${OVERLAY_Z} bg-popover shadow-xl border`}>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.label} value={f.value} onPointerDown={preventBlur}>
                <span style={{ fontFamily: f.value }}>{f.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tamanho */}
        <Select onValueChange={(v) => applyFontSize(v)}>
          <SelectTrigger
            className="h-8 w-[80px] shrink-0 bg-background/80"
            onPointerDown={() => saveSelection()}
          >
            <SelectValue placeholder="Tam." />
          </SelectTrigger>
          <SelectContent className={`${OVERLAY_Z} bg-popover shadow-xl border`}>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s} value={s} onPointerDown={preventBlur}>{s}px</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className={tbDivider} />

        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("bold")} title="Negrito" aria-label="Negrito"><Bold className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("italic")} title="Itálico" aria-label="Itálico"><Italic className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("underline")} title="Sublinhado" aria-label="Sublinhado"><UnderlineIcon className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("strikeThrough")} title="Tachado" aria-label="Tachado"><Strikethrough className="h-4 w-4" /></button>

        <label className="ml-1 inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs cursor-pointer hover:bg-accent" title="Cor do texto" aria-label="Cor do texto">
          <Type className="h-4 w-4" />
          <input
            type="color"
            className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
            onMouseDown={() => saveSelection()}
            onChange={(e) => doExec("foreColor", e.target.value)}
          />
        </label>

        <span className={tbDivider} />

        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("justifyLeft")} title="Esquerda" aria-label="Esquerda"><AlignLeft className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("justifyCenter")} title="Centro" aria-label="Centro"><AlignCenter className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("justifyRight")} title="Direita" aria-label="Direita"><AlignRight className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("justifyFull")} title="Justificado" aria-label="Justificado"><AlignJustify className="h-4 w-4" /></button>

        <span className={tbDivider} />

        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("insertUnorderedList")} title="Lista" aria-label="Lista"><List className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("insertOrderedList")} title="Lista numerada" aria-label="Lista numerada"><ListOrdered className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={() => doExec("insertHorizontalRule")} title="Linha" aria-label="Linha"><Minus className="h-4 w-4" /></button>
        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={insertTable} title="Tabela" aria-label="Tabela"><TableIcon className="h-4 w-4" /></button>

        <span className={tbDivider} />

        <button type="button" className={tbBtn} onMouseDown={preventBlur} onClick={insertLink} title="Link" aria-label="Link"><Link2 className="h-4 w-4" /></button>
        <button
          type="button"
          className={tbBtn}
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => setImgOpen(true)}
          title="Imagem" aria-label="Imagem"
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        <span className={tbDivider} />

        {/* Variáveis */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 gap-1 bg-background/80"
              onMouseDown={() => saveSelection()}
            >
              <Braces className="h-4 w-4" /> Variáveis
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={`w-[calc(100vw-2rem)] sm:w-80 max-h-[70dvh] sm:max-h-[420px] overflow-y-auto p-2 ${OVERLAY_Z} bg-popover shadow-xl border`}
            align="start"
          >
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
                        onMouseDown={preventBlur}
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
            <span className={tbDivider} />
            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1 text-xs"
              onMouseDown={preventBlur}
              onClick={() => insertHtml("{{pagina_atual}}")}
              title="Inserir número da página atual" aria-label="Inserir número da página atual">
              Página nº
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1 text-xs"
              onMouseDown={preventBlur}
              onClick={() => insertHtml("Página {{pagina_atual}} de {{total_paginas}}")}
              title="Inserir 'Página X de Y'" aria-label="Inserir 'Página X de Y'">
              X de Y
            </Button>
          </>
        )}
      </div>

      {/* Editor surface — canvas estilo Google Docs */}
      <div
        ref={surfaceRef}
        className={
          compact
            ? "bg-background relative"
            : "bg-[#f1f3f4] dark:bg-[#1b1b1f] px-2 py-4 sm:px-4 sm:py-6 md:py-10 overflow-auto relative"
        }
        style={compact ? undefined : { maxHeight: "calc(100dvh - 260px)" }}
      >
        <div
          className={
            compact
              ? ""
              : "mx-auto bg-white text-neutral-900 shadow-[0_1px_3px_rgba(60,64,67,0.15),0_4px_10px_rgba(60,64,67,0.12)] rounded-sm"
          }
          style={
            compact
              ? undefined
              : {
                  width: "min(816px, 100%)",
                  minHeight: `${Math.max(minHeight, 1056)}px`,
                }
          }
        >
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
            className={`focus:outline-none prose prose-sm max-w-none text-neutral-900 leading-[1.7] [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-neutral-700 [&_table]:border-collapse [&_table_td]:border [&_table_td]:border-neutral-300 [&_table_td]:p-1 [&_a]:text-blue-600 [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 ${compact ? "px-3 py-2" : "px-6 py-8 sm:px-12 sm:py-12 md:px-[96px] md:py-[96px]"}`}
            style={{
              minHeight: compact ? Math.min(minHeight, 120) : minHeight,
              fontFamily: "'Arial', 'Helvetica', sans-serif",
              fontSize: compact ? undefined : "11pt",
            }}
          />
        </div>


        {/* Overlay de redimensionamento livre da imagem selecionada */}
        {selectedImg && imgBox && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: imgBox.left,
              top: imgBox.top,
              width: imgBox.width,
              height: imgBox.height,
              zIndex: 20,
            }}
          >
            <div className="absolute inset-0 border-2 border-primary/70 shadow-[0_0_0_1px_rgba(255,255,255,0.6)]" />
            {/* Botão para excluir a imagem selecionada */}
            <button
              type="button"
              title="Excluir imagem" aria-label="Excluir imagem"
              className="pointer-events-auto absolute -top-3 -right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!selectedImg) return;
                selectedImg.remove();
                setSelectedImg(null);
                setImgBox(null);
                handleInput();
                toast.success("Imagem removida");
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {(["nw","n","ne","e","se","s","sw","w"] as const).map((pos) => {
              const style: React.CSSProperties = { position: "absolute", width: 10, height: 10, background: "white", border: "1.5px solid hsl(var(--primary))", borderRadius: 2 };
              const cursors: Record<string,string> = { nw:"nwse-resize", n:"ns-resize", ne:"nesw-resize", e:"ew-resize", se:"nwse-resize", s:"ns-resize", sw:"nesw-resize", w:"ew-resize" };
              if (pos.includes("n")) style.top = -6; if (pos.includes("s")) style.bottom = -6;
              if (pos.includes("w")) style.left = -6; if (pos.includes("e")) style.right = -6;
              if (pos === "n" || pos === "s") { style.left = "50%"; style.transform = "translateX(-50%)"; }
              if (pos === "e" || pos === "w") { style.top = "50%"; style.transform = "translateY(-50%)"; }
              return (
                <div
                  key={pos}
                  className="pointer-events-auto"
                  style={{ ...style, cursor: cursors[pos] }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!selectedImg) return;
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startW = selectedImg.getBoundingClientRect().width;
                    const startH = selectedImg.getBoundingClientRect().height;
                    const dirX = pos.includes("e") ? 1 : pos.includes("w") ? -1 : 0;
                    const dirY = pos.includes("s") ? 1 : pos.includes("n") ? -1 : 0;
                    // Remove max-width restriction to allow free resize.
                    selectedImg.style.maxWidth = "none";
                    const onMove = (ev: MouseEvent) => {
                      const dx = (ev.clientX - startX) * dirX;
                      const dy = (ev.clientY - startY) * dirY;
                      let w = startW + dx;
                      let h = startH + dy;
                      if (ev.shiftKey && dirX !== 0 && dirY !== 0) {
                        // Manter proporção quando arrastando pelos cantos com Shift.
                        const ratio = startW / startH;
                        if (Math.abs(dx) > Math.abs(dy)) h = w / ratio; else w = h * ratio;
                      }
                      w = Math.max(24, w);
                      h = Math.max(24, h);
                      if (dirX !== 0) selectedImg.style.width = `${Math.round(w)}px`;
                      if (dirY !== 0) selectedImg.style.height = `${Math.round(h)}px`;
                      recomputeImgBox();
                    };
                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                      handleInput();
                      recomputeImgBox();
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>



      {/* Image dialog */}
      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="z-[140]">
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
