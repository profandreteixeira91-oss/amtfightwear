import { useMemo, useRef, useState } from "react";
import { useStudioStore, CERT_FONTS, PAGE_PRESETS, type PagePreset } from "@/lib/dojo/certificates/studio-store";
import { VARIABLE_MENU } from "@/lib/dojo/certificates/export";
import { ORNAMENTS, svgToDataUrl, FONT_PAIRINGS, type SvgAsset } from "@/lib/dojo/certificates/ornaments";
import { makeTextElement, makeVariableElement, makeShapeElement, makeImageElement, makeQrElement } from "./StudioCanvas";
import { supabase } from "@/integrations/supabase/client";
import { Type, Variable, Image as ImageIcon, Shapes, QrCode, Signature, BadgeCheck, Layout, Search, Upload, Circle, Square, Minus, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { makeId } from "@/components/dojo/certificate-editor/types";

const SECTIONS = [
  { id: "templates", label: "Modelos", icon: Layout },
  { id: "text", label: "Textos", icon: Type },
  { id: "vars", label: "Variáveis", icon: Variable },
  { id: "images", label: "Imagens", icon: ImageIcon },
  { id: "icons", label: "Ícones", icon: Star },
  { id: "ornaments", label: "Ornamentos", icon: Sparkles },
  { id: "logo", label: "Logo", icon: BadgeCheck },
  { id: "sig", label: "Assinaturas", icon: Signature },
  { id: "qr", label: "QR Code", icon: QrCode },
  { id: "shapes", label: "Formas", icon: Shapes },
  { id: "page", label: "Página", icon: Layout },
] as const;

export function StudioLeft() {
  const [tab, setTab] = useState<typeof SECTIONS[number]["id"]>("text");
  return (
    <aside className="hidden md:flex h-full w-[320px] shrink-0 border-r border-neutral-200 bg-white">
      <nav className="flex flex-col w-16 border-r border-neutral-200 bg-neutral-50">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setTab(s.id)}
            className={`flex flex-col items-center gap-1 py-3 text-[10px] font-medium ${tab === s.id ? "bg-red-700 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>
            <s.icon className="h-4 w-4" />
            <span>{s.label}</span>
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "text" && <TextsPanel />}
        {tab === "vars" && <VariablesPanel />}
        {tab === "images" && <ImagesPanel />}
        {tab === "icons" && <IconsPanel />}
        {tab === "ornaments" && <OrnamentsPanel />}
        {tab === "logo" && <LogoPanel />}
        {tab === "sig" && <SignaturePanel />}
        {tab === "qr" && <QrPanel />}
        {tab === "shapes" && <ShapesPanel />}
        {tab === "page" && <PagePanel />}
        {tab === "templates" && <TemplatesPanel />}
      </div>
    </aside>
  );
}

/** Insert an SVG ornament/icon as an image element with a colored data URL. */
function insertSvgAsset(asset: SvgAsset, color: string, addElement: (el: any) => void, size: { w: number; h: number }) {
  const url = svgToDataUrl(asset.svg(color), color);
  addElement({
    id: makeId(),
    kind: "image",
    imageUrl: url,
    x: 50,
    y: 50,
    w: size.w,
    h: size.h,
    fit: "contain",
    name: asset.label,
  });
}

function TextsPanel() {
  const { addElement } = useStudioStore();
  const presets = [
    { label: "Título", opts: { fontSize: 72, bold: true, fontFamily: "Cinzel", uppercase: true, text: "CERTIFICADO" } },
    { label: "Subtítulo", opts: { fontSize: 32, fontFamily: "Playfair Display", text: "Subtítulo elegante" } },
    { label: "Corpo", opts: { fontSize: 20, fontFamily: "Cormorant Garamond", text: "Texto do certificado" } },
    { label: "Nome", opts: { fontSize: 56, bold: true, fontFamily: "Playfair Display", text: "Nome do aluno" } },
    { label: "Cursiva", opts: { fontSize: 44, fontFamily: "Great Vibes", text: "Nome do aluno" } },
    { label: "Legenda", opts: { fontSize: 14, fontFamily: "Inter", color: "#64748b", text: "Legenda" } },
  ];
  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={() => addElement(makeTextElement("Digite aqui"))}>+ Adicionar texto</Button>
      <div className="pt-2 space-y-2">
        {presets.map((p) => (
          <button key={p.label} onClick={() => addElement(makeTextElement(p.opts.text, p.opts as any))}
            className="w-full text-left p-3 rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50 transition">
            <div className="text-xs text-neutral-500">{p.label}</div>
            <div style={{ fontFamily: p.opts.fontFamily, fontWeight: p.opts.bold ? 800 : 400, textTransform: (p.opts as any).uppercase ? "uppercase" : "none" }}
              className="text-lg truncate">
              {p.opts.text}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function VariablesPanel() {
  const { addElement } = useStudioStore();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return VARIABLE_MENU.map((c) => ({ ...c, items: c.items.filter((i) => !query || i.key.includes(query) || i.label.toLowerCase().includes(query)) }))
      .filter((c) => c.items.length);
  }, [q]);
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
        <Input placeholder="Buscar variável..." className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.map((cat) => (
        <div key={cat.id}>
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{cat.label}</div>
          <div className="grid grid-cols-1 gap-1">
            {cat.items.map((v) => (
              <button key={v.key}
                onClick={() => addElement(makeVariableElement(v.key))}
                className="text-left px-2 py-1.5 rounded border border-neutral-200 hover:border-red-700 hover:bg-red-50 text-sm">
                <span className="text-red-700 font-mono text-xs">{`{{${v.key}}}`}</span>
                <div className="text-neutral-600">{v.label}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImagesPanel() {
  const { addElement } = useStudioStore();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const path = `certificates/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("ig-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("ig-media").getPublicUrl(path);
      addElement(makeImageElement(data.publicUrl, "image"));
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar imagem");
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <Button className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando..." : "Fazer upload"}
      </Button>
      <div className="text-xs text-neutral-500">Ou cole a URL:</div>
      <UrlAdd onAdd={(url) => addElement(makeImageElement(url, "image"))} />
    </div>
  );
}

function LogoPanel() {
  const { addElement } = useStudioStore();
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => addElement(makeImageElement("", "logo"))}>
        + Adicionar logo da academia
      </Button>
      <p className="text-xs text-neutral-500">O logo puxará automaticamente a URL da academia ao emitir o certificado. Você também pode colar uma URL específica:</p>
      <UrlAdd onAdd={(url) => addElement(makeImageElement(url, "logo"))} />
    </div>
  );
}

function SignaturePanel() {
  const { addElement } = useStudioStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    try {
      const path = `certificates/sig-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("ig-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("ig-media").getPublicUrl(path);
      addElement(makeImageElement(data.publicUrl, "signature"));
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    } finally { setUploading(false); }
  };
  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <Button className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando..." : "Enviar assinatura (PNG)"}
      </Button>
      <Button variant="outline" className="w-full" onClick={() => addElement(makeImageElement("", "signature"))}>Assinatura vazia (placeholder)</Button>
    </div>
  );
}

function QrPanel() {
  const { addElement } = useStudioStore();
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => addElement(makeQrElement())}>+ Adicionar QR Code</Button>
      <p className="text-xs text-neutral-500">Por padrão, o QR aponta para a página pública de validação. Ajuste o conteúdo no painel de propriedades.</p>
    </div>
  );
}

function ShapesPanel() {
  const { addElement } = useStudioStore();
  return (
    <div className="grid grid-cols-3 gap-2">
      <ShapeButton icon={Square} label="Retângulo" onClick={() => addElement(makeShapeElement("rect"))} />
      <ShapeButton icon={Circle} label="Círculo" onClick={() => addElement(makeShapeElement("circle"))} />
      <ShapeButton icon={Minus} label="Linha" onClick={() => addElement(makeShapeElement("line"))} />
    </div>
  );
}
function ShapeButton({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="aspect-square rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50 flex flex-col items-center justify-center gap-1 text-xs">
      <Icon className="h-6 w-6" />
      {label}
    </button>
  );
}

function PagePanel() {
  const { doc, setPage } = useStudioStore();
  const currentPreset = (Object.keys(PAGE_PRESETS) as PagePreset[]).find(
    (k) => PAGE_PRESETS[k].width === doc.page.width && PAGE_PRESETS[k].height === doc.page.height
  ) ?? "custom";
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-neutral-600">Tamanho</label>
        <select className="w-full mt-1 h-9 rounded-md border border-neutral-200 px-2 text-sm"
          value={currentPreset}
          onChange={(e) => {
            const p = PAGE_PRESETS[e.target.value as PagePreset];
            setPage({ width: p.width, height: p.height });
          }}>
          {Object.entries(PAGE_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-neutral-600">Largura</label>
          <Input type="number" value={doc.page.width} onChange={(e) => setPage({ width: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-neutral-600">Altura</label>
          <Input type="number" value={doc.page.height} onChange={(e) => setPage({ height: Number(e.target.value) })} />
        </div>
      </div>
      <div>
        <label className="text-xs text-neutral-600">Margem</label>
        <Input type="number" value={doc.page.margin ?? 0} onChange={(e) => setPage({ margin: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-xs text-neutral-600">Cor de fundo</label>
        <Input type="color" value={doc.page.background || "#ffffff"} onChange={(e) => setPage({ background: e.target.value })} />
      </div>
      <div>
        <label className="text-xs text-neutral-600">Imagem de fundo (URL)</label>
        <Input value={doc.page.backgroundUrl || ""} onChange={(e) => setPage({ backgroundUrl: e.target.value })} placeholder="https://..." />
      </div>
    </div>
  );
}

function TemplatesPanel() {
  return (
    <div className="text-sm text-neutral-600 space-y-2">
      <p>Voltar à página inicial para escolher outro modelo, ou salvar o documento atual como novo modelo.</p>
    </div>
  );
}

function UrlAdd({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="flex gap-2">
      <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
      <Button variant="outline" onClick={() => { if (url.trim()) { onAdd(url.trim()); setUrl(""); } }}>Adicionar</Button>
    </div>
  );
}
