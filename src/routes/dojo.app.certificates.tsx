import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listCertificateTemplates, saveCertificateTemplate, deleteCertificateTemplate,
  listDojoStudents,
} from "@/lib/dojo/dojo.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Copy, Plus, Star, Search, Upload, ImageOff } from "lucide-react";
import { CertificateEditor } from "@/components/dojo/certificate-editor/CertificateEditor";
import { migrateLegacyFields, toLegacyFields, type EditorSchema } from "@/components/dojo/certificate-editor/types";
import { CertificatePreviewDialog, type CertificateTemplate } from "@/components/dojo/CertificatePreview";
import { ALL_VARIABLES } from "@/components/dojo/certificate-editor/types";
import { systemValues } from "@/components/dojo/certificate-editor/qr";

export const Route = createFileRoute("/dojo/app/certificates")({
  head: () => ({ meta: [{ title: "Editor de Certificados — AMT Dojo Manager" }] }),
  component: CertificatesPage,
});

const CATEGORIES = [
  { id: "graduacao", label: "Graduação" },
  { id: "seminario", label: "Seminário" },
  { id: "curso", label: "Curso" },
  { id: "participacao", label: "Participação" },
  { id: "evento", label: "Evento" },
  { id: "personalizado", label: "Personalizado" },
];

function CertificatesPage() {
  const listFn = useServerFn(listCertificateTemplates);
  const saveFn = useServerFn(saveCertificateTemplate);
  const delFn = useServerFn(deleteCertificateTemplate);
  const studentsFn = useServerFn(listDojoStudents);
  const qc = useQueryClient();

  const templates = useQuery({ queryKey: ["dojo-templates"], queryFn: () => listFn() });
  const students = useQuery({ queryKey: ["dojo-students-mini"], queryFn: () => studentsFn() });

  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStudentId, setPreviewStudentId] = useState<string>("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");

  const filteredTemplates = useMemo(() => {
    return (templates.data ?? []).filter((t: any) => {
      if (category && t.category !== category) return false;
      if (q && !t.name?.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [templates.data, q, category]);

  const startNew = () => setEditing({
    name: "Novo modelo",
    category: "graduacao",
    is_default: false,
    variables: {
      editor_schema: {
        version: 2,
        page: { width: 1754, height: 1240, background: "#ffffff", margin: 40 },
        elements: [
          { id: "t1", kind: "text", text: "CERTIFICADO", x: 50, y: 20, fontSize: 72, color: "#111", bold: true, align: "center", uppercase: true, rotation: 0, opacity: 1, z: 1 },
          { id: "t2", kind: "text", text: "Certificamos que", x: 50, y: 38, fontSize: 24, color: "#555", align: "center", z: 2 },
          { id: "t3", kind: "text", text: "{{aluno_nome}}", x: 50, y: 48, fontSize: 52, color: "#111", bold: true, align: "center", z: 3 },
          { id: "t4", kind: "text", text: "recebeu a graduação de {{graduacao_atual}}", x: 50, y: 60, fontSize: 22, color: "#333", align: "center", z: 4 },
          { id: "t5", kind: "date", format: "long", x: 50, y: 72, fontSize: 20, color: "#666", align: "center", z: 5 },
          { id: "l1", kind: "line", x: 50, y: 82, w: 30, h: 0.3, fill: "#111", z: 6 },
          { id: "t6", kind: "text", text: "{{professor_nome}}", x: 50, y: 87, fontSize: 18, color: "#111", bold: true, align: "center", z: 7 },
        ],
      } as EditorSchema,
      favorites: [],
      recent: [],
    },
  });

  const openTemplate = (t: any) => {
    // Migrate legacy templates without editor_schema
    const editorSchema: EditorSchema | undefined = t.variables?.editor_schema;
    const schema = editorSchema ?? migrateLegacyFields(t);
    setEditing({
      id: t.id,
      name: t.name,
      category: t.category || "personalizado",
      is_default: !!t.is_default,
      variables: {
        editor_schema: schema,
        favorites: t.variables?.favorites ?? [],
        recent: t.variables?.recent ?? [],
      },
    });
  };

  const persist = async (payload: any, opts: { silent?: boolean } = {}) => {
    setSaving(true);
    try {
      const schema: EditorSchema = payload.variables.editor_schema;
      const legacy = toLegacyFields(schema);
      const body = {
        id: editing?.id,
        name: payload.name,
        background_url: legacy.background_url,
        width: legacy.width,
        height: legacy.height,
        fields: legacy.fields as any,
        variables: payload.variables,
        category: payload.category,
        is_default: payload.is_default,
        active: true,
      };
      const res = await saveFn({ data: body });
      if (!editing?.id && res?.id) setEditing((prev: any) => ({ ...prev, id: res.id }));
      if (!opts.silent) toast.success("Modelo salvo");
      qc.invalidateQueries({ queryKey: ["dojo-templates"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const duplicate = async (t: any) => {
    setSaving(true);
    try {
      const legacy = toLegacyFields(t.variables?.editor_schema ?? migrateLegacyFields(t));
      await saveFn({ data: {
        name: `${t.name} (cópia)`,
        background_url: legacy.background_url,
        width: legacy.width,
        height: legacy.height,
        fields: legacy.fields as any,
        variables: t.variables ?? undefined,
        category: t.category ?? "personalizado",
        is_default: false,
        active: true,
      }});
      toast.success("Modelo duplicado");
      qc.invalidateQueries({ queryKey: ["dojo-templates"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // Preview values
  const academyProfile = useQuery({
    queryKey: ["dojo-academy-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("dojo_academy_profile").select("*").eq("owner_id", u.user.id).maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });
  const previewValues = useMemo(() => {
    const base: Record<string, string> = { ...systemValues() };
    ALL_VARIABLES.forEach((v) => { base[v.key] = v.sample ? v.sample : `[${v.label}]`; });
    const s: any = students.data?.find((x: any) => x.id === previewStudentId);
    if (s) {
      base.aluno_nome = s.full_name || base.aluno_nome;
      base.aluno_nome_social = s.social_name || s.full_name || base.aluno_nome;
      base.aluno_cpf = s.cpf || base.aluno_cpf;
      base.aluno_data_nascimento = s.birth_date ? new Date(s.birth_date).toLocaleDateString("pt-BR") : base.aluno_data_nascimento;
      base.aluno_faixa = s.current_belt || s.current_belt_id || base.aluno_faixa;
      base.aluno_grau = String(s.current_degree ?? "") || base.aluno_grau;
      base.aluno_modalidade = s.modality || s.discipline || base.aluno_modalidade;
      base.aluno_foto = s.photo_url || base.aluno_foto;
      base.student_name = base.aluno_nome; // compat
    }
    base.certificado_numero = base.certificado_numero || "0001";
    base.certificado_codigo = base.certificado_codigo || "AMT-2026-0001";
    base.certificado_validacao = base.certificado_validacao || "https://dojomanager.amtfightwear.com.br/validar/AMT-2026-0001";
    const ap: any = academyProfile.data;
    if (ap) {
      if (ap.trade_name || ap.legal_name) base.academia_nome = ap.trade_name || ap.legal_name;
      if (ap.address) base.academia_endereco = ap.address;
      if (ap.city) base.academia_cidade = ap.city;
      if (ap.state) base.academia_estado = ap.state;
      if (ap.cnpj) base.academia_cnpj = ap.cnpj;
      if (ap.phone) base.academia_telefone = ap.phone;
      if (ap.email) base.academia_email = ap.email;
      if (ap.logo_url && ap.logo_as_default !== false) base.academia_logo = ap.logo_url;
    }
    return base;
  }, [students.data, previewStudentId, academyProfile.data]);

  const previewTemplate: CertificateTemplate | null = useMemo(() => {
    if (!editing) return null;
    const schema = editing.variables?.editor_schema as EditorSchema;
    const legacy = toLegacyFields(schema);
    return {
      name: editing.name,
      background_url: legacy.background_url,
      width: legacy.width,
      height: legacy.height,
      fields: legacy.fields as any,
      variables: editing.variables,
    };
  }, [editing]);

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>← Voltar aos modelos</Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Pré-visualizar com aluno:
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={previewStudentId}
              onChange={(e) => setPreviewStudentId(e.target.value)}
            >
              <option value="">Dados de exemplo</option>
              {(students.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        </div>

        <CertificateEditor
          initialSchema={editing.variables.editor_schema}
          initialFavorites={editing.variables.favorites ?? []}
          initialRecent={editing.variables.recent ?? []}
          name={editing.name}
          category={editing.category}
          isDefault={!!editing.is_default}
          onNameChange={(name) => setEditing({ ...editing, name })}
          onCategoryChange={(category) => setEditing({ ...editing, category })}
          onDefaultChange={(is_default) => setEditing({ ...editing, is_default })}
          onSave={async ({ schema, favorites, recent }) => {
            const next = { ...editing, variables: { editor_schema: schema, favorites, recent } };
            setEditing(next);
            await persist(next, { silent: true });
          }}
          onPreview={() => setPreviewOpen(true)}
          saving={saving}
        />

        <CertificatePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          template={previewTemplate}
          values={previewValues}
          title={editing.name}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">Modelos de certificado disponíveis para emissão.</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo…" className="h-9 w-56 pl-7 text-sm" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Novo modelo</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTemplates.map((t: any) => {
          const editorSchema: EditorSchema | undefined = t.variables?.editor_schema;
          const elCount = editorSchema?.elements.length ?? t.fields?.length ?? 0;
          const catLabel = CATEGORIES.find((c) => c.id === t.category)?.label ?? "Personalizado";
          const previewUrl = editorSchema?.page.backgroundUrl || t.background_url;

          const setBackground = async (url: string | undefined, w?: number, h?: number) => {
            try {
              const schema: EditorSchema = editorSchema ?? migrateLegacyFields(t);
              const nextSchema: EditorSchema = {
                ...schema,
                page: { ...schema.page, backgroundUrl: url, ...(w ? { width: w } : {}), ...(h ? { height: h } : {}) },
              };
              const legacy = toLegacyFields(nextSchema);
              await saveFn({ data: {
                id: t.id,
                name: t.name,
                background_url: legacy.background_url,
                width: legacy.width,
                height: legacy.height,
                fields: legacy.fields as any,
                variables: { ...(t.variables ?? {}), editor_schema: nextSchema },
                category: t.category ?? "personalizado",
                is_default: !!t.is_default,
                active: true,
              }});
              toast.success(url ? "Plano de fundo atualizado" : "Plano de fundo removido");
              qc.invalidateQueries({ queryKey: ["dojo-templates"] });
            } catch (e: any) { toast.error(e.message); }
          };

          const uploadBackground = async (file: File) => {
            if (!file.type.startsWith("image/")) { toast.error("Envie um arquivo de imagem"); return; }
            if (file.size > 10 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 10MB)"); return; }
            try {
              const path = `certificates/bg-${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
              const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type });
              if (error) throw error;
              const { data } = supabase.storage.from("product-images").getPublicUrl(path);
              const img = new Image();
              await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Falha ao ler imagem")); img.src = data.publicUrl; });
              await setBackground(data.publicUrl, img.naturalWidth, img.naturalHeight);
            } catch (e: any) { toast.error(e.message); }
          };

          return (
            <Card key={t.id} className="dojo-card group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div
                className="relative aspect-[7/5] bg-muted"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2","ring-primary"); }}
                onDragLeave={(e) => e.currentTarget.classList.remove("ring-2","ring-primary")}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("ring-2","ring-primary");
                  const f = e.dataTransfer.files?.[0];
                  if (f) uploadBackground(f);
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt={t.name} className="h-full w-full object-contain" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">Arraste uma imagem ou use o botão abaixo</div>
                )}
                {t.is_default && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-yellow-400/95 px-2 py-0.5 text-[10px] font-bold text-yellow-950 shadow">
                    <Star className="h-3 w-3 fill-current" /> Padrão
                  </span>
                )}
                <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow">{catLabel}</span>

                {/* Overlay de ações do fundo */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-medium text-foreground shadow hover:bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => e.target.files?.[0] && uploadBackground(e.target.files[0])}
                    />
                    <Upload className="h-3 w-3" /> {previewUrl ? "Trocar fundo" : "Enviar fundo"}
                  </label>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Remover plano de fundo deste modelo?")) setBackground(undefined);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-medium text-destructive shadow hover:bg-white"
                    >
                      <ImageOff className="h-3 w-3" /> Remover
                    </button>
                  )}
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-tight">{t.name}</CardTitle>
                <div className="text-[11px] text-muted-foreground">{elCount} elemento{elCount === 1 ? "" : "s"}</div>
              </CardHeader>
              <CardContent className="flex gap-2 pt-0">
                <Button size="sm" onClick={() => openTemplate(t)} className="flex-1">Editar</Button>
                <Button size="icon" variant="outline" title="Duplicar" onClick={() => duplicate(t)}><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" title="Excluir" onClick={async () => {
                  if (confirm(`Excluir modelo "${t.name}"?`)) {
                    await delFn({ data: { id: t.id } });
                    qc.invalidateQueries({ queryKey: ["dojo-templates"] });
                  }
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          );
        })}

        {filteredTemplates.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nenhum modelo encontrado. Clique em <strong>Novo modelo</strong> para criar seu primeiro certificado.
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Para emitir um certificado a partir de um modelo, use a página do aluno na aba <strong>Certificados</strong>.
      </p>
    </div>
  );
}
