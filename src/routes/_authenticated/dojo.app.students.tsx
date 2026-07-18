import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listDojoStudents, saveDojoStudent, deleteDojoStudent, listDojoBelts, listDojoUnits } from "@/lib/dojo/dojo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Pencil, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dojo/app/app/students")({
  component: StudentsPage,
});

const emptyForm = {
  full_name: "", cpf: "", email: "", phone: "", address: "", birth_date: "",
  guardian_name: "", guardian_phone: "", unit_id: null, current_belt_id: null,
  current_degree: 0, status: "active", notes: "", photo_url: "",
};

function StudentsPage() {
  const listFn = useServerFn(listDojoStudents);
  const saveFn = useServerFn(saveDojoStudent);
  const delFn = useServerFn(deleteDojoStudent);
  const beltsFn = useServerFn(listDojoBelts);
  const unitsFn = useServerFn(listDojoUnits);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const q = useQuery({ queryKey: ["dojo-students"], queryFn: () => listFn() });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });

  const filtered = (q.data ?? []).filter((s: any) => {
    const okS = status === "all" || s.status === status;
    const okQ = !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    return okS && okQ;
  });

  const onSave = async () => {
    try {
      const payload = { ...form, current_degree: Number(form.current_degree || 0) };
      Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
      await saveFn({ data: payload });
      toast.success("Salvo");
      setOpen(false); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["dojo-students"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir aluno? Esta ação apaga histórico de graduações e mensalidades.")) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-students"] });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold">Alunos</h2>
        <div className="flex gap-2">
          <Input placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
          <select className="border rounded px-2 bg-background" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="frozen">Trancados</option>
          </select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={() => setForm(emptyForm)}><UserPlus className="h-4 w-4 mr-1" /> Novo aluno</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} aluno</DialogTitle></DialogHeader>
              <div className="grid md:grid-cols-2 gap-3">
                <Input placeholder="Nome completo *" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                <Input placeholder="CPF" value={form.cpf ?? ""} onChange={e => setForm({ ...form, cpf: e.target.value })} />
                <Input placeholder="E-mail" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Telefone" value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <Input type="date" value={form.birth_date ?? ""} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
                <Input placeholder="Endereço" value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} />
                <Input placeholder="Responsável (menor de idade)" value={form.guardian_name ?? ""} onChange={e => setForm({ ...form, guardian_name: e.target.value })} />
                <Input placeholder="Telefone do responsável" value={form.guardian_phone ?? ""} onChange={e => setForm({ ...form, guardian_phone: e.target.value })} />
                <select className="border rounded p-2 bg-background" value={form.unit_id ?? ""} onChange={e => setForm({ ...form, unit_id: e.target.value || null })}>
                  <option value="">— Unidade —</option>
                  {(units.data ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select className="border rounded p-2 bg-background" value={form.current_belt_id ?? ""} onChange={e => setForm({ ...form, current_belt_id: e.target.value || null })}>
                  <option value="">— Faixa atual —</option>
                  {(belts.data ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <Input type="number" placeholder="Grau" value={form.current_degree} onChange={e => setForm({ ...form, current_degree: e.target.value })} />
                <select className="border rounded p-2 bg-background" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="frozen">Trancado</option>
                </select>
                <textarea className="border rounded p-2 bg-background md:col-span-2" rows={3} placeholder="Observações" value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={onSave} className="w-full mt-3">Salvar</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded border">
        {filtered.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between p-3 border-b last:border-0 gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{s.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {s.belt?.name}{s.current_degree ? ` · ${s.current_degree}º grau` : ""} · {s.unit?.name ?? "—"} · {s.email ?? s.phone ?? ""}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-muted"}`}>{s.status}</span>
            <Link to="/dojo/students/$id" params={{ id: s.id }}><Button size="sm" variant="outline">Abrir</Button></Link>
            <Button size="icon" variant="ghost" onClick={() => { setForm(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum aluno.</div>}
      </div>
    </div>
  );
}
