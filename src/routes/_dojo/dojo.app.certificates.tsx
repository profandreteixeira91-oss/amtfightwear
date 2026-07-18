import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  listCertificateTemplates, saveCertificateTemplate, deleteCertificateTemplate,
  listDojoStudents, issueCertificate,
} from "@/lib/dojo/dojo.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Upload, Plus } from "lucide-react";

export const Route = createFileRoute("/_dojo/dojo/app/certificates")({
  component: CertificatesPage,
});

type Field = {
  key: string; label: string;
  x: number; y: number; fontSize: number;
  fontFamily?: string; color?: string;
  align?: "left" | "center" | "right"; bold?: boolean;
};

const defaultFields: Field[] = [
  { key: "student_name", label: "Nome do aluno", x: 50, y: 45, fontSize: 48, color: "#111111", align: "center", bold: true },
  { key: "belt", label: "Faixa / Grau", x: 50, y: 55, fontSize: 28, color: "#333333", align: "center" },
  { key: "date", label: "Data", x: 50, y: 70, fontSize: 22, color: "#555555", align: "center" },
  { key: "signature", label: "Assinatura", x: 50, y: 85, fontSize: 20, color: "#333333", align: "center" },
];

function CertificatesPage() {
  const listFn = useServerFn(listCertificateTemplates);
  const saveFn = useServerFn(saveCertificateTemplate);
  const delFn = useServerFn(deleteCertificateTemplate);
  const studentsFn = useServerFn(listDojoStudents);
  const issueFn = useServerFn(issueCertificate);
  const qc = useQueryClient();

  const templates = useQuery({ queryKey: ["dojo-templates"], queryFn: () => listFn() });
  const students = useQuery({ queryKey: ["dojo-students"], queryFn: () => studentsFn() });

  const [editing, setEditing] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const saveTemplate = async () => {
    if (!editing.background_url) return toast.error("Envie a imagem base");
    try {
      await saveFn({ data: editing });
      toast.success("Modelo salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["dojo-templates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const addField = () => {
    const k = `campo_${(editing.fields?.length ?? 0) + 1}`;
    setEditing({ ...editing, fields: [...(editing.fields ?? []), { key: k, label: k, x: 50, y: 50, fontSize: 24, color: "#111111", align: "center" }] });
  };
  const updField = (i: number, patch: Partial<Field>) => {
    const next = [...editing.fields]; next[i] = { ...next[i], ...patch }; setEditing({ ...editing, fields: next });
  };
  const rmField = (i: number) => setEditing({ ...editing, fields: editing.fields.filter((_: any, idx: number) => idx !== i) });

  // Issue certificate
  const [issue, setIssue] = useState<{ student_id: string; template_id: string; values: Record<string, string> } | null>(null);
  const startIssue = (template: any) => {
    const vals: Record<string, string> = {};
    (template.fields ?? []).forEach((f: Field) => { vals[f.key] = ""; });
    setIssue({ student_id: "", template_id: template.id, values: vals });
  };
  const doIssue = async () => {
    if (!issue?.student_id) return toast.error("Escolha o aluno");
    try {
      await issueFn({ data: issue });
      toast.success("Certificado emitido");
      setIssue(null);
    } catch (e: any) { toast.error(e.message); }
  };

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
        <div className="grid md:grid-cols-[1fr_320px] gap-4">
          <Card>
            <CardContent className="p-3">
              <div className="mb-3 flex gap-2">
                <Input placeholder="Nome do modelo" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadBackground(e.target.files[0])} />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="h-4 w-4 mr-1" />{uploading ? "Enviando…" : "Imagem base"}</Button>
              </div>
              <div className="relative bg-muted border" style={{ aspectRatio: `${editing.width}/${editing.height}` }}>
                {editing.background_url && <img src={editing.background_url} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}
                {editing.fields?.map((f: Field, i: number) => (
                  <div
                    key={i}
                    className="absolute select-none cursor-move px-1 outline outline-1 outline-primary/60 bg-primary/5"
                    style={{
                      left: `${f.x}%`, top: `${f.y}%`,
                      transform: f.align === "center" ? "translate(-50%,-50%)" : f.align === "right" ? "translate(-100%,-50%)" : "translate(0,-50%)",
                      fontSize: `${f.fontSize * 0.5}px`, color: f.color, fontWeight: f.bold ? 700 : 400,
                      whiteSpace: "nowrap",
                    }}
                    onMouseDown={(ev) => {
                      const parent = (ev.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                      const onMove = (m: MouseEvent) => {
                        const x = ((m.clientX - parent.left) / parent.width) * 100;
                        const y = ((m.clientY - parent.top) / parent.height) * 100;
                        updField(i, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
                      };
                      const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                      window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
                    }}
                  >
                    [{f.label}]
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center justify-between">Campos <Button size="sm" variant="outline" onClick={addField}><Plus className="h-4 w-4" /></Button></CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
              {editing.fields?.map((f: Field, i: number) => (
                <div key={i} className="border rounded p-2 space-y-1.5">
                  <div className="flex gap-1">
                    <Input value={f.label} onChange={e => updField(i, { label: e.target.value })} placeholder="Rótulo" />
                    <Button size="icon" variant="ghost" onClick={() => rmField(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <Input value={f.key} onChange={e => updField(i, { key: e.target.value })} placeholder="Chave (ex: student_name)" />
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <label>X% <Input type="number" value={f.x} onChange={e => updField(i, { x: Number(e.target.value) })} /></label>
                    <label>Y% <Input type="number" value={f.y} onChange={e => updField(i, { y: Number(e.target.value) })} /></label>
                    <label>Tam. <Input type="number" value={f.fontSize} onChange={e => updField(i, { fontSize: Number(e.target.value) })} /></label>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs items-center">
                    <select className="border rounded p-1 bg-background" value={f.align ?? "left"} onChange={e => updField(i, { align: e.target.value as any })}>
                      <option value="left">← esq</option><option value="center">centro</option><option value="right">dir →</option>
                    </select>
                    <input type="color" value={f.color ?? "#111"} onChange={e => updField(i, { color: e.target.value })} className="w-full h-8" />
                    <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.bold} onChange={e => updField(i, { bold: e.target.checked })} /> negrito</label>
                  </div>
                </div>
              ))}
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
              <div className="text-xs text-muted-foreground">{t.fields?.length ?? 0} campos</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Editar</Button>
                <Button size="sm" onClick={() => startIssue(t)}>Emitir</Button>
                <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Excluir modelo?")) { await delFn({ data: { id: t.id } }); qc.invalidateQueries({ queryKey: ["dojo-templates"] }); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(templates.data ?? []).length === 0 && <div className="text-sm text-muted-foreground p-6">Nenhum modelo. Envie sua arte de referência para começar.</div>}
      </div>

      {issue && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIssue(null)}>
          <Card className="max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <CardHeader><CardTitle>Emitir certificado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <select className="border rounded p-2 bg-background w-full" value={issue.student_id} onChange={e => setIssue({ ...issue, student_id: e.target.value })}>
                <option value="">Selecione o aluno</option>
                {(students.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              {Object.keys(issue.values).map(k => (
                <Input key={k} placeholder={k} value={issue.values[k]} onChange={e => setIssue({ ...issue, values: { ...issue.values, [k]: e.target.value } })} />
              ))}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setIssue(null)}>Cancelar</Button>
                <Button onClick={doIssue}>Emitir</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
