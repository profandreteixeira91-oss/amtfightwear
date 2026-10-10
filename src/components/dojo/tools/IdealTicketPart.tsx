import { brl, intFmt } from "@/lib/format";
import { calcIdeal, parseNum, type IdealInput } from "@/lib/dojo/ticket-calculator";
import { NumField, Notice, Panel, ResultCard } from "./CalcFields";

export type IdealValues = Record<keyof IdealInput, string>;
export const EMPTY_IDEAL: IdealValues = {
  fixed: "", variable: "", profitGoal: "", feePercent: "",
  classesPerWeek: "", seatsPerClass: "", classesPerStudent: "", currentStudents: "",
};

type Props = { values: IdealValues; onChange: (v: IdealValues) => void; currentTicket: number | null };

const REASON: Record<"fee" | "frequency" | "capacity", string> = {
  fee: "O percentual de taxas precisa ser menor que 100%.",
  frequency: "Informe quantas aulas, em média, cada aluno frequenta por semana (maior que zero).",
  capacity: "Com a grade informada a capacidade é zero. Revise aulas por semana e vagas por aula.",
};

function parseAll(v: IdealValues): IdealInput | null {
  const out = {} as IdealInput;
  for (const k of Object.keys(v) as (keyof IdealInput)[]) {
    const n = parseNum(v[k]);
    if (n === null) return null;
    out[k] = n;
  }
  return out;
}

export function IdealTicketPart({ values, onChange, currentTicket }: Props) {
  const set = (k: keyof IdealValues) => (s: string) => onChange({ ...values, [k]: s });
  const input = parseAll(values);
  const r = input ? calcIdeal(input) : null;
  const fee = parseNum(values.feePercent);
  const feeError = fee !== null && fee >= 100 ? REASON.fee : undefined;
  const diff = r?.ok && currentTicket !== null ? r.idealTicket - currentTicket : null;

  return (
    <Panel title="Parte B — Meu ticket médio ideal" subtitle="Quanto cobrar para cobrir custos e atingir sua meta de lucro.">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#111111]/60">Despesas e meta</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <NumField id="b-fix" label="Despesas fixas mensais" prefix="R$" value={values.fixed} onChange={set("fixed")} />
        <NumField id="b-var" label="Despesas variáveis mensais" prefix="R$" value={values.variable} onChange={set("variable")} />
        <NumField id="b-goal" label="Meta de lucro operacional mensal" prefix="R$" value={values.profitGoal} onChange={set("profitGoal")} />
        <NumField id="b-fee" label="Taxas sobre o faturamento" suffix="%" value={values.feePercent} onChange={set("feePercent")} error={feeError} hint="Impostos e taxas de pagamento ainda não incluídos nas despesas. Use 0 se já incluídos." />
      </div>
      <p className="mt-3 text-xs text-[#111111]/60">
        Não conte a mesma despesa duas vezes: custos de professores já incluídos nas despesas não devem ser somados novamente.
      </p>

      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[#111111]/60">Grade de horários e capacidade</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <NumField id="b-cls" label="Aulas por semana" value={values.classesPerWeek} onChange={set("classesPerWeek")} />
        <NumField id="b-seat" label="Vagas médias por aula" value={values.seatsPerClass} onChange={set("seatsPerClass")} />
        <NumField id="b-freq" label="Aulas frequentadas por aluno/semana" value={values.classesPerStudent} onChange={set("classesPerStudent")} />
        <NumField id="b-stu" label="Alunos pagantes atuais" value={values.currentStudents} onChange={set("currentStudents")} />
      </div>

      <div className="mt-6 space-y-3">
        {!r && <Notice>Preencha todos os campos (use 0 quando não se aplicar) para ver os resultados.</Notice>}
        {r && !r.ok && <Notice tone="warn">{REASON[r.reason]}</Notice>}
        {r?.ok && (
          <>
            {r.exceedsCapacity && <Notice tone="warn">Seus alunos atuais superam a capacidade estimada da grade. Revise os dados de aulas, vagas e frequência. A projeção usa a capacidade como limite.</Notice>}
            {r.usesFullCapacity && <Notice>Sem alunos atuais informados: a projeção considera ocupação total da capacidade — é um cenário potencial, não uma previsão de matrículas.</Notice>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ResultCard label="Capacidade teórica" value={`${intFmt(r.capacity)} alunos`} />
              <ResultCard label="Alunos na projeção" value={intFmt(r.projectedStudents)} />
              <ResultCard label="Receita para cobrir custos" value={brl(r.breakEvenRevenue)} />
              <ResultCard label="Ticket de equilíbrio" value={brl(r.breakEvenTicket)} />
              <ResultCard label="Receita para a meta de lucro" value={brl(r.requiredRevenue)} />
              <ResultCard label="Ticket médio ideal" value={brl(r.idealTicket)} highlight />
              {diff !== null && <ResultCard label="Diferença vs. ticket atual (Parte A)" value={`${diff > 0 ? "+" : ""}${brl(diff)}`} />}
            </div>
            {diff !== null && diff > 0 && (
              <Notice>Para atingir a meta, o ajuste médio necessário é de {brl(diff)} por aluno. Se não for viável, simule mudanças nos custos, horários, ocupação ou na meta de lucro.</Notice>
            )}
            <p className="text-xs text-[#111111]/55">
              A capacidade é uma estimativa: conflitos de horários, modalidades e a distribuição dos alunos podem reduzi-la. Os resultados não são garantia financeira.
            </p>
          </>
        )}
      </div>
    </Panel>
  );
}
