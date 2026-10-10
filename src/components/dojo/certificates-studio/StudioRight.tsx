import { useMemo, useState } from "react";
import { useStudioStore, CERT_FONTS } from "@/lib/dojo/certificates/studio-store";
import type { AnyElement, TextElement, ImageElement, ShapeElement, QrElement } from "@/components/dojo/certificate-editor/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline, Lock, Unlock, Eye, EyeOff, Trash2, Copy, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Type as TypeIcon, Search, ChevronLeft } from "lucide-react";

export function StudioRight() {
  const { doc, selection, updateSelected, deleteSelected, duplicateSelected, bringForward, sendBackward, bringToFront, sendToBack, toggleLock, toggleHidden, pushHistory } = useStudioStore();
  const el = useMemo(() => doc.elements.find((e) => e.id === selection[0]) ?? null, [doc.elements, selection]);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Trigger */}
      {el && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir propriedades do elemento"
          className="md:hidden fixed bottom-20 right-4 z-40 h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" /> Propriedades
        </button>
      )}

      <aside className={`
        fixed top-0 bottom-16 right-0 z-50 w-[min(320px,88vw)] bg-card border-l border-border flex flex-col transition-transform duration-300 ease-in-out
        md:static md:h-auto md:w-[260px] lg:w-[288px] xl:w-[320px] md:shrink-0 md:translate-x-0
        ${mobileOpen && el ? "translate-x-0" : "translate-x-full"}
      `}>
        <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(false)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
              {el ? (el.name || labelForKind(el.kind)) : "Propriedades"}
            </span>
          </div>
          {el && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => toggleLock(el.id)} title={el.locked ? "Desbloquear" : "Bloquear"}>
                {el.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => toggleHidden(el.id)} title={el.hidden ? "Mostrar" : "Ocultar"}>
                {el.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => duplicateSelected()} title="Duplicar">
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => deleteSelected()} title="Excluir" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Excluir elemento">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto shrink-0">
          {!el ? (
            <div className="p-4 text-sm text-muted-foreground">
              Selecione um elemento para editar suas propriedades. Use os atalhos: <b>Ctrl+Z</b> desfazer, <b>Ctrl+D</b> duplicar, <b>Del</b> excluir.
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {(el.kind === "text" || el.kind === "date") && <TextProps el={el as TextElement} />}
              {(el.kind === "image" || el.kind === "logo" || el.kind === "signature") && <ImageProps el={el as ImageElement} />}
              {(el.kind === "rect" || el.kind === "circle" || el.kind === "line") && <ShapeProps el={el as ShapeElement} />}
              {el.kind === "qr" && <QrProps el={el as QrElement} />}

              <hr className="border-neutral-200" />
              <PositionProps el={el} />

              <hr className="border-neutral-200" />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => bringForward(el.id)}><ArrowUp className="h-4 w-4 mr-1" /> Frente</Button>
                <Button variant="outline" size="sm" onClick={() => sendBackward(el.id)}><ArrowDown className="h-4 w-4 mr-1" /> Trás</Button>
                <Button variant="outline" size="sm" onClick={() => bringToFront(el.id)}><ChevronsUp className="h-4 w-4 mr-1" /> Frente total</Button>
                <Button variant="outline" size="sm" onClick={() => sendToBack(el.id)}><ChevronsDown className="h-4 w-4 mr-1" /> Fundo</Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-neutral-200 shrink-0">
          <LayersList />
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && el && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}

function labelForKind(k: string) {
  const map: Record<string, string> = { text: "Texto", date: "Data", image: "Imagem", logo: "Logo", signature: "Assinatura", rect: "Retângulo", circle: "Círculo", line: "Linha", qr: "QR Code" };
  return map[k] || k;
}

function TextProps({ el }: { el: TextElement }) {
  const { doc, updateElement, pushHistory } = useStudioStore();
  const commit = () => pushHistory();
  const autoContrast = () => {
    // Detect page bg luminance and set text color for readability
    const bg = doc.page.background || "#ffffff";
    const hex = bg.replace("#", "");
    const r = parseInt(hex.slice(0, 2) || "ff", 16);
    const g = parseInt(hex.slice(2, 4) || "ff", 16);
    const b = parseInt(hex.slice(4, 6) || "ff", 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const next = lum > 0.6 ? "#0f172a" : "#ffffff";
    updateElement(el.id, { color: next } as any);
    commit();
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-neutral-600">Texto</label>
        <Textarea value={el.text} onChange={(e) => updateElement(el.id, { text: e.target.value } as any)} onBlur={commit} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-neutral-600">Fonte</label>
          <select className="w-full h-9 rounded-md border border-neutral-200 px-2 text-sm"
            value={el.fontFamily || "Inter"}
            onChange={(e) => { updateElement(el.id, { fontFamily: e.target.value } as any); commit(); }}>
            {CERT_FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-600">Tamanho</label>
          <Input type="number" value={el.fontSize} onChange={(e) => updateElement(el.id, { fontSize: Number(e.target.value) } as any)} onBlur={commit} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ToggleBtn on={!!el.bold} onClick={() => { updateElement(el.id, { bold: !el.bold } as any); commit(); }}><Bold className="h-4 w-4" /></ToggleBtn>
        <ToggleBtn on={!!el.italic} onClick={() => { updateElement(el.id, { italic: !el.italic } as any); commit(); }}><Italic className="h-4 w-4" /></ToggleBtn>
        <ToggleBtn on={!!el.underline} onClick={() => { updateElement(el.id, { underline: !el.underline } as any); commit(); }}><Underline className="h-4 w-4" /></ToggleBtn>
        <ToggleBtn on={!!el.uppercase} onClick={() => { updateElement(el.id, { uppercase: !el.uppercase } as any); commit(); }} title="Caixa alta"><TypeIcon className="h-4 w-4" /></ToggleBtn>
        <div className="mx-1 h-6 border-l border-neutral-200" />
        <ToggleBtn on={el.align === "left"} onClick={() => { updateElement(el.id, { align: "left" } as any); commit(); }}><AlignLeft className="h-4 w-4" /></ToggleBtn>
        <ToggleBtn on={el.align === "center"} onClick={() => { updateElement(el.id, { align: "center" } as any); commit(); }}><AlignCenter className="h-4 w-4" /></ToggleBtn>
        <ToggleBtn on={el.align === "right"} onClick={() => { updateElement(el.id, { align: "right" } as any); commit(); }}><AlignRight className="h-4 w-4" /></ToggleBtn>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-neutral-600">Cor do texto</label>
          <Input type="color" value={el.color} onChange={(e) => updateElement(el.id, { color: e.target.value } as any)} onBlur={commit} />
        </div>
        <div>
          <label className="text-xs text-neutral-600">Espaçamento</label>
          <Input type="number" step={0.1} value={el.letterSpacing ?? 0} onChange={(e) => updateElement(el.id, { letterSpacing: Number(e.target.value) } as any)} onBlur={commit} />
        </div>
      </div>
      <div>
        <label className="text-xs text-neutral-600">Altura de linha</label>
        <Input type="number" step={0.05} value={el.lineHeight ?? 1.25} onChange={(e) => updateElement(el.id, { lineHeight: Number(e.target.value) } as any)} onBlur={commit} />
      </div>
      <button onClick={autoContrast} className="w-full text-xs py-2 rounded-lg border border-dashed border-neutral-300 hover:bg-neutral-50">
        Ajustar cor automaticamente ao fundo da página
      </button>

      <hr className="border-neutral-200" />
      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Caixa de texto</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-neutral-600">Fundo</label>
          <div className="flex gap-1">
            <Input type="color" value={el.background || "#ffffff"} onChange={(e) => updateElement(el.id, { background: e.target.value } as any)} onBlur={commit} />
            <button title="Sem fundo" onClick={() => { updateElement(el.id, { background: "" } as any); commit(); }}
              className="h-9 px-2 text-xs rounded-md border border-neutral-200 hover:bg-neutral-50">✕</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-neutral-600">Alinh. vertical</label>
          <select className="w-full h-9 rounded-md border border-neutral-200 px-2 text-sm"
            value={el.verticalAlign || "middle"}
            onChange={(e) => { updateElement(el.id, { verticalAlign: e.target.value } as any); commit(); }}>
            <option value="top">Topo</option>
            <option value="middle">Meio</option>
            <option value="bottom">Base</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-600">Padding (px)</label>
          <Input type="number" value={el.padding ?? 0} onChange={(e) => updateElement(el.id, { padding: Number(e.target.value) } as any)} onBlur={commit} />
        </div>
        <div>
          <label className="text-xs text-neutral-600">Cantos (px)</label>
          <Input type="number" value={el.borderRadius ?? 0} onChange={(e) => updateElement(el.id, { borderRadius: Number(e.target.value) } as any)} onBlur={commit} />
        </div>
        <div>
          <label className="text-xs text-neutral-600">Borda</label>
          <Input type="color" value={el.borderColor || "#000000"} onChange={(e) => updateElement(el.id, { borderColor: e.target.value } as any)} onBlur={commit} />
        </div>
        <div>
          <label className="text-xs text-neutral-600">Espessura</label>
          <Input type="number" value={el.borderWidth ?? 0} onChange={(e) => updateElement(el.id, { borderWidth: Number(e.target.value) } as any)} onBlur={commit} />
        </div>
      </div>
    </div>
  );
}

function ImageProps({ el }: { el: ImageElement }) {
  const { updateElement, pushHistory } = useStudioStore();
  const commit = () => pushHistory();
  const f = el.filters ?? {};
  const setFilter = (k: string, v: number) => updateElement(el.id, { filters: { ...f, [k]: v } } as any);
  const resetFilters = () => { updateElement(el.id, { filters: {} } as any); commit(); };
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-neutral-600">URL da imagem</label>
        <Input value={el.imageUrl} onChange={(e) => updateElement(el.id, { imageUrl: e.target.value } as any)} onBlur={commit} />
      </div>
      <div>
        <label className="text-xs text-neutral-600">Ajuste</label>
        <select className="w-full h-9 rounded-md border border-neutral-200 px-2 text-sm"
          value={el.fit || "contain"} onChange={(e) => { updateElement(el.id, { fit: e.target.value } as any); commit(); }}>
          <option value="contain">Conter</option>
          <option value="cover">Preencher</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-neutral-600">Máscara</label>
        <select className="w-full h-9 rounded-md border border-neutral-200 px-2 text-sm"
          value={el.mask || "none"} onChange={(e) => { updateElement(el.id, { mask: e.target.value } as any); commit(); }}>
          <option value="none">Nenhuma</option>
          <option value="rounded">Cantos arredondados</option>
          <option value="squircle">Squircle</option>
          <option value="circle">Círculo</option>
        </select>
      </div>
      <div className="pt-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Filtros</span>
          <button onClick={resetFilters} className="text-[10px] text-red-700 hover:underline">Redefinir</button>
        </div>
        <FilterSlider label="Brilho" value={f.brightness ?? 100} min={0} max={200} onChange={(v) => setFilter("brightness", v)} onCommit={commit} />
        <FilterSlider label="Contraste" value={f.contrast ?? 100} min={0} max={200} onChange={(v) => setFilter("contrast", v)} onCommit={commit} />
        <FilterSlider label="Saturação" value={f.saturate ?? 100} min={0} max={200} onChange={(v) => setFilter("saturate", v)} onCommit={commit} />
        <FilterSlider label="Escala de cinza" value={f.grayscale ?? 0} min={0} max={100} onChange={(v) => setFilter("grayscale", v)} onCommit={commit} />
        <FilterSlider label="Sépia" value={f.sepia ?? 0} min={0} max={100} onChange={(v) => setFilter("sepia", v)} onCommit={commit} />
        <FilterSlider label="Desfoque" value={f.blur ?? 0} min={0} max={20} onChange={(v) => setFilter("blur", v)} onCommit={commit} />
      </div>
      <div>
        <label className="text-xs text-neutral-600">Sombra (CSS box-shadow)</label>
        <Input value={el.shadow || ""} placeholder="0 4px 20px rgba(0,0,0,.2)"
          onChange={(e) => updateElement(el.id, { shadow: e.target.value } as any)} onBlur={commit} />
      </div>
      <button
        onClick={() => toastRemoveBg()}
        className="w-full text-xs py-2 rounded-lg border border-dashed border-neutral-300 text-neutral-600 hover:bg-neutral-50">
        Remover fundo (em breve)
      </button>
    </div>
  );
}

function FilterSlider({ label, value, min, max, onChange, onCommit }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; onCommit: () => void }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-neutral-500"><span>{label}</span><span>{value}</span></div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} onValueCommit={onCommit} />
    </div>
  );
}

function toastRemoveBg() {
  import("sonner").then(({ toast }) => toast.info("Remoção de fundo será integrada em breve."));
}

function ShapeProps({ el }: { el: ShapeElement }) {
  const { updateElement, pushHistory } = useStudioStore();
  const commit = () => pushHistory();
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-neutral-600">Cor</label>
        <Input type="color" value={el.fill || "#000000"} onChange={(e) => updateElement(el.id, { fill: e.target.value } as any)} onBlur={commit} />
      </div>
      {el.kind !== "line" && (
        <>
          <div>
            <label className="text-xs text-neutral-600">Borda</label>
            <Input type="color" value={el.stroke || "#000000"} onChange={(e) => updateElement(el.id, { stroke: e.target.value } as any)} onBlur={commit} />
          </div>
          <div>
            <label className="text-xs text-neutral-600">Espessura da borda</label>
            <Input type="number" value={el.strokeWidth ?? 0} onChange={(e) => updateElement(el.id, { strokeWidth: Number(e.target.value) } as any)} onBlur={commit} />
          </div>
        </>
      )}
      {el.kind === "rect" && (
        <div>
          <label className="text-xs text-neutral-600">Cantos arredondados</label>
          <Input type="number" value={el.radius ?? 0} onChange={(e) => updateElement(el.id, { radius: Number(e.target.value) } as any)} onBlur={commit} />
        </div>
      )}
    </div>
  );
}

function QrProps({ el }: { el: QrElement }) {
  const { updateElement, pushHistory } = useStudioStore();
  const commit = () => pushHistory();
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-neutral-600">Conteúdo (aceita {`{{variaveis}}`})</label>
        <Input value={el.qrValue} onChange={(e) => updateElement(el.id, { qrValue: e.target.value } as any)} onBlur={commit} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-neutral-600">Cor</label>
          <Input type="color" value={el.color || "#000000"} onChange={(e) => updateElement(el.id, { color: e.target.value } as any)} onBlur={commit} />
        </div>
        <div>
          <label className="text-xs text-neutral-600">Fundo</label>
          <Input type="color" value={el.bg || "#ffffff"} onChange={(e) => updateElement(el.id, { bg: e.target.value } as any)} onBlur={commit} />
        </div>
      </div>
    </div>
  );
}

function PositionProps({ el }: { el: AnyElement }) {
  const { updateElement, pushHistory } = useStudioStore();
  const commit = () => pushHistory();
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-neutral-600">Posição X (%)</label>
          <Input type="number" step={0.5} value={el.x} onChange={(e) => updateElement(el.id, { x: Number(e.target.value) } as any)} onBlur={commit} />
        </div>
        <div>
          <label className="text-xs text-neutral-600">Posição Y (%)</label>
          <Input type="number" step={0.5} value={el.y} onChange={(e) => updateElement(el.id, { y: Number(e.target.value) } as any)} onBlur={commit} />
        </div>
        {el.w != null && (
          <div>
            <label className="text-xs text-neutral-600">Largura (%)</label>
            <Input type="number" step={0.5} value={el.w} onChange={(e) => updateElement(el.id, { w: Number(e.target.value) } as any)} onBlur={commit} />
          </div>
        )}
        {el.h != null && (
          <div>
            <label className="text-xs text-neutral-600">Altura (%)</label>
            <Input type="number" step={0.5} value={el.h} onChange={(e) => updateElement(el.id, { h: Number(e.target.value) } as any)} onBlur={commit} />
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-neutral-600">Rotação: {Math.round(el.rotation ?? 0)}°</label>
        <Slider value={[el.rotation ?? 0]} min={-180} max={180} step={1}
          onValueChange={(v) => updateElement(el.id, { rotation: v[0] } as any)}
          onValueCommit={commit} />
      </div>
      <div>
        <label className="text-xs text-neutral-600">Opacidade: {Math.round((el.opacity ?? 1) * 100)}%</label>
        <Slider value={[Math.round((el.opacity ?? 1) * 100)]} min={0} max={100} step={1}
          onValueChange={(v) => updateElement(el.id, { opacity: v[0] / 100 } as any)}
          onValueCommit={commit} />
      </div>
    </div>
  );
}

function ToggleBtn({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button title={title} onClick={onClick}
      className={`h-8 w-8 rounded-md flex items-center justify-center border ${on ? "bg-red-700 text-white border-red-700" : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"}`}>
      {children}
    </button>
  );
}

function LayersList() {
  const { doc, selection, select, toggleLock, toggleHidden, bringForward, sendBackward } = useStudioStore();
  const sorted = [...doc.elements].sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
  return (
    <div className="p-2 max-h-[240px] overflow-y-auto">
      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide px-2 pb-1">Camadas</div>
      <div className="space-y-1">
        {sorted.map((el) => (
          <div key={el.id}
            onClick={() => select([el.id])}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${selection.includes(el.id) ? "bg-red-50 text-red-800" : "hover:bg-neutral-50"}`}>
            <button onClick={(e) => { e.stopPropagation(); toggleHidden(el.id); }}>
              {el.hidden ? <EyeOff className="h-3.5 w-3.5 text-neutral-400" /> : <Eye className="h-3.5 w-3.5 text-neutral-500" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}>
              {el.locked ? <Lock className="h-3.5 w-3.5 text-neutral-500" /> : <Unlock className="h-3.5 w-3.5 text-neutral-300" />}
            </button>
            <span className="flex-1 truncate">{el.name || labelForKind(el.kind)}</span>
          </div>
        ))}
        {sorted.length === 0 && <div className="text-xs text-neutral-400 px-2 py-2">Nenhum elemento.</div>}
      </div>
    </div>
  );
}
