import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mail, Play, Pause, Plus, Users2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EMAIL_FLOWS } from "@/lib/marketMock";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market/crm")({
  head: () => ({ meta: [{ title: "CRM & E-mail — AMT MarketEngine" }] }),
  component: CrmPage,
});

const STATUS_STYLE: Record<string, string> = {
  Ativa: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Pausada: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Rascunho: "bg-muted text-muted-foreground",
};

function CrmPage() {
  const totalRev = EMAIL_FLOWS.reduce((a, f) => a + f.revenue, 0);
  const activeFlows = EMAIL_FLOWS.filter((f) => f.status === "Ativa").length;
  const avgOpen = EMAIL_FLOWS.filter((f) => f.openRate > 0).reduce((a, f) => a + f.openRate, 0) / Math.max(1, EMAIL_FLOWS.filter((f) => f.openRate > 0).length);

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="CRM & Funil de E-mail"
        description="Réguas automatizadas para academias, professores e alunos AMT Fight Wear."
        actions={<Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova régua</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Receita atribuída" value={brl(totalRev)} icon={TrendingUp} delta={18.4} />
        <StatCard label="Fluxos ativos" value={String(activeFlows)} icon={Mail} />
        <StatCard label="Taxa média de abertura" value={`${avgOpen.toFixed(1)}%`} icon={Users2} delta={4.2} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {EMAIL_FLOWS.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-lg border bg-card p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{f.name}</h3>
                  <Badge variant="outline" className={STATUS_STYLE[f.status]}>{f.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Público: {f.audience} · {f.emails} e-mails na régua</p>
              </div>
              <Button variant="ghost" size="icon">
                {f.status === "Ativa" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Abertura</div>
                <div className="text-sm font-semibold">{f.openRate.toFixed(1)}%</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CTR</div>
                <div className="text-sm font-semibold">{f.ctr.toFixed(1)}%</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita</div>
                <div className="text-sm font-semibold">{brl(f.revenue)}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1">
              {Array.from({ length: f.emails }).map((_, j) => (
                <div key={j} className="flex-1">
                  <div className={`h-1.5 rounded-full ${f.status === "Ativa" ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <div className="mt-1 text-center text-[10px] text-muted-foreground">E{j + 1}</div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6">
        <SectionCard title="Modelo em destaque — Oferta de faixas no atacado (Fim de ano)">
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p className="mb-2 font-medium">Assunto: 🥋 Prepare a graduação dos seus alunos com condição AMT exclusiva</p>
            <p className="text-muted-foreground">
              Professor, o fim de ano se aproxima e sua academia vai promover novas graduações. A AMT Fight Wear preparou uma condição especial em faixas de Jiu-Jitsu e Judô das linhas Training, Pro e Premium — com bordado Kanji personalizado e entrega garantida para dezembro. Responda esse e-mail para receber a tabela de atacado.
            </p>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
