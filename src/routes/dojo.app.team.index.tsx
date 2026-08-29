import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listTeamMembers,
  upsertTeamMember,
  getTeamDashboard,
  updateTeamMemberStatus,
} from "@/lib/dojo/team.functions";
import { DojoPageShell } from "@/components/dojo/DojoPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, GraduationCap, UserSquare2, ShieldCheck, Cake, Wallet, Search, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/team/")({
  head: () => ({
    meta: [
      { title: "Equipe — AMT Dojo Manager" },
      { name: "description", content: "Gestão completa da equipe da academia — professores, instrutores, colaboradores e folha de pagamento." },
    ],
  }),
  component: TeamPage,
});

const ROLE_LABELS: Record<string, string> = {
  teacher: "Professor",
  instructor: "Instrutor",
  assistant: "Auxiliar",
  receptionist: "Recepção",
  finance: "Financeiro",
  admin: "Administrador",
  manager: "Gerente",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  leave: "Afastado",
  vacation: "Férias",
  terminated: "Desligado",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
  leave: "bg-amber-100 text-amber-800 border-amber-200",
  vacation: "bg-blue-100 text-blue-800 border-blue-200",
  terminated: "bg-red-100 text-red-800 border-red-200",
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function TeamPage() {
  const listFn = useServerFn(listTeamMembers);
  const dashFn = useServerFn(getTeamDashboard);
  const saveFn = useServerFn(upsertTeamMember);
  const statusFn = useServerFn(updateTeamMemberStatus);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["team-members"], queryFn: () => listFn() });
  const dash = useQuery({ queryKey: ["team-dashboard"], queryFn: () => dashFn() });
  const staffLinkFn = useServerFn(getMyStaffPortalLink);
  const staffLink = useQuery({ queryKey: ["staff-portal-link"], queryFn: () => staffLinkFn() });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    full_name: "",
    role: "teacher",
    email: "",
    phone: "",
    whatsapp: "",
    cpf: "",
    rg: "",
    birth_date: "",
    gender: "",
    nationality: "",
    admission_date: "",
    zip_code: "",
    address_street: "",
    address_number: "",
    address_neighborhood: "",
    city: "",
    state: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return (list.data ?? []).filter((m: any) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!s) return true;
      return (
        m.full_name?.toLowerCase().includes(s) ||
        m.email?.toLowerCase().includes(s) ||
        m.cpf?.toLowerCase().includes(s)
      );
    });
  }, [list.data, search, roleFilter, statusFilter]);

  const lookupCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (d?.erro) return;
      setForm((f: any) => ({
        ...f,
        address_street: d.logradouro || f.address_street,
        address_neighborhood: d.bairro || f.address_neighborhood,
        city: d.localidade || f.city,
        state: d.uf || f.state,
      }));
    } catch {}
  };

  const onCreate = async () => {
    if (!form.full_name.trim()) {
      toast.error("Informe o nome completo");
      return;
    }
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      );
      await saveFn({ data: { ...payload, full_name: form.full_name, role: form.role } as any });
      toast.success("Colaborador cadastrado");
      setOpen(false);
      setForm({
        full_name: "", role: "teacher", email: "", phone: "", whatsapp: "",
        cpf: "", rg: "", birth_date: "", gender: "", nationality: "",
        admission_date: "", zip_code: "", address_street: "", address_number: "",
        address_neighborhood: "", city: "", state: "",
        emergency_contact_name: "", emergency_contact_phone: "",
      });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["team-dashboard"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onStatusChange = async (id: string, status: string) => {
    try {
      await statusFn({ data: { id, status: status as any } });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["team-dashboard"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const d = dash.data;
  const cards = [
    { label: "Total de colaboradores", value: d?.total ?? 0, icon: Users, ring: "ring-red-400/30", glow: "from-red-500/15 to-red-500/5", iconTone: "text-red-600" },
    { label: "Professores ativos", value: d?.teachers ?? 0, icon: GraduationCap, ring: "ring-emerald-400/30", glow: "from-emerald-400/15 to-emerald-500/5", iconTone: "text-emerald-600" },
    { label: "Instrutores", value: d?.instructors ?? 0, icon: UserSquare2, ring: "ring-indigo-400/30", glow: "from-indigo-400/15 to-indigo-500/5", iconTone: "text-indigo-600" },
    { label: "Administradores", value: d?.admins ?? 0, icon: ShieldCheck, ring: "ring-violet-400/30", glow: "from-violet-400/15 to-violet-500/5", iconTone: "text-violet-600" },
    { label: "Aniversariantes do mês", value: d?.birthdays?.length ?? 0, icon: Cake, ring: "ring-pink-400/30", glow: "from-pink-400/15 to-pink-500/5", iconTone: "text-pink-600" },
    { label: "Folha do mês", value: formatCurrency(d?.payroll_month_total ?? 0), icon: Wallet, ring: "ring-amber-400/30", glow: "from-amber-400/15 to-amber-500/5", iconTone: "text-amber-600" },
  ];


  const fld = (k: string, ph: string, extra?: any) => (
    <Input
      placeholder={ph}
      value={form[k] ?? ""}
      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
      {...extra}
    />
  );

  const createDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 text-white hover:bg-red-500 shadow-[0_10px_25px_-12px_rgba(220,38,38,0.9)]">
          <Plus className="mr-2 h-4 w-4" /> Novo Colaborador
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo colaborador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Identificação</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {fld("full_name", "Nome completo *")}
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fld("cpf", "CPF")}
              {fld("rg", "RG")}
              {fld("birth_date", "Data de nascimento", { type: "date" })}
              {fld("gender", "Sexo")}
              {fld("nationality", "Nacionalidade")}
              {fld("admission_date", "Data de admissão", { type: "date" })}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Contato</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {fld("email", "E-mail", { type: "email" })}
              {fld("phone", "Telefone")}
              {fld("whatsapp", "WhatsApp")}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Endereço</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                placeholder="CEP"
                value={form.zip_code ?? ""}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                onBlur={(e) => lookupCep(e.target.value)}
              />
              <div className="md:col-span-2">{fld("address_street", "Rua")}</div>
              {fld("address_number", "Nº")}
              {fld("address_neighborhood", "Bairro")}
              {fld("city", "Cidade")}
              {fld("state", "UF")}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Contato de emergência</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {fld("emergency_contact_name", "Nome do contato")}
              {fld("emergency_contact_phone", "Telefone")}
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Após criar o cadastro você poderá completar graduação, confederação, documentos, permissões, agenda e financeiro na tela do colaborador.
          </p>
          <Button onClick={onCreate} className="w-full bg-red-600 text-white hover:bg-red-500">
            Cadastrar colaborador
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <DojoPageShell>
      {/* HERO PREMIUM */}
      <section className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black text-white shadow-[0_30px_80px_-30px_rgba(220,38,38,0.45)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:p-7 md:p-9">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-red-200">
              <Users className="h-3 w-3" /> Equipe
            </div>
            <h1 className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
              Sua equipe, com <span className="text-red-400">precisão de tatame</span>
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-neutral-300 md:text-base">
              Cadastre professores, instrutores, recepção e administrativo. Gerencie escalas, folha de pagamento, documentos e permissões em um único lugar.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={async () => {
                const link = staffLink.data;
                if (!link) return;
                const url = `${window.location.origin}${link.path}`;
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link do Portal da Equipe copiado", { description: url });
                } catch {
                  toast.info("Link do Portal da Equipe", { description: url });
                }
              }}
            >
              Link do Portal da Equipe
            </Button>
            <Button variant="outline" asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link to="/dojo/app/team/schedules">Escalas</Link>
            </Button>
            <Button variant="outline" asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link to="/dojo/app/team/payroll">Folha</Link>
            </Button>

            {createDialog}
          </div>
        </div>
      </section>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm ring-1 ${c.ring} transition-all hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.glow} opacity-70`} aria-hidden />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{c.label}</div>
                  <div className="mt-1.5 font-display text-xl font-black leading-none tabular-nums text-neutral-900 md:text-2xl">{c.value}</div>
                </div>
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70 ring-1 ring-inset ring-neutral-200/70 ${c.iconTone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200/70 bg-white/80 p-3 shadow-sm backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, CPF..."
            className="pl-10 border-neutral-200 bg-white focus-visible:ring-red-500/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px] rounded-xl"><SelectValue placeholder="Cargo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm">
        {list.isLoading && (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando colaboradores…</div>
        )}
        {!list.isLoading && filtered.length === 0 && (
          <div className="relative overflow-hidden p-10 text-center">
            <div aria-hidden className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-500/10 blur-2xl" />
            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <p className="mt-3 text-sm font-semibold">Nenhum colaborador encontrado</p>
              <p className="text-xs text-muted-foreground">Comece cadastrando um novo colaborador.</p>
            </div>
          </div>
        )}
        {filtered.map((m: any) => (
          <div
            key={m.id}
            className="group flex flex-wrap items-center gap-3 border-b border-neutral-200/70 p-3 transition-colors last:border-0 hover:bg-red-50/40"
          >
            <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
              <AvatarImage src={m.photo_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-neutral-900 to-neutral-700 text-white">
                {m.full_name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 basis-[calc(100%-3.75rem)] sm:basis-auto">
              <Link
                to="/dojo/app/team/$id"
                params={{ id: m.id }}
                className="block truncate font-semibold tracking-tight text-neutral-900 hover:text-red-600 hover:underline"
              >
                {m.full_name}
              </Link>
              <div className="truncate text-xs text-muted-foreground">
                <span className="font-medium text-neutral-700">{ROLE_LABELS[m.role] ?? m.role}</span>
                {m.email ? ` · ${m.email}` : ""}
                {m.phone ? ` · ${m.phone}` : ""}
              </div>
            </div>
            <Select value={m.status} onValueChange={(v) => onStatusChange(m.id, v)}>
              <SelectTrigger
                className={`h-9 w-full rounded-full border px-3 text-xs font-medium sm:w-[150px] ${STATUS_COLORS[m.status] ?? ""}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full bg-red-600 text-white hover:bg-red-500 sm:w-auto" asChild>
              <Link to="/dojo/app/team/$id" params={{ id: m.id }}>Abrir</Link>
            </Button>
          </div>
        ))}
      </div>
    </DojoPageShell>
  );
}

