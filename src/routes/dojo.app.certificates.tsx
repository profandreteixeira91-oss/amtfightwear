import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  listCertificateTemplates, saveCertificateTemplate, deleteCertificateTemplate,
} from "@/lib/dojo/dojo.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Upload, Plus, Info, Type, Variable, PenLine } from "lucide-react";

export const Route = createFileRoute("/dojo/app/certificates")({
  component: CertificatesPage,
});

type FieldKind = "variable" | "static" | "signature";
type Field = {
  key: string; label: string;
  x: number; y: number; fontSize: number;
  fontFamily?: string; color?: string;
  align?: "left" | "center" | "right"; bold?: boolean;
  kind?: FieldKind;
  text?: string;
  imageUrl?: string;
  width?: number;
  height?: number;
};

const AVAILABLE_VARIABLES: { key: string; label: string; example: string }[] = [
  { key: "student_name", label: "Nome do aluno", example: "João da Silva" },
  { key: "belt", label: "Faixa / Grau", example: "Faixa Preta — 2º grau" },
  { key: "date", label: "Data de emissão", example: "18/07/2026" },
  { key: "signature", label: "Nome do avaliador (texto)", example: "Prof. André Teixeira" },
];

const defaultFields: Field[] = [
  { kind: "variable", key: "student_name", label: "Nome do aluno", x: 50, y: 45, fontSize: 48, color: "#111111", align: "center", bold: true },
  { kind: "variable", key: "belt", label: "Faixa / Grau", x: 50, y: 55, fontSize: 28, color: "#333333", align: "center" },
  { kind: "variable", key: "date", label: "Data", x: 50, y: 70, fontSize: 22, color: "#555555", align: "center" },
  { kind: "variable", key: "signature", label: "Assinatura (nome)", x: 50, y: 85, fontSize: 20, color: "#333333", align: "center" },
];

function CertificatesPage() {
  const listFn = useServerFn(listCertificateTemplates);
  const saveFn = useServerFn(saveCertificateTemplate);
  const delFn = useServerFn(deleteCertificateTemplate);
  const qc = useQueryClient();

  const templates = useQuery({ queryKey: ["dojo-templates"], queryFn: () => listFn() });

  const [editing, setEditing] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingSig, setUploadingSig] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const startNew = () => setEditing({ name: "Novo modelo", background_url: "", width: 1754, height: 1240, fields: defaultFields, active: true });

  const uploadBackground = async (file: File) => {
    setUploading(true);
    try {
      const path = `certificates/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const img = new Image();
      img.onload = () => setEditing((prev: any) => ({ ...prev, background_url: data.publicUrl, width: img.naturalWidth, height: img.naturalHeight }));
      img.src = data.publicUrl;
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const uploadSignature = async (i: number, file: File) => {
    setUploadingSig(i);
    try {
      const path = `certificates/signatures/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      updField(i, { imageUrl: data.publicUrl });
      toast.success("Assinatura enviada");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploadingSig(null); }
  };

  const saveTemplate = async () => {
    if (!editing.background_url) return toast.error("Envie a imagem base");
    // normalize kind default
    const payload = { ...editing, fields: (editing.fields ?? []).map((f: Field) => ({ ...f, kind: f.kind ?? "variable" })) };
    try {
      await saveFn({ data: payload });
      toast.success("Modelo salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["dojo-templates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const addField = (kind: FieldKind = "variable") => {
    const base: Field =
      kind === "static"
        ? { kind, key: `texto_${(editing.fields?.length ?? 0) + 1}`, label: "Texto fixo", text: "Certificamos que", x: 50, y: 30, fontSize: 24, color: "#111111", align: "center" }
        : kind === "signature"
        ? { kind, key: `assinatura_${(editing.fields?.length ?? 0) + 1}`, label: "Assinatura (imagem)", imageUrl: "", x: 50, y: 82, fontSize: 20, width: 22, height: 8, align: "center" }
        : { kind, key: "student_name", label: "Nome do aluno", x: 50, y: 50, fontSize: 32, color: "#111111", align: "center" };
    setEditing({ ...editing, fields: [...(editing.fields ?? []), base] });
  };
  const updField = (i: number, patch: Partial<Field>) => {
    const next = [...editing.fields]; next[i] = { ...next[i], ...patch }; setEditing({ ...editing, fields: next });
  };
  const rmField = (i: number) => setEditing({ ...editing, fields: editing.fields.filter((_: any, idx: number) => idx !== i) });

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editor de certificado</h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveTemplate}>Salvar modelo</Button>
          </div>
        </div>

        <Card className="bg-muted/40 border-dashed">
          <CardContent className="p-3 text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium"><Info className="h-4 w-4" /> Como funciona</div>
            <p className="text-muted-foreground">
              Você pode adicionar três tipos de elementos ao certificado:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li><strong>Variável</strong> — texto preenchido automaticamente para cada aluno (nome, faixa, data, avaliador).</li>
              <li><strong>Texto fixo</strong> — aparece igual em todos os certificados (ex.: "Certificamos que", nome da academia, cidade).</li>
              <li><strong>Assinatura (imagem)</strong> — envie um PNG com fundo transparente e posicione onde desejar.</li>
            </ul>
            <div className="pt-1">
              <div className="text-xs font-medium mb-1">Variáveis disponíveis:</div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map(v => (
                  <span key={v.key} className="text-xs bg-background border rounded px-2 py-1">
                    <code className="font-mono">{v.key}</code> · {v.label} <span className="text-muted-foreground">(ex.: {v.example})</span>
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-[1fr_360px] gap-4">
          <Card>
            <CardContent className="p-3">
              <div className="mb-3 flex gap-2">
                <Input placeholder="Nome do modelo" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadBackground(e.target.files[0])} />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="h-4 w-4 mr-1" />{uploading ? "Enviando…" : "Imagem base"}</Button>
              </div>
              <div className="relative bg-muted border" style={{ aspectRatio: `${editing.width}/${editing.height}` }}>
                {editing.background_url && <img src={editing.background_url} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}
                {editing.fields?.map((f: Field, i: number) => {
                  const kind = f.kind ?? "variable";
                  const commonStyle: React.CSSProperties = {
                    left: `${f.x}%`, top: `${f.y}%`,
                    transform: f.align === "center" ? "translate(-50%,-50%)" : f.align === "right" ? "translate(-100%,-50%)" : "translate(0,-50%)",
                  };
                  const onDrag = (ev: React.MouseEvent) => {
                    const parent = (ev.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    const onMove = (m: MouseEvent) => {
                      const x = ((m.clientX - parent.left) / parent.width) * 100;
                      const y = ((m.clientY - parent.top) / parent.height) * 100;
                      updField(i, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
                    };
                    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
                  };

                  if (kind === "signature") {
                    return (
                      <div
                        key={i}
                        className="absolute cursor-move outline outline-1 outline-primary/60 bg-primary/5 flex items-center justify-center"
                        style={{ ...commonStyle, width: `${f.width ?? 22}%`, height: `${f.height ?? 8}%` }}
                        onMouseDown={onDrag}
                      >
                        {f.imageUrl
                          ? <img src={f.imageUrl} alt="" className="max-w-full max-h-full object-contain pointer-events-none" />
                          : <span className="text-[10px] text-muted-foreground">[Assinatura PNG]</span>}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={i}
                      className="absolute select-none cursor-move px-1 outline outline-1 outline-primary/60 bg-primary/5"
                      style={{
                        ...commonStyle,
                        fontSize: `${f.fontSize * 0.5}px`, color: f.color, fontWeight: f.bold ? 700 : 400,
                        whiteSpace: "nowrap",
                      }}
                      onMouseDown={onDrag}
                    >
                      {kind === "static" ? (f.text || "[texto]") : `{${f.key}}`}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Elementos</CardTitle>
              <div className="flex flex-wrap gap-1 pt-2">
                <Button size="sm" variant="outline" onClick={() => addField("variable")}><Variable className="h-3 w-3 mr-1" />Variável</Button>
                <Button size="sm" variant="outline" onClick={() => addField("static")}><Type className="h-3 w-3 mr-1" />Texto fixo</Button>
                <Button size="sm" variant="outline" onClick={() => addField("signature")}><PenLine className="h-3 w-3 mr-1" />Assinatura</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
              {editing.fields?.map((f: Field, i: number) => {
                const kind = f.kind ?? "variable";
                return (
                  <div key={i} className="border rounded p-2 space-y-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {kind === "variable" ? "Variável" : kind === "static" ? "Texto fixo" : "Assinatura"}
                      </span>
                      <Input value={f.label} onChange={e => updField(i, { label: e.target.value })} placeholder="Rótulo interno" className="h-8" />
                      <Button size="icon" variant="ghost" onClick={() => rmField(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>

                    {kind === "variable" && (
                      <select
                        className="border rounded p-1.5 bg-background w-full text-sm"
                        value={f.key}
                        onChange={e => updField(i, { key: e.target.value })}
                      >
                        {AVAILABLE_VARIABLES.map(v => (
                          <option key={v.key} value={v.key}>{v.label} — {`{${v.key}}`}</option>
                        ))}
                      </select>
                    )}

                    {kind === "static" && (
                      <Textarea
                        value={f.text ?? ""}
                        onChange={e => updField(i, { text: e.target.value })}
                        placeholder='Ex.: "Certificamos que", "AMT Jiu-Jitsu", "São Paulo — SP"'
                        rows={2}
                      />
                    )}

                    {kind === "signature" && (
                      <div className="space-y-1.5">
                        {f.imageUrl && <img src={f.imageUrl} alt="" className="max-h-16 border rounded bg-muted/40 p-1" />}
                        <label className="flex">
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            hidden
                            onChange={e => e.target.files?.[0] && uploadSignature(i, e.target.files[0])}
                          />
                          <Button asChild size="sm" variant="outline" disabled={uploadingSig === i}>
                            <span><Upload className="h-3 w-3 mr-1" />{uploadingSig === i ? "Enviando…" : (f.imageUrl ? "Trocar PNG" : "Enviar PNG")}</span>
                          </Button>
                        </label>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <label>Larg. % <Input type="number" value={f.width ?? 22} onChange={e => updField(i, { width: Number(e.target.value) })} /></label>
                          <label>Alt. % <Input type="number" value={f.height ?? 8} onChange={e => updField(i, { height: Number(e.target.value) })} /></label>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <label>X% <Input type="number" value={f.x} onChange={e => updField(i, { x: Number(e.target.value) })} /></label>
                      <label>Y% <Input type="number" value={f.y} onChange={e => updField(i, { y: Number(e.target.value) })} /></label>
                      {kind !== "signature" && (
                        <label>Tam. <Input type="number" value={f.fontSize} onChange={e => updField(i, { fontSize: Number(e.target.value) })} /></label>
                      )}
                    </div>

                    {kind !== "signature" && (
                      <div className="grid grid-cols-3 gap-1 text-xs items-center">
                        <select className="border rounded p-1 bg-background" value={f.align ?? "left"} onChange={e => updField(i, { align: e.target.value as any })}>
                          <option value="left">← esq</option><option value="center">centro</option><option value="right">dir →</option>
                        </select>
                        <input type="color" value={f.color ?? "#111"} onChange={e => updField(i, { color: e.target.value })} className="w-full h-8" />
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.bold} onChange={e => updField(i, { bold: e.target.checked })} /> negrito</label>
                      </div>
                    )}
                  </div>
                );
              })}
              {(!editing.fields || editing.fields.length === 0) && (
                <div className="text-xs text-muted-foreground text-center py-4">Adicione elementos usando os botões acima.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Modelos de certificado</h2>
        <Button onClick={startNew}>Novo modelo</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(templates.data ?? []).map((t: any) => (
          <Card key={t.id}>
            <CardHeader><CardTitle className="text-base">{t.name}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {t.background_url && <img src={t.background_url} alt={t.name} className="w-full h-40 object-contain bg-muted rounded" />}
              <div className="text-xs text-muted-foreground">{t.fields?.length ?? 0} elementos</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Editar</Button>
                <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Excluir modelo?")) { await delFn({ data: { id: t.id } }); qc.invalidateQueries({ queryKey: ["dojo-templates"] }); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(templates.data ?? []).length === 0 && <div className="text-sm text-muted-foreground p-6">Nenhum modelo. Envie sua arte de referência para começar.</div>}
      </div>
      <p className="text-xs text-muted-foreground">Para emitir certificados, use a aba <strong>Nova graduação</strong>.</p>
    </div>
  );
}
