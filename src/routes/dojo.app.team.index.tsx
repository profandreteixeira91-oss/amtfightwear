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
import { Badge } from "@/components/ui/badge";
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

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ full_name: string; role: string; email: string; phone: string; whatsapp: string }>({
    full_name: "",
    role: "teacher",
    email: "",
    phone: "",
    whatsapp: "",
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

  const onCreate = async () => {
    if (!form.full_name.trim()) {
      toast.error("Informe o nome completo");
      return;
    }
    try {
      await saveFn({
        data: {
          full_name: form.full_name,
          role: form.role as any,
          email: form.email || undefined,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
        },
      });
      toast.success("Colaborador cadastrado");
      setOpen(false);
      setForm({ full_name: "", role: "teacher", email: "", phone: "", whatsapp: "" });
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
    { label: "Total de colaboradores", value: d?.total ?? 0, icon: Users, tone: "text-blue-600" },
    { label: "Professores ativos", value: d?.teachers ?? 0, icon: GraduationCap, tone: "text-emerald-600" },
    { label: "Instrutores", value: d?.instructors ?? 0, icon: UserSquare2, tone: "text-indigo-600" },
    { label: "Administradores", value: d?.admins ?? 0, icon: ShieldCheck, tone: "text-purple-600" },
    { label: "Aniversariantes do mês", value: d?.birthdays?.length ?? 0, icon: Cake, tone: "text-pink-600" },
    { label: "Folha do mês", value: formatCurrency(d?.payroll_month_total ?? 0), icon: Wallet, tone: "text-orange-600" },
  ];

  const createDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Colaborador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo colaborador</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Nome completo"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <p className="text-xs text-muted-foreground">
            Você pode completar os dados profissionais, financeiros, permissões, agenda e documentos após criar o cadastro.
          </p>
          <Button onClick={onCreate} className="w-full">Cadastrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <DojoPageShell
      title="Equipe"
      description="Central de gestão da sua equipe: professores, instrutores, recepção, administrativo e financeiro."
      actions={createDialog}
    >
      {/* Dashboard cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="mt-1 text-lg font-semibold">{c.value}</div>
                </div>
                <Icon className={`h-6 w-6 ${c.tone}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, e-mail, CPF..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Cargo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" asChild>
          <Link to="/dojo/app/team/payroll">Folha de pagamento</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dojo/app/team/attendance">Ponto</Link>
        </Button>
      </div>

      {/* List */}
      <div className="mt-4 rounded-lg border bg-card">
        {list.isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>}
        {!list.isLoading && filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum colaborador encontrado. Comece cadastrando um novo colaborador.
          </div>
        )}
        {filtered.map((m: any) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 border-b p-3 last:border-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={m.photo_url ?? undefined} />
              <AvatarFallback>{m.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-[180px] flex-1">
              <Link
                to="/dojo/app/team/$id"
                params={{ id: m.id }}
                className="font-medium hover:underline"
              >
                {m.full_name}
              </Link>
              <div className="text-xs text-muted-foreground">
                {ROLE_LABELS[m.role] ?? m.role}
                {m.email ? ` · ${m.email}` : ""}
                {m.phone ? ` · ${m.phone}` : ""}
              </div>
            </div>
            <Badge variant="outline" className={STATUS_COLORS[m.status]}>
              {STATUS_LABELS[m.status] ?? m.status}
            </Badge>
            <Select value={m.status} onValueChange={(v) => onStatusChange(m.id, v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" asChild>
              <Link to="/dojo/app/team/$id" params={{ id: m.id }}>Abrir</Link>
            </Button>
          </div>
        ))}
      </div>
    </DojoPageShell>
  );
}
