import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useStudioStore, emptyDoc, starterDoc } from "@/lib/dojo/certificates/studio-store";
import { StudioTopbar } from "./StudioTopbar";
import { StudioLeft } from "./StudioLeft";
import { StudioRight } from "./StudioRight";
import { StudioCanvas } from "./StudioCanvas";
import { CertificateRenderer } from "./CertificateRenderer";
import { toLegacyFields, type EditorSchema, migrateLegacyFields } from "@/components/dojo/certificate-editor/types";
import { listCertificateTemplates, saveCertificateTemplate } from "@/lib/dojo/dojo.functions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PreviewStage } from "./PreviewStage";
import { useForceLightTheme } from "./useForceLightTheme";

type Props = { templateId: string | "new" };

export function CertificateStudio({ templateId }: Props) {
  const listFn = useServerFn(listCertificateTemplates);
  const saveFn = useServerFn(saveCertificateTemplate);
  const navigate = useNavigate();
  const { doc, name, category, templateId: storeId, loadDoc, markSaved, dirty, setTemplateId } = useStudioStore();
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useForceLightTheme();

  // Load template
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (templateId === "new") {
        loadDoc(starterDoc(), { id: null, name: "Novo modelo", category: "graduacao" });
        setLoaded(true);
        return;
      }
      try {
        const list = await listFn();
        const found = (list ?? []).find((t: any) => t.id === templateId);
        if (cancelled) return;
        if (!found) {
          toast.error("Modelo não encontrado");
          navigate({ to: "/dojo/app/certificates" });
          return;
        }
        const schema: EditorSchema = ((found.variables as any)?.editor_schema as EditorSchema | undefined) ?? migrateLegacyFields(found);
        loadDoc(schema, { id: found.id, name: found.name, category: found.category || "graduacao" });
        setLoaded(true);
      } catch (e: any) {
        toast.error(e.message ?? "Falha ao carregar modelo");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const save = async () => {
    setSaving(true);
    try {
      const legacy = toLegacyFields(doc);
      const payload: any = {
        id: storeId ?? undefined,
        name,
        background_url: legacy.background_url,
        width: legacy.width,
        height: legacy.height,
        fields: legacy.fields,
        variables: { editor_schema: doc },
        category,
        active: true,
      };
      const res = await saveFn({ data: payload });
      if (!storeId && res?.id) setTemplateId(res.id);
      markSaved();
      toast.success("Modelo salvo");
    } catch (e: any) {
      toast.error("Falha ao salvar: " + (e.message || e));
    } finally { setSaving(false); }
  };

  // Autosave (debounced 4s)
  useEffect(() => {
    if (!loaded || !dirty) return;
    const t = setTimeout(() => { save().catch(() => {}); }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, name, category, dirty, loaded]);

  // Ctrl+S save + presentation-mode global events
  useEffect(() => {
    const onSaveEvt = () => { save().catch(() => {}); };
    const onTogglePres = () => setPresentation((p) => !p);
    const onExitPres = () => setPresentation(false);
    document.addEventListener("cert-studio:save", onSaveEvt);
    document.addEventListener("cert-studio:toggle-presentation", onTogglePres);
    document.addEventListener("cert-studio:exit-presentation", onExitPres);
    return () => {
      document.removeEventListener("cert-studio:save", onSaveEvt);
      document.removeEventListener("cert-studio:toggle-presentation", onTogglePres);
      document.removeEventListener("cert-studio:exit-presentation", onExitPres);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, name, category]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (presentation) {
    const scale = Math.min(
      (typeof window !== "undefined" ? window.innerWidth - 60 : 1400) / doc.page.width,
      (typeof window !== "undefined" ? window.innerHeight - 60 : 800) / doc.page.height,
    );
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950">
        <button
          onClick={() => setPresentation(false)}
          className="absolute top-4 right-4 text-white/70 hover:text-white text-xs px-3 py-1.5 rounded-md bg-white/10 backdrop-blur">
          Sair (Esc)
        </button>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
          <CertificateRenderer doc={doc} className="shadow-2xl ring-1 ring-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <StudioTopbar onSave={save} saving={saving} onPreview={() => setPreviewOpen(true)} onPresentation={() => setPresentation(true)} />
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <StudioLeft />
        <StudioCanvas />
        <StudioRight />
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-auto max-w-[95vw] gap-3 p-4 sm:p-5">
          <DialogHeader><DialogTitle>Pré-visualização</DialogTitle></DialogHeader>
          <PreviewStage doc={doc} />
        </DialogContent>
      </Dialog>
    </div>
  );
}