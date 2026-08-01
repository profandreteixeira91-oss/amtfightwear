import { Badge } from "@/components/ui/badge";
import { brl, intFmt } from "@/lib/format";

export const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_SALES: "Vendas",
  OUTCOME_LEADS: "Leads",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_APP_PROMOTION: "Aplicativo",
  CONVERSIONS: "Conversões",
  MESSAGES: "Mensagens",
  LINK_CLICKS: "Tráfego",
  LEAD_GENERATION: "Leads",
  POST_ENGAGEMENT: "Engajamento",
  BRAND_AWARENESS: "Reconhecimento",
  REACH: "Alcance",
  VIDEO_VIEWS: "Vídeo",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ARCHIVED: "Arquivada",
  DELETED: "Excluída",
  CAMPAIGN_PAUSED: "Campanha pausada",
  ADSET_PAUSED: "Conjunto pausado",
  IN_PROCESS: "Em processamento",
  WITH_ISSUES: "Com problemas",
  PENDING_REVIEW: "Em revisão",
  DISAPPROVED: "Reprovada",
  PREAPPROVED: "Pré-aprovada",
  PENDING_BILLING_INFO: "Aguardando pagamento",
};

export const BID_STRATEGY_LABELS: Record<string, string> = {
  LOWEST_COST_WITHOUT_CAP: "Menor custo",
  LOWEST_COST_WITH_BID_CAP: "Limite de lance",
  COST_CAP: "Limite de custo",
  LOWEST_COST_WITH_MIN_ROAS: "ROAS mínimo",
};

export function objectiveLabel(o?: string | null) {
  if (!o) return "—";
  return OBJECTIVE_LABELS[o] ?? o.replace(/^OUTCOME_/, "").toLowerCase();
}

export function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "").toUpperCase();
  const label = STATUS_LABELS[s] ?? (s.toLowerCase().replace(/_/g, " ") || "—");
  const tone =
    s === "ACTIVE"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : s === "PAUSED" || s === "CAMPAIGN_PAUSED" || s === "ADSET_PAUSED"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
        : s === "ARCHIVED" || s === "DELETED"
          ? "border-border bg-muted/60 text-muted-foreground"
          : s === "DISAPPROVED"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-primary/30 bg-primary/10 text-primary";

  return (
    <Badge variant="outline" className={`gap-1 whitespace-nowrap text-[11px] font-semibold ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export function num(n?: number | null) {
  return typeof n === "number" ? intFmt(n) : "—";
}

export function cur(n?: number | null) {
  return typeof n === "number" ? brl(n) : "—";
}

export function ratio(n?: number | null, suffix = "x") {
  return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(2)}${suffix}` : "—";
}

export function percent(n?: number | null) {
  return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(2)}%` : "—";
}

export function shortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(";"), ...rows.map((r) => headers.map((h) => escape(r[h])).join(";"))].join("\n");
}

export function downloadFile(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
