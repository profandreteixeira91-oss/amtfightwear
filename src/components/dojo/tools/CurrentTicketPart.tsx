import { brl } from "@/lib/format";
import { calcCurrent, parseNum, type CurrentResult } from "@/lib/dojo/ticket-calculator";
import { NumField, Notice, Panel, ResultCard } from "./CalcFields";

export type CurrentValues = { revenue: string; students: string; expenses: string };

export function computeCurrent(v: CurrentValues): CurrentResult | null {
  const revenue = parseNum(v.revenue);
  const students = parseNum(v.students);
  const expenses = parseNum(v.expenses);
  if (revenue === null || students === null || expenses === null) return null;
  return calcCurrent({ revenue, students: Math.floor(students), expenses });
}

type Props = { values: CurrentValues; onChange: (v: CurrentValues) => void };

export function CurrentTicketPart({ values, onChange }: Props) {
  const set = (k: keyof CurrentValues) => (s: string) => onChange({ ...values, [k]: s });
  const students = parseNum(values.students);
  const studentsError = values.students.trim() && (students === null || Math.floor(students) === 0)
    ? "Informe ao menos 1 aluno pagante para calcular." : undefined;
  const r = computeCurrent(values);

  return (
    <Panel title="Parte A — Meu ticket médio atual" subtitle="Use os valores reais do último mês.">
      <div className="grid gap-4 md:grid-cols-3">
        <NumField id="a-rev" label="Receita mensal recebida" prefix="R$" value={values.revenue} onChange={set("revenue")} />
        <NumField id="a-stu" label="Alunos pagantes no mês" value={values.students} onChange={set("students")} error={studentsError} />
        <NumField id="a-exp" label="Despesas mensais totais" prefix="R$" value={values.expenses} onChange={set("expenses")} />
      </div>
      <div className="mt-6">
        {r ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ResultCard label="Ticket médio atual" value={brl(r.ticket)} highlight />
            <ResultCard label="Receita mensal" value={brl(r.revenue)} />
            <ResultCard label="Despesas mensais" value={brl(r.expenses)} />
            <ResultCard
              label="Resultado operacional estimado"
              value={brl(r.operatingResult)}
              note="Estimativa: não considera impostos ou despesas não informadas."
            />
            <ResultCard label="Valor por aluno para cobrir despesas" value={brl(r.breakEvenPerStudent)} note="Mantendo a quantidade atual de alunos." />
          </div>
        ) : (
          <Notice>Preencha os três campos (com pelo menos 1 aluno pagante) para ver os resultados.</Notice>
        )}
      </div>
    </Panel>
  );
}
