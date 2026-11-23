import { useEffect, useMemo, useState } from "react";
import { Clock, Download, Sheet, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { diffDaysISO, formatBR, todayISO } from "@/lib/dates";
import { STAGE_ACCENT, STAGE_LABEL } from "@/lib/store/production-stages";
import { gridByOrder, gridConsolidated, gridCsv } from "@/lib/store/production-grid";
import type { GridRow } from "@/lib/store/production-grid";
import type { ProductionJob } from "@/lib/store/production.functions";
import { BeltSwatch } from "./BeltSwatch";

type Mode = "cliente" | "somado";
/** Seleção parcial (parte das linhas do pedido): caixa meio preenchida, diferente da marcada. */
const PARTIAL_CLS = "data-[state=indeterminate]:bg-primary/25";
const MODE_KEY = "amt-producao-planilha-modo";

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "somado" ? "somado" : "cliente";
  } catch {
    return "cliente";
  }
}

function deadlineText(deadline: string | null) {
  if (!deadline) return { text: "Sem prazo", cls: "text-muted-foreground" };
  const days = diffDaysISO(todayISO(), deadline);
  if (days < 0)
    return {
      text: `${formatBR(deadline)} · atrasado ${Math.abs(days)}d`,
      cls: "text-destructive font-semibold",
    };
  if (days === 0)
    return { text: `${formatBR(deadline)} · entrega hoje`, cls: "text-amber-500 font-semibold" };
  return { text: `${formatBR(deadline)} · ${days}d`, cls: "text-muted-foreground" };
}

/**
 * Fila de produção em formato de planilha: uma tabela por pedido (cliente),
 * linhas por modelo/cor e colunas por tamanho. "Tudo somado" junta todos os
 * pedidos para corte e separação.
 */
export function ProductionSpreadsheet({
  jobs,
  selected,
  onSelect,
  onOpen,
}: {
  jobs: ProductionJob[];
  selected: Record<string, boolean>;
  onSelect: (ids: string[], on: boolean) => void;
  onOpen: (j: ProductionJob) => void;
}) {
  const [mode, setModeState] = useState<Mode>("cliente");
  useEffect(() => setModeState(readMode()), []);
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* preferência só desta tela */
    }
  };

  const orders = useMemo(() => gridByOrder(jobs), [jobs]);
  const all = useMemo(() => gridConsolidated(jobs), [jobs]);

  function downloadCsv() {
    const blob = new Blob([gridCsv(orders)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fila-producao-${todayISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const pieces = all.total;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5"
          role="tablist"
        >
          <ModeButton active={mode === "cliente"} onClick={() => setMode("cliente")} icon={Sheet}>
            Por cliente
          </ModeButton>
          <ModeButton active={mode === "somado"} onClick={() => setMode("somado")} icon={Sigma}>
            Tudo somado
          </ModeButton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {orders.length} pedido(s) · {pieces} peça(s)
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={downloadCsv}
            disabled={!orders.length}
          >
            <Download className="h-4 w-4" /> Baixar planilha
          </Button>
        </div>
      </div>

      {!jobs.length ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum item na fila com os filtros atuais.
        </p>
      ) : mode === "somado" ? (
        <section className="rounded-xl border border-border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Todos os pedidos somados</h3>
              <p className="text-xs text-muted-foreground">
                Quantidade por modelo, cor e tamanho para corte e separação.
              </p>
            </div>
            <span className="text-sm font-bold">{all.total} peças</span>
          </header>
          <Grid
            rows={all.rows}
            sizes={all.sizes}
            total={all.total}
            selected={selected}
            onSelect={onSelect}
            onOpen={onOpen}
            ordersOf={all.ordersOf}
          />
        </section>
      ) : (
        orders.map((o) => {
          const ids = o.jobs.map((j) => j.id);
          const allOn = ids.every((id) => selected[id]);
          const someOn = !allOn && ids.some((id) => selected[id]);
          const dl = deadlineText(o.deadline);
          return (
            <section key={o.key} className="rounded-xl border border-border bg-card">
              <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3">
                <Checkbox
                  checked={allOn ? true : someOn ? "indeterminate" : false}
                  onCheckedChange={() => onSelect(ids, !allOn)}
                  aria-label={`Selecionar o pedido de ${o.customer}`}
                  className={PARTIAL_CLS}
                />
                <div className="min-w-[10rem] flex-1">
                  <h3 className="truncate text-sm font-semibold">{o.customer}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.references.join(", ") || "Sem referência"}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs ${dl.cls}`}>
                  <Clock className="h-3 w-3" /> {dl.text}
                </span>
                <span className="text-sm font-bold">
                  {o.total} {o.total === 1 ? "peça" : "peças"}
                </span>
              </header>
              <Grid
                rows={o.rows}
                sizes={o.sizes}
                total={o.total}
                selected={selected}
                onSelect={onSelect}
                onOpen={onOpen}
              />
            </section>
          );
        })
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sheet;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function Grid({
  rows,
  sizes,
  total,
  selected,
  onSelect,
  onOpen,
  ordersOf,
}: {
  rows: GridRow[];
  sizes: string[];
  total: number;
  selected: Record<string, boolean>;
  onSelect: (ids: string[], on: boolean) => void;
  onOpen: (j: ProductionJob) => void;
  /** Só na visão somada: quantos pedidos levam o modelo (e sem os nomes de bordado). */
  ordersOf?: (r: GridRow) => number;
}) {
  const colTotal = (s: string) => rows.reduce((a, r) => a + (r.cells.get(s) ?? 0), 0);
  // Coluna do modelo fixa à esquerda: com muitos tamanhos a tabela rola para o lado sem perder a linha.
  const stickyCol = "sticky left-0 z-[1] border-r border-border bg-card";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <th
              className={`${stickyCol} min-w-[170px] bg-muted px-3 py-2 text-left font-medium sm:min-w-[300px] lg:min-w-[380px]`}
            >
              Modelo / cor
            </th>
            {sizes.map((s) => (
              <th
                key={s}
                className="min-w-[48px] border-l border-border/60 px-2 py-2 text-center font-semibold text-foreground"
              >
                {s}
              </th>
            ))}
            <th className="min-w-[56px] border-l border-border px-2 py-2 text-center font-semibold text-foreground">
              Total
            </th>
            {ordersOf ? <th className="px-2 py-2 text-center font-medium">Pedidos</th> : null}
            <th className="px-3 py-2 text-left font-medium">Etapa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ids = r.jobs.map((j) => j.id);
            const on = ids.every((id) => selected[id]);
            const some = !on && ids.some((id) => selected[id]);
            return (
              <tr
                key={r.key}
                className={`group border-b border-border/60 align-middle ${on ? "bg-primary/5" : "hover:bg-muted/30"}`}
              >
                <td
                  className={`${stickyCol} px-3 py-2 ${on ? "bg-accent" : "group-hover:bg-muted"}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={on ? true : some ? "indeterminate" : false}
                      onCheckedChange={() => onSelect(ids, !on)}
                      aria-label={`Selecionar ${r.model.label}`}
                      className={`mt-0.5 ${PARTIAL_CLS}`}
                    />
                    <button
                      type="button"
                      onClick={() => onOpen(r.jobs[0])}
                      className="min-w-0 flex-1 text-left"
                      title="Abrir item"
                    >
                      <span className="flex items-center gap-2">
                        {r.model.belt ? (
                          <BeltSwatch spec={r.model.belt} className="h-3 w-5 shrink-0 sm:w-12" />
                        ) : null}
                        <span className="font-medium leading-snug">{r.model.label}</span>
                      </span>
                      {r.model.sub ? (
                        <span className="block text-[11px] text-muted-foreground">
                          {r.model.sub}
                        </span>
                      ) : null}
                      {!ordersOf && r.notes.length ? (
                        <span
                          className="mt-0.5 line-clamp-2 text-[11px] text-fuchsia-600 dark:text-fuchsia-400"
                          title={r.notes.join(" · ")}
                        >
                          {r.notes.join(" · ")}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </td>
                {sizes.map((s) => {
                  const n = r.cells.get(s);
                  const cellJobs = r.cellJobs.get(s);
                  return (
                    <td key={s} className="border-l border-border/60 p-0 text-center">
                      {n ? (
                        <button
                          type="button"
                          onClick={() => cellJobs?.[0] && onOpen(cellJobs[0])}
                          className="min-h-[40px] w-full px-2 py-2 text-base font-bold tabular-nums hover:bg-primary/10"
                          title={`${n} peça(s) no tamanho ${s}`}
                        >
                          {n}
                        </button>
                      ) : null}
                    </td>
                  );
                })}
                <td className="border-l border-border bg-muted/20 px-2 py-2 text-center text-base font-bold tabular-nums">
                  {r.total}
                </td>
                {ordersOf ? (
                  <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
                    {ordersOf(r)}
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.stages.map((st) => (
                      <span
                        key={st}
                        className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${STAGE_ACCENT[st]}`}
                      >
                        {STAGE_LABEL[st]}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/40 text-xs">
            <td
              className={`${stickyCol} bg-muted px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground`}
            >
              Total por tamanho
            </td>
            {sizes.map((s) => (
              <td
                key={s}
                className="border-l border-border/60 px-2 py-2 text-center text-sm font-bold tabular-nums"
              >
                {colTotal(s)}
              </td>
            ))}
            <td className="border-l border-border px-2 py-2 text-center text-sm font-extrabold tabular-nums text-primary">
              {total}
            </td>
            {ordersOf ? <td /> : null}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
