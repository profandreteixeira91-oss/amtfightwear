import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle2, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  listCertificateTemplates,
  listDojoStudents,
  issueCertificate,
  updateIssuedCertificatePdf,
  getCertificateIssueContext,
} from "@/lib/dojo/dojo.functions";
import { migrateLegacyFields, type EditorSchema } from "@/components/dojo/certificate-editor/types";
import { CertificateRenderer } from "./CertificateRenderer";
import { buildIssueValues, renderNodeToPdfBlob, uploadCertificatePdf, waitForImages } from "@/lib/dojo/certificates/issue";

type QueueItem = {
  studentId: string;
  studentName: string;
  status: "pending" | "processing" | "done" | "error";
  message?: string;
  certId?: string;
  pdfUrl?: string;
};

export function IssuePanel({ open, onOpenChange, defaultTemplateId }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTemplateId?: string;
}) {
  const templatesFn = useServerFn(listCertificateTemplates);
  const studentsFn = useServerFn(listDojoStudents);
  const issueFn = useServerFn(issueCertificate);
  const updatePdfFn = useServerFn(updateIssuedCertificatePdf);
  const ctxFn = useServerFn(getCertificateIssueContext);
  const qc = useQueryClient();

  const templates = useQuery({ queryKey: ["dojo-templates"], queryFn: () => templatesFn(), enabled: open });
  const students = useQuery({ queryKey: ["dojo-students-mini"], queryFn: () => studentsFn(), enabled: open });

  const [templateId, setTemplateId] = useState<string>("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<EditorSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, string> | null>(null);
  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && defaultTemplateId) setTemplateId(defaultTemplateId);
  }, [open, defaultTemplateId]);

  useEffect(() => {
    if (!open) {
      setQueue([]);
      setSelected(new Set());
      setRunning(false);
      setQ("");
    }
  }, [open]);

  const filteredStudents = useMemo(() => {
    const list = students.data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((st: any) => (st.full_name ?? "").toLowerCase().includes(s));
  }, [students.data, q]);

  const currentTemplate: any = useMemo(
    () => (templates.data ?? []).find((t: any) => t.id === templateId),
    [templates.data, templateId]
  );

  const templateSchema: EditorSchema | null = useMemo(() => {
    if (!currentTemplate) return null;
    return (currentTemplate.variables?.editor_schema as EditorSchema) ?? migrateLegacyFields(currentTemplate);
  }, [currentTemplate]);

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filteredStudents.map((s: any) => s.id)));
    else setSelected(new Set());
  };
  const toggleOne = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const startBatch = async () => {
    if (!templateSchema || !currentTemplate) { toast.error("Escolha um modelo"); return; }
    if (selected.size === 0) { toast.error("Selecione ao menos um aluno"); return; }
    const items: QueueItem[] = Array.from(selected).map((id) => {
      const s: any = (students.data ?? []).find((x: any) => x.id === id);
      return { studentId: id, studentName: s?.full_name ?? "—", status: "pending" };
    });
    setQueue(items);
    setRunning(true);
    const origin = window.location.origin;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setQueue((q) => q.map((x, idx) => idx === i ? { ...x, status: "processing" } : x));
      try {
        // 1) resolve context
        const ctx = await ctxFn({ data: { student_id: item.studentId } });
        // 2) create DB row (get public_hash + id)
        const values = buildIssueValues({
          student: ctx.student, academy: ctx.academy, graduation: ctx.latest_graduation,
          publicHash: "TEMP", origin,
        });
        const row: any = await issueFn({
          data: {
            student_id: item.studentId,
            graduation_id: ctx.latest_graduation?.id ?? null,
            template_id: currentTemplate.id,
            values,
          },
        });
        // 3) rebuild values with real hash
        const finalValues = buildIssueValues({
          student: ctx.student, academy: ctx.academy, graduation: ctx.latest_graduation,
          publicHash: row.public_hash, serial: row.serial ?? null, origin,
        });
        // 4) render off-screen and export PDF
        setCurrentDoc(templateSchema);
        setCurrentValues(finalValues);
        await new Promise((r) => setTimeout(r, 250));
        if (renderRef.current) {
          await waitForImages(renderRef.current);
          await new Promise((r) => setTimeout(r, 200));
          const blob = await renderNodeToPdfBlob(renderRef.current, templateSchema);
          const pdfUrl = await uploadCertificatePdf(blob, row.id);
          await updatePdfFn({ data: { id: row.id, pdf_url: pdfUrl } });
          setQueue((q) => q.map((x, idx) => idx === i ? { ...x, status: "done", certId: row.id, pdfUrl } : x));
        } else {
          throw new Error("Nó de renderização não encontrado");
        }
      } catch (e: any) {
        setQueue((q) => q.map((x, idx) => idx === i ? { ...x, status: "error", message: e?.message ?? String(e) } : x));
      }
    }

    setCurrentDoc(null);
    setCurrentValues(null);
    setRunning(false);
    qc.invalidateQueries({ queryKey: ["dojo-issued-certificates"] });
    toast.success("Emissão concluída");
  };

  const doneCount = queue.filter((x) => x.status === "done").length;
  const errorCount = queue.filter((x) => x.status === "error").length;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!running) onOpenChange(v); }}>
        <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir certificados</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Modelo</label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={running}
              >
                <option value="">— Selecione —</option>
                {(templates.data ?? []).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center gap-2 border-b p-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aluno…" className="h-8 pl-7 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={filteredStudents.length > 0 && filteredStudents.every((s: any) => selected.has(s.id))}
                    onCheckedChange={(v) => toggleAll(!!v)}
                    disabled={running}
                  />
                  Selecionar todos ({filteredStudents.length})
                </label>
              </div>
              <div className="max-h-64 overflow-auto">
                {filteredStudents.map((s: any) => {
                  const q = queue.find((x) => x.studentId === s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0 hover:bg-muted/50">
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={() => toggleOne(s.id)}
                        disabled={running}
                      />
                      <span className="flex-1 truncate text-sm">{s.full_name}</span>
                      {q?.status === "processing" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {q?.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                      {q?.status === "error" && <span title={q.message}><XCircle className="h-3.5 w-3.5 text-destructive" /></span>}
                    </label>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">Nenhum aluno encontrado.</div>
                )}
              </div>
            </div>

            {queue.length > 0 && (
              <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                Processados {doneCount + errorCount}/{queue.length}
                {errorCount > 0 && <span className="ml-2 text-destructive">• {errorCount} erro(s)</span>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>Fechar</Button>
            <Button onClick={startBatch} disabled={running || !templateId || selected.size === 0} className="bg-red-700 hover:bg-red-800">
              {running ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Emitindo…</> : <><Send className="mr-1 h-4 w-4" /> Emitir {selected.size > 0 ? `(${selected.size})` : ""}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Off-screen renderer for PDF export */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <div ref={renderRef}>
          {currentDoc && currentValues && (
            <CertificateRenderer doc={currentDoc} values={currentValues} />
          )}
        </div>
      </div>
    </>
  );
}
