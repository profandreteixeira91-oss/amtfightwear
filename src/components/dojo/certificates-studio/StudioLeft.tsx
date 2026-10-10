import { useMemo, useRef, useState } from "react";
import { useStudioStore, CERT_FONTS, PAGE_PRESETS, type PagePreset } from "@/lib/dojo/certificates/studio-store";
import { VARIABLE_MENU } from "@/lib/dojo/certificates/export";
import { ORNAMENTS, svgToDataUrl, FONT_PAIRINGS, type SvgAsset } from "@/lib/dojo/certificates/ornaments";
import { makeTextElement, makeVariableElement, makeShapeElement, makeImageElement, makeQrElement } from "./StudioCanvas";
import { CertificateRenderer } from "./CertificateRenderer";
import { CERTIFICATE_PRESETS } from "@/lib/dojo/certificates/presets";
import { supabase } from "@/integrations/supabase/client";
import { Type, Variable, Image as ImageIcon, Shapes, QrCode, Signature, BadgeCheck, Layout, Search, Upload, Circle, Square, Minus, Sparkles, Star, ChevronLeft } from "lucide-react";
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
  const [tab, setTab] = useState<typeof SECTIONS[number]["id"]>("templates");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2">
        {SECTIONS.slice(0, 5).map((s) => (
          <button key={s.id} onClick={() => { setTab(s.id); setMobileOpen(true); }}
            className={`flex flex-col items-center gap-1 p-2 text-[10px] font-medium ${tab === s.id && mobileOpen ? "text-primary" : "text-muted-foreground"}`}>
            <s.icon className="h-5 w-5" />
            <span>{s.label}</span>
          </button>
        ))}
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className={`flex flex-col items-center gap-1 p-2 text-[10px] font-medium ${mobileOpen ? "text-primary font-bold" : "text-muted-foreground"}`}>
          <Layout className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </div>

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside className={`
        fixed top-0 bottom-16 left-0 z-50 w-[min(320px,88vw)] bg-card border-r border-border flex transition-transform duration-300 ease-in-out
        md:static md:h-auto md:w-[272px] lg:w-[300px] xl:w-[320px] md:shrink-0 md:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <nav aria-label="Ferramentas do editor" className="flex flex-col w-16 border-r border-border bg-muted/40 shrink-0 overflow-y-auto no-scrollbar">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setTab(s.id)}
              aria-pressed={tab === s.id} className={`mx-1.5 my-0.5 flex flex-col items-center gap-1 rounded-md py-2.5 text-[10px] font-medium shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <s.icon className="h-4 w-4" />
              <span>{s.label}</span>
            </button>
          ))}
          {/* Close button for mobile */}
          <button onClick={() => setMobileOpen(false)} aria-label="Fechar ferramentas" className="md:hidden mt-auto py-4 text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-6 w-6 mx-auto" />
          </button>
        </nav>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-4 md:hidden">
            <h3 className="font-bold text-foreground">{SECTIONS.find(s => s.id === tab)?.label}</h3>
            <Button variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>Fechar</Button>
          </div>
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

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
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
    <div className="space-y-3">
      <Button className="w-full" onClick={() => addElement(makeTextElement("Digite aqui"))}>+ Adicionar texto</Button>

      <div>
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Combinações de fontes</div>
        <div className="grid grid-cols-1 gap-1.5">
          {FONT_PAIRINGS.map((p) => (
            <button key={p.id}
              onClick={() => {
                addElement(makeTextElement("CERTIFICADO", { fontFamily: p.title, fontSize: 72, bold: true, uppercase: true, x: 50, y: 25 } as any));
                setTimeout(() => addElement(makeTextElement("Texto do certificado", { fontFamily: p.body, fontSize: 22, x: 50, y: 55 } as any)), 30);
              }}
              className="w-full text-left p-2.5 rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50 transition">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">{p.label}</div>
              <div style={{ fontFamily: p.title }} className="text-base font-bold leading-tight">{p.title}</div>
              <div style={{ fontFamily: p.body }} className="text-xs text-neutral-600">{p.body}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Presets</div>
        <div className="space-y-2">
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
    </div>
  );
}

function IconsPanel() {
  const { addElement } = useStudioStore();
  const [q, setQ] = useState("");
  const [color, setColor] = useState("#b91c1c");
  const items = ORNAMENTS.filter((a) => a.category === "icon" && (!q || a.label.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
        <Input placeholder="Buscar ícone..." className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-600">Cor</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 rounded border border-neutral-200" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((a) => (
          <button key={a.id} title={a.label}
            onClick={() => insertSvgAsset(a, color, addElement, { w: 10, h: 10 })}
            className="aspect-square rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50 flex items-center justify-center p-2">
            <div style={{ color, width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: a.svg(color) }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function OrnamentsPanel() {
  const { addElement } = useStudioStore();
  const [color, setColor] = useState("#0f172a");
  const groups = [
    { key: "divider", label: "Divisores", size: { w: 45, h: 4 } },
    { key: "ornament", label: "Ornamentos", size: { w: 40, h: 6 } },
    { key: "frame", label: "Molduras", size: { w: 85, h: 60 } },
  ] as const;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-600">Cor</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 rounded border border-neutral-200" />
      </div>
      {groups.map((g) => {
        const items = ORNAMENTS.filter((a) => a.category === g.key);
        return (
          <div key={g.key}>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{g.label}</div>
            <div className="space-y-2">
              {items.map((a) => (
                <button key={a.id}
                  onClick={() => insertSvgAsset(a, color, addElement, g.size)}
                  className="w-full rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50 p-2 flex items-center gap-2">
                  <div style={{ color, width: 80, height: g.key === "frame" ? 44 : 20, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: a.svg(color) }} />
                  <span className="text-xs text-neutral-600 truncate">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    try {
      const path = `certificates/logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("ig-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("ig-media").getPublicUrl(path);
      addElement(makeImageElement(data.publicUrl, "logo"));
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar logo");
    } finally { setUploading(false); }
  };
  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <Button className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando..." : "Fazer upload do logo"}
      </Button>
      <Button variant="outline" className="w-full" onClick={() => addElement(makeImageElement("", "logo"))}>
        + Placeholder (usa logo da academia)
      </Button>
      <p className="text-xs text-neutral-500">O placeholder puxa automaticamente a logo cadastrada no dojo ao emitir o certificado. Você também pode colar uma URL:</p>
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
      <div className="space-y-2">
        <label className="text-xs text-neutral-600">Imagem de fundo</label>
        <Input value={doc.page.backgroundUrl || ""} onChange={(e) => setPage({ backgroundUrl: e.target.value })} placeholder="https://..." />
        <PageBgUpload onDone={(url) => setPage({ backgroundUrl: url })} />
        {doc.page.backgroundUrl && (
          <button onClick={() => setPage({ backgroundUrl: "" })} className="text-[11px] text-red-700 hover:underline">Remover imagem de fundo</button>
        )}
      </div>
    </div>
  );
}

function TemplatesPanel() {
  const { loadDoc, templateId, name, category, dirty } = useStudioStore();
  const [q, setQ] = useState("");
  const items = CERTIFICATE_PRESETS.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()));

  const applyPreset = (preset: typeof CERTIFICATE_PRESETS[number]) => {
    if (dirty && !confirm("Aplicar este modelo irá substituir o design atual. Continuar?")) return;
    const doc = preset.build();
    loadDoc(doc, { id: templateId, name: name && name !== "Novo modelo" ? name : preset.name, category: category || preset.category });
    toast.success(`Modelo "${preset.name}" carregado`);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Modelos prontos</div>
        <p className="text-[11px] text-neutral-500 mb-2">Escolha um design de partida. Você pode personalizar tudo depois.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
        <Input placeholder="Buscar modelo..." className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {items.map((p) => (
          <PresetCard key={p.id} preset={p} onSelect={applyPreset} />
        ))}
      </div>
    </div>
  );
}

function PresetCard({ preset, onSelect }: { preset: typeof CERTIFICATE_PRESETS[number]; onSelect: (p: typeof CERTIFICATE_PRESETS[number]) => void }) {
  const doc = useMemo(() => preset.build(), [preset]);
  const scale = 280 / doc.page.width;
  return (
    <button
      onClick={() => onSelect(preset)}
      className="text-left rounded-lg border border-neutral-200 hover:border-red-700 hover:shadow-sm transition overflow-hidden bg-white group"
    >
      <div className="relative w-full bg-neutral-100 overflow-hidden" style={{ height: doc.page.height * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: doc.page.width, height: doc.page.height }}>
          <CertificateRenderer doc={doc} />
        </div>
      </div>
      <div className="px-3 py-2 flex items-center gap-2 border-t border-neutral-100">
        <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: preset.accent }} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-neutral-900 truncate">{preset.name}</div>
          <div className="text-[11px] text-neutral-500 truncate">{preset.description}</div>
        </div>
      </div>
    </button>
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

function PageBgUpload({ onDone }: { onDone: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    try {
      const path = `certificates/bg-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("ig-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("ig-media").getPublicUrl(path);
      onDone(data.publicUrl);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar imagem");
    } finally { setUploading(false); }
  };
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <Button variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando..." : "Fazer upload"}
      </Button>
    </>
  );
}
