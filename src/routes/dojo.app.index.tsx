import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { dojoFinanceOverview, listDojoStudents } from "@/lib/dojo/dojo.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dojo/app/")({
  component: DojoDashboard,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function DojoDashboard() {
  const finFn = useServerFn(dojoFinanceOverview);
  const stuFn = useServerFn(listDojoStudents);
  const fin = useQuery({ queryKey: ["dojo-finance"], queryFn: () => finFn({ data: {} }) });
  const stu = useQuery({ queryKey: ["dojo-students"], queryFn: () => stuFn() });

  const active = (stu.data ?? []).filter((s: any) => s.status === "active").length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card><CardHeader><CardTitle className="text-sm">Alunos ativos</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{active}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Recebido no mês</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">{brl(fin.data?.received ?? 0)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">A receber</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-600">{brl(fin.data?.receivable ?? 0)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Saldo do mês</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{brl(fin.data?.balance ?? 0)}</CardContent></Card>
    </div>
  );
}
