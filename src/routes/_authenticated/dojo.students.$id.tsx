import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getDojoStudent, listDojoBelts, listDojoPlans,
  addDojoGraduation, deleteDojoGraduation,
  saveDojoEnrollment, deleteDojoEnrollment,
  saveDojoInvoice, markDojoInvoicePaid, deleteDojoInvoice,
} from "@/lib/dojo/dojo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dojo/students/$id")({
  component: StudentDetail,
});

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StudentDetail() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getDojoStudent);
  const beltsFn = useServerFn(listDojoBelts);
  const plansFn = useServerFn(listDojoPlans);
  const addGrad = useServerFn(addDojoGraduation);
  const delGrad = useServerFn(deleteDojoGraduation);
  const saveEnroll = useServerFn(saveDojoEnrollment);
  const delEnroll = useServerFn(deleteDojoEnrollment);
  const saveInv = useServerFn(saveDojoInvoice);
  const payInv = useServerFn(markDojoInvoicePaid);
  const delInv = useServerFn(deleteDojoInvoice);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["dojo-student", id], queryFn: () => getFn({ data: { id } }) });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const plans = useQuery({ queryKey: ["dojo-plans"], queryFn: () => plansFn() });

  const [grad, setGrad] = useState({ belt_id: "", degree: 0, graduation_date: new Date().toISOString().slice(0,10), evaluator: "", notes: "" });
  const [enroll, setEnroll] = useState({ plan_id: "", custom_amount: "", due_day: 5, start_date: new Date().toISOString().slice(0,10), status: "active" as const });
  const [inv, setInv] = useState({ description: "", amount: "", due_date: new Date().toISOString().slice(0,10) });

  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-student", id] });

  const doAddGrad = async () => {
    if (!grad.belt_id) return toast.error("Escolha a faixa");
    await addGrad({ data: { student_id: id, ...grad, degree: Number(grad.degree) } });
    toast.success("Graduação registrada"); refresh();
    setGrad({ ...grad, evaluator: "", notes: "" });
  };

  const doAddEnroll = async () => {
    if (!enroll.plan_id) return toast.error("Escolha o plano");
    await saveEnroll({ data: {
      student_id: id, plan_id: enroll.plan_id,
      custom_amount: enroll.custom_amount ? Number(enroll.custom_amount) : null,
      due_day: Number(enroll.due_day), start_date: enroll.start_date, status: enroll.status,
    }});
    toast.success("Matrícula salva"); refresh();
  };

  const doAddInv = async () => {
    if (!inv.amount) return toast.error("Informe o valor");
    await saveInv({ data: {
      student_id: id, description: inv.description || "Mensalidade",
      amount: Number(inv.amount), due_date: inv.due_date,
    }});
    toast.success("Cobrança criada"); refresh();
    setInv({ description: "", amount: "", due_date: new Date().toISOString().slice(0,10) });
  };

  if (!q.data) return <div>Carregando…</div>;
  const s = q.data.student;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/dojo/students" className="text-sm text-muted-foreground hover:underline">← Alunos</Link>
      </div>
      <Card>
        <CardHeader><CardTitle>{s.full_name}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground grid md:grid-cols-3 gap-2">
          <div>Status: <b>{s.status}</b></div>
          <div>CPF: {s.cpf ?? "—"}</div>
          <div>E-mail: {s.email ?? "—"}</div>
          <div>Telefone: {s.phone ?? "—"}</div>
          <div>Grau atual: {s.current_degree}</div>
          <div>Nascimento: {s.birth_date ?? "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Graduações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-6 gap-2">
            <select className="border rounded p-2 bg-background" value={grad.belt_id} onChange={e => setGrad({ ...grad, belt_id: e.target.value })}>
              <option value="">Faixa</option>
              {(belts.data ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <Input type="number" placeholder="Grau" value={grad.degree} onChange={e => setGrad({ ...grad, degree: Number(e.target.value) })} />
            <Input type="date" value={grad.graduation_date} onChange={e => setGrad({ ...grad, graduation_date: e.target.value })} />
            <Input placeholder="Avaliador" value={grad.evaluator} onChange={e => setGrad({ ...grad, evaluator: e.target.value })} />
            <Input placeholder="Obs." value={grad.notes} onChange={e => setGrad({ ...grad, notes: e.target.value })} />
            <Button onClick={doAddGrad}>Registrar</Button>
          </div>
          <div className="border rounded">
            {q.data.graduations.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm">
                <div>{g.belt?.name} · {g.degree}º grau · {g.graduation_date} · {g.evaluator ?? "—"}</div>
                <Button size="icon" variant="ghost" onClick={async () => { await delGrad({ data: { id: g.id } }); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {q.data.graduations.length === 0 && <div className="p-3 text-sm text-muted-foreground">Sem graduações.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Matrícula / Plano</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-6 gap-2">
            <select className="border rounded p-2 bg-background" value={enroll.plan_id} onChange={e => setEnroll({ ...enroll, plan_id: e.target.value })}>
              <option value="">Plano</option>
              {(plans.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name} · {brl(p.amount)}</option>)}
            </select>
            <Input type="number" step="0.01" placeholder="Valor custom (R$)" value={enroll.custom_amount} onChange={e => setEnroll({ ...enroll, custom_amount: e.target.value })} />
            <Input type="number" min={1} max={28} placeholder="Dia venc." value={enroll.due_day} onChange={e => setEnroll({ ...enroll, due_day: Number(e.target.value) })} />
            <Input type="date" value={enroll.start_date} onChange={e => setEnroll({ ...enroll, start_date: e.target.value })} />
            <Button onClick={doAddEnroll}>Salvar</Button>
          </div>
          <div className="border rounded">
            {q.data.enrollments.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm">
                <div>{e.plan?.name} · {brl(e.custom_amount ?? e.plan?.amount)} · venc. dia {e.due_day} · {e.status}</div>
                <Button size="icon" variant="ghost" onClick={async () => { await delEnroll({ data: { id: e.id } }); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {q.data.enrollments.length === 0 && <div className="p-3 text-sm text-muted-foreground">Sem matrículas.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mensalidades / Cobranças</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-5 gap-2">
            <Input placeholder="Descrição" value={inv.description} onChange={e => setInv({ ...inv, description: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Valor" value={inv.amount} onChange={e => setInv({ ...inv, amount: e.target.value })} />
            <Input type="date" value={inv.due_date} onChange={e => setInv({ ...inv, due_date: e.target.value })} />
            <Button onClick={doAddInv} className="md:col-span-2">Criar cobrança</Button>
          </div>
          <div className="border rounded">
            {q.data.invoices.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm gap-2">
                <div className="flex-1 min-w-0 truncate">{i.description} · {brl(i.amount)} · venc. {i.due_date}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${i.status === "paid" ? "bg-green-100 text-green-800" : i.status === "overdue" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{i.status}</span>
                {i.status !== "paid" && <Button size="sm" variant="outline" onClick={async () => { await payInv({ data: { id: i.id, method: "cash" } }); refresh(); }}>Marcar pago</Button>}
                <Button size="icon" variant="ghost" onClick={async () => { await delInv({ data: { id: i.id } }); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {q.data.invoices.length === 0 && <div className="p-3 text-sm text-muted-foreground">Sem cobranças.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
