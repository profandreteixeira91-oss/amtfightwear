import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listDojoInvoices, markDojoInvoicePaid, deleteDojoInvoice,
  listDojoExpenses, saveDojoExpense, deleteDojoExpense,
  dojoFinanceOverview, generateMonthlyInvoices,
} from "@/lib/dojo/dojo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dojo/app/finance")({
  component: FinancePage,
});

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinancePage() {
  const invFn = useServerFn(listDojoInvoices);
  const payFn = useServerFn(markDojoInvoicePaid);
  const delInvFn = useServerFn(deleteDojoInvoice);
  const expFn = useServerFn(listDojoExpenses);
  const saveExpFn = useServerFn(saveDojoExpense);
  const delExpFn = useServerFn(deleteDojoExpense);
  const ovFn = useServerFn(dojoFinanceOverview);
  const genFn = useServerFn(generateMonthlyInvoices);
  const qc = useQueryClient();

  const [status, setStatus] = useState("all");
  const overview = useQuery({ queryKey: ["dojo-finance"], queryFn: () => ovFn({ data: {} }) });
  const invs = useQuery({ queryKey: ["dojo-invoices", status], queryFn: () => invFn({ data: { status } }) });
  const exps = useQuery({ queryKey: ["dojo-expenses"], queryFn: () => expFn() });

  const [exp, setExp] = useState({ description: "", amount: "", due_date: new Date().toISOString().slice(0,10), category: "" });

  const now = new Date();
  const ref = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const [refMonth, setRefMonth] = useState(ref);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dojo-invoices"] });
    qc.invalidateQueries({ queryKey: ["dojo-expenses"] });
    qc.invalidateQueries({ queryKey: ["dojo-finance"] });
  };

  const doGenerate = async () => {
    try {
      const r = await genFn({ data: { reference_month: refMonth } });
      toast.success(`${r.created} cobranças criadas`);
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const doAddExp = async () => {
    if (!exp.description || !exp.amount) return toast.error("Preencha descrição e valor");
    await saveExpFn({ data: { description: exp.description, amount: Number(exp.amount), due_date: exp.due_date, category: exp.category || null } });
    setExp({ description: "", amount: "", due_date: new Date().toISOString().slice(0,10), category: "" });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Recebido</CardTitle></CardHeader><CardContent className="text-xl font-bold text-green-600">{brl(overview.data?.received ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">A receber</CardTitle></CardHeader><CardContent className="text-xl font-bold text-amber-600">{brl(overview.data?.receivable ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Pago</CardTitle></CardHeader><CardContent className="text-xl font-bold text-red-600">{brl(overview.data?.paid ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Saldo</CardTitle></CardHeader><CardContent className="text-xl font-bold">{brl(overview.data?.balance ?? 0)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Gerar mensalidades do mês</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-center">
          <Input type="month" value={refMonth} onChange={e => setRefMonth(e.target.value)} className="w-48" />
          <Button onClick={doGenerate}>Gerar cobranças</Button>
          <span className="text-sm text-muted-foreground">Cria uma cobrança por matrícula ativa, respeitando o dia de vencimento e valor customizado.</span>
        </CardContent>
      </Card>

      <Tabs defaultValue="receivables">
        <TabsList>
          <TabsTrigger value="receivables">Contas a receber</TabsTrigger>
          <TabsTrigger value="payables">Contas a pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="space-y-2">
          <div className="flex gap-2">
            <select className="border rounded px-2 bg-background" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">Todas</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagas</option>
              <option value="overdue">Atrasadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          <div className="border rounded">
            {(invs.data ?? []).map((i: any) => (
              <div key={i.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm gap-2">
                <div className="flex-1 min-w-0 truncate">
                  <div className="font-medium">{i.student?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{i.description} · {brl(i.amount)} · venc. {i.due_date}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${i.status === "paid" ? "bg-green-100 text-green-800" : i.status === "overdue" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{i.status}</span>
                {i.status !== "paid" && <Button size="sm" variant="outline" onClick={async () => { await payFn({ data: { id: i.id, method: "cash" } }); refresh(); }}>Pago</Button>}
                <Button size="icon" variant="ghost" onClick={async () => { await delInvFn({ data: { id: i.id } }); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {(invs.data ?? []).length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma cobrança.</div>}
          </div>
        </TabsContent>

        <TabsContent value="payables" className="space-y-2">
          <div className="grid md:grid-cols-5 gap-2">
            <Input placeholder="Descrição" value={exp.description} onChange={e => setExp({ ...exp, description: e.target.value })} />
            <Input placeholder="Categoria" value={exp.category} onChange={e => setExp({ ...exp, category: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Valor" value={exp.amount} onChange={e => setExp({ ...exp, amount: e.target.value })} />
            <Input type="date" value={exp.due_date} onChange={e => setExp({ ...exp, due_date: e.target.value })} />
            <Button onClick={doAddExp}>Adicionar</Button>
          </div>
          <div className="border rounded">
            {(exps.data ?? []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm gap-2">
                <div className="flex-1 min-w-0 truncate">
                  <div className="font-medium">{e.description}</div>
                  <div className="text-xs text-muted-foreground">{e.category ?? "—"} · {brl(e.amount)} · venc. {e.due_date}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${e.status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{e.status}</span>
                {e.status !== "paid" && <Button size="sm" variant="outline" onClick={async () => { await saveExpFn({ data: { id: e.id, description: e.description, amount: Number(e.amount), due_date: e.due_date, status: "paid", paid_at: new Date().toISOString() } }); refresh(); }}>Pago</Button>}
                <Button size="icon" variant="ghost" onClick={async () => { await delExpFn({ data: { id: e.id } }); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {(exps.data ?? []).length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma despesa.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
