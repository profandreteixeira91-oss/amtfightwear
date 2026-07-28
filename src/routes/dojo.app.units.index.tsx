import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listDojoUnits, saveDojoUnit, deleteDojoUnit } from "@/lib/dojo/dojo.functions";
import { listAffiliates, saveAffiliate, deleteAffiliate } from "@/lib/dojo/affiliates.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, Search, Building2, Users, MapPin, Phone, Mail, ExternalLink, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";
import { DojoPageShell } from "@/components/dojo/DojoPageShell";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { PinGate } from "@/components/dojo/PinGate";

export const Route = createFileRoute("/dojo/app/units/")({
  head: () => ({ meta: [{ title: "Unidades e Filiais — AMT Dojo Manager" }] }),
  component: () => (
    <PinGate moduleName="Unidades e Filiais">
      <UnitsAndAffiliatesPage />
    </PinGate>
  ),
});

function UnitsAndAffiliatesPage() {
  const [tab, setTab] = useState<"units" | "affiliates">("units");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-7">
      {/* ============ HERO — ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/50 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.55)] md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.9)]">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">Unidades e Filiais</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-300">
              Unidades próprias (integradas ao sistema) e filiais/afiliados (rede institucional).
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full space-y-4">
        <div className="overflow-x-auto rounded-xl border border-red-500/15 bg-neutral-950/60 p-1 shadow-[0_10px_30px_-20px_rgba(220,38,38,0.6)]">
          <TabsList className="flex w-max min-w-full flex-nowrap gap-1 bg-transparent p-0">
            <TabsTrigger value="units" className="gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white">
              <Building2 className="h-4 w-4" /> Unidades Próprias
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white">
              <Users className="h-4 w-4" /> Filiais (Afiliados)
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="units" className="mt-4">
          <OwnUnitsPanel />
        </TabsContent>
        <TabsContent value="affiliates" className="mt-4">
          <AffiliatesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============ UNIDADES PRÓPRIAS ============ */

function emptyUnit(): any {
  return {
    name: "", trade_name: "", legal_name: "", cnpj: "", active: true,
    zip: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    phone: "", whatsapp: "", email: "", website: "",
    manager_name: "", manager_cpf: "",
    logo_url: "", modalities: [],
  };
}

function OwnUnitsPanel() {
  const listFn = useServerFn(listDojoUnits);
  const saveFn = useServerFn(saveDojoUnit);
  const delFn = useServerFn(deleteDojoUnit);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dojo-units"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyUnit());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return q.data ?? [];
    return (q.data ?? []).filter((u: any) =>
      [u.name, u.trade_name, u.city, u.state, u.manager_name].some((v) =>
        String(v ?? "").toLowerCase().includes(s),
      ),
    );
  }, [q.data, search]);

  const onSave = async () => {
    if (saving) return;
    // Guard against duplicate insert: if creating (no id) and a unit with the
    // same normalized name already exists for this owner, update it instead.
    const payload: any = { ...form };
    for (const k of Object.keys(payload)) {
      if (payload[k] === "") payload[k] = null;
    }
    if (!payload.name) { toast.error("Informe o nome da unidade"); return; }
    if (!payload.id) {
      const norm = String(payload.name).trim().toLowerCase();
      const dup = (q.data ?? []).find(
        (u: any) => String(u.name ?? "").trim().toLowerCase() === norm,
      );
      if (dup) {
        payload.id = dup.id;
      }
    }
    setSaving(true);
    try {
      await saveFn({ data: payload });
      toast.success(payload.id ? "Unidade atualizada" : "Unidade cadastrada");
      setOpen(false);
      setForm(emptyUnit());
      qc.invalidateQueries({ queryKey: ["dojo-units"] });
      qc.invalidateQueries({ queryKey: ["dojo-units-switcher"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir esta unidade? Alunos e dados vinculados ficarão sem unidade.")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Unidade excluída");
      qc.invalidateQueries({ queryKey: ["dojo-units"] });
      qc.invalidateQueries({ queryKey: ["dojo-units-switcher"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:w-96">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade ou responsável…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyUnit()); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova unidade</Button>
          </DialogTrigger>
          <UnitDialog form={form} setForm={setForm} onSave={onSave} />
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((u: any) => (
          <div key={u.id} className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {u.logo_url ? (
                  <img src={u.logo_url} alt={u.name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.trade_name || u.name}</div>
                  {u.legal_name && <div className="text-xs text-muted-foreground truncate">{u.legal_name}</div>}
                </div>
              </div>
              <Badge variant={u.active ? "default" : "secondary"}>
                {u.active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {(u.city || u.state) && (
                <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{[u.city, u.state].filter(Boolean).join(" / ")}</div>
              )}
              {u.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{u.phone}</div>}
              {u.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{u.email}</div>}
              {u.manager_name && <div>Responsável: <span className="text-foreground">{u.manager_name}</span></div>}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => { setForm({ ...emptyUnit(), ...u }); setOpen(true); }} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(u.id)} className="gap-1.5 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 rounded-xl border-2 border-dashed bg-white p-10 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <div className="font-medium">Nenhuma unidade cadastrada</div>
            <p className="text-sm text-muted-foreground mt-1">Cadastre sua primeira unidade para começar a organizar sua rede.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UnitDialog({ form, setForm, onSave }: { form: any; setForm: (f: any) => void; onSave: () => void }) {
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{form.id ? "Editar unidade" : "Nova unidade"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <Section title="Dados gerais">
          <Field label="Nome (interno)" required><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Nome fantasia"><Input value={form.trade_name ?? ""} onChange={(e) => set("trade_name", e.target.value)} /></Field>
          <Field label="Razão social"><Input value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} /></Field>
          <Field label="CNPJ"><Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} /></Field>
        </Section>
        <Section title="Endereço">
          <Field label="CEP"><Input value={form.zip ?? ""} onChange={(e) => set("zip", e.target.value)} /></Field>
          <Field label="Rua" className="md:col-span-2"><Input value={form.street ?? ""} onChange={(e) => set("street", e.target.value)} /></Field>
          <Field label="Número"><Input value={form.number ?? ""} onChange={(e) => set("number", e.target.value)} /></Field>
          <Field label="Bairro"><Input value={form.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value)} /></Field>
          <Field label="Cidade"><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="UF"><Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} maxLength={2} /></Field>
        </Section>
        <Section title="Contato">
          <Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="E-mail"><Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Site"><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
        </Section>
        <Section title="Responsável">
          <Field label="Nome do responsável"><Input value={form.manager_name ?? ""} onChange={(e) => set("manager_name", e.target.value)} /></Field>
          <Field label="CPF"><Input value={form.manager_cpf ?? ""} onChange={(e) => set("manager_cpf", e.target.value)} /></Field>
        </Section>
        <Section title="Identidade">
          <Field label="Logo" className="md:col-span-2">
            <LogoUploader kind="logo" value={form.logo_url ?? ""} onChange={(url) => set("logo_url", url)} />
          </Field>
          <Field label="Banner" className="md:col-span-2">
            <LogoUploader kind="banner" value={form.banner_url ?? ""} onChange={(url) => set("banner_url", url)} />
          </Field>
        </Section>
      </div>
      <DialogFooter>
        <Button onClick={onSave}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children, className = "" }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}

/* ============ AFILIADOS ============ */

function emptyAffiliate(): any {
  return {
    academy_name: "", trade_name: "", legal_name: "", cnpj: "",
    manager_name: "", manager_cpf: "", manager_email: "", manager_phone: "",
    status: "em_analise",
    zip: "", street: "", number: "", neighborhood: "", city: "", state: "",
    phone: "", whatsapp: "", email: "", website: "",
    modalities: [],
    joined_at: "", expires_at: "",
    logo_url: "",
    notes: "",
  };
}

const STATUS_LABEL: Record<string, string> = {
  em_analise: "Em análise",
  ativo: "Ativo",
  suspenso: "Suspenso",
  cancelado: "Cancelado",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  em_analise: "secondary",
  ativo: "default",
  suspenso: "outline",
  cancelado: "destructive",
};

function AffiliatesPanel() {
  const listFn = useServerFn(listAffiliates);
  const saveFn = useServerFn(saveAffiliate);
  const delFn = useServerFn(deleteAffiliate);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dojo-affiliates"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyAffiliate());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((a: any) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!s) return true;
      return [a.academy_name, a.trade_name, a.city, a.state, a.manager_name, a.cnpj, a.affiliation_number].some(
        (v) => String(v ?? "").toLowerCase().includes(s),
      );
    });
  }, [q.data, search, statusFilter]);

  const onSave = async () => {
    try {
      const payload: any = { ...form };
      for (const k of Object.keys(payload)) {
        if (payload[k] === "") payload[k] = null;
      }
      if (!payload.academy_name) { toast.error("Informe o nome da academia"); return; }
      await saveFn({ data: payload });
      toast.success(form.id ? "Filial atualizada" : "Filial cadastrada");
      setOpen(false);
      setForm(emptyAffiliate());
      qc.invalidateQueries({ queryKey: ["dojo-affiliates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir esta filial? Cobranças permanecerão no histórico financeiro.")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Filial excluída");
      qc.invalidateQueries({ queryKey: ["dojo-affiliates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row gap-2 flex-1">
          <div className="relative flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade, responsável, CNPJ, nº filiação…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas situações</SelectItem>
              <SelectItem value="em_analise">Em análise</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyAffiliate()); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova filial</Button>
          </DialogTrigger>
          <AffiliateDialog form={form} setForm={setForm} onSave={onSave} />
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a: any) => (
          <div key={a.id} className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {a.logo_url ? (
                  <img src={a.logo_url} alt={a.academy_name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{a.trade_name || a.academy_name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{a.affiliation_number}</div>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[a.status] ?? "outline"}>
                {STATUS_LABEL[a.status] ?? a.status}
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {(a.city || a.state) && (
                <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{[a.city, a.state].filter(Boolean).join(" / ")}</div>
              )}
              {a.manager_name && <div>Responsável: <span className="text-foreground">{a.manager_name}</span></div>}
              {a.teacher?.name && <div>Professor: <span className="text-foreground">{a.teacher.name}</span></div>}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" variant="default" asChild className="gap-1.5">
                <Link to="/dojo/app/units/affiliates/$id" params={{ id: a.id }}>
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setForm({ ...emptyAffiliate(), ...a }); setOpen(true); }} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(a.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 rounded-xl border-2 border-dashed bg-white p-10 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <div className="font-medium">Nenhuma filial cadastrada</div>
            <p className="text-sm text-muted-foreground mt-1">Cadastre academias que fazem parte da sua rede de afiliados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AffiliateDialog({ form, setForm, onSave }: { form: any; setForm: (f: any) => void; onSave: () => void }) {
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const setTeacher = (k: string, v: any) => setForm({ ...form, teacher: { ...(form.teacher ?? {}), [k]: v } });
  const t = form.teacher ?? {};
  return (
    <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{form.id ? "Editar filial" : "Nova filial"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <Section title="Academia">
          <Field label="Nome da academia" required><Input value={form.academy_name ?? ""} onChange={(e) => set("academy_name", e.target.value)} /></Field>
          <Field label="Nome fantasia"><Input value={form.trade_name ?? ""} onChange={(e) => set("trade_name", e.target.value)} /></Field>
          <Field label="Razão social"><Input value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} /></Field>
          <Field label="CNPJ"><Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} /></Field>
          <Field label="Situação">
            <Select value={form.status ?? "em_analise"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="em_analise">Em análise</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data de filiação"><Input type="date" value={form.joined_at ?? ""} onChange={(e) => set("joined_at", e.target.value)} /></Field>
        </Section>
        <Section title="Responsável administrativo">
          <Field label="Nome"><Input value={form.manager_name ?? ""} onChange={(e) => set("manager_name", e.target.value)} /></Field>
          <Field label="CPF"><Input value={form.manager_cpf ?? ""} onChange={(e) => set("manager_cpf", e.target.value)} /></Field>
          <Field label="E-mail"><Input value={form.manager_email ?? ""} onChange={(e) => set("manager_email", e.target.value)} /></Field>
          <Field label="Telefone"><Input value={form.manager_phone ?? ""} onChange={(e) => set("manager_phone", e.target.value)} /></Field>
        </Section>
        <Section title="Professor responsável">
          <Field label="Nome"><Input value={t.name ?? ""} onChange={(e) => setTeacher("name", e.target.value)} /></Field>
          <Field label="Modalidade"><Input value={t.modality ?? ""} onChange={(e) => setTeacher("modality", e.target.value)} /></Field>
          <Field label="Faixa / Graduação"><Input value={t.belt ?? ""} onChange={(e) => setTeacher("belt", e.target.value)} /></Field>
          <Field label="Grau / Dan"><Input value={t.degree ?? ""} onChange={(e) => setTeacher("degree", e.target.value)} /></Field>
        </Section>
        <Section title="Endereço">
          <Field label="CEP"><Input value={form.zip ?? ""} onChange={(e) => set("zip", e.target.value)} /></Field>
          <Field label="Rua" className="md:col-span-2"><Input value={form.street ?? ""} onChange={(e) => set("street", e.target.value)} /></Field>
          <Field label="Número"><Input value={form.number ?? ""} onChange={(e) => set("number", e.target.value)} /></Field>
          <Field label="Bairro"><Input value={form.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value)} /></Field>
          <Field label="Cidade"><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="UF"><Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} maxLength={2} /></Field>
        </Section>
        <Section title="Contato">
          <Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="E-mail"><Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Site"><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
        </Section>
        <Section title="Identidade">
          <Field label="Logo" className="md:col-span-2">
            <LogoUploader kind="affiliate-logo" value={form.logo_url ?? ""} onChange={(url) => set("logo_url", url)} />
          </Field>
        </Section>
        <div className="space-y-1">
          <Label className="text-xs">Anotações</Label>
          <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSave}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function LogoUploader({
  kind, value, onChange,
}: { kind: string; value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 5MB)");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Não autenticado");
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("dojo-brand")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("dojo-brand").getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {value ? (
        <img src={value} alt="preview" className="h-12 w-12 rounded-lg object-cover border" />
      ) : (
        <div className="h-12 w-12 rounded-lg border border-dashed grid place-items-center text-muted-foreground">
          <Building2 className="h-5 w-5" />
        </div>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://... ou faça upload"
        className="flex-1"
      />
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => ref.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </Button>
    </div>
  );
}
