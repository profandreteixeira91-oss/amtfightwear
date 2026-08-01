import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdsManager } from "@/components/ads-manager/AdsManagerContext";
import { cur, downloadFile, num, percent, ratio, toCsv } from "@/components/ads-manager/helpers";
import { amBuildReport } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/relatorios")({
  component: ReportsPage,
});

function ReportsPage() {
  const { accountId, range, refreshKey } = useAdsManager();
  const build = useServerFn(amBuildReport);
  const [level, setLevel] = useState<"campaign" | "adset" | "ad">("campaign");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "report", accountId, level, range.since, range.until, refreshKey],
    queryFn: () =>
      build({
        data: { ...(accountId ? { accountId } : {}), since: range.since, until: range.until, level },
      }),
    retry: false,
  });

  const rows = data ?? [];
  const fileBase = `relatorio-ads-${level}-${range.since}_${range.until}`;

  const exportCsv = () => {
    downloadFile(
      `${fileBase}.csv`,
      toCsv(
        rows.map((r) => ({
          Nome: r.name,
          Gasto: r.spend,
          Impressoes: r.impressions,
          Alcance: r.reach,
          Cliques: r.clicks,
          CTR: r.ctr,
          CPC: r.cpc,
          CPM: r.cpm,
          Conversoes: r.conversions,
          CPA: r.cpa,
          Receita: r.revenue,
          ROAS: r.roas,
        })),
      ),
    );
  };

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${fileBase}.xlsx`);
  };

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Relatório de Anúncios — AMT Fight Wear", 14, 14);
    doc.setFontSize(9);
    doc.text(`Período: ${range.since} a ${range.until} · Nível: ${level}`, 14, 21);
    let y = 30;
    doc.text("Nome | Gasto | Cliques | CTR | Conv. | Receita | ROAS", 14, y);
    y += 6;
    for (const r of rows) {
      if (y > 195) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${r.name.slice(0, 42)} | ${r.spend} | ${r.clicks} | ${r.ctr}% | ${r.conversions} | ${r.revenue} | ${r.roas}`,
        14,
        y,
      );
      y += 5;
    }
    doc.save(`${fileBase}.pdf`);
  };

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="min-w-0 break-words text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={level} onValueChange={(v) => setLevel(v as "campaign")}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="campaign">Por campanha</SelectItem>
            <SelectItem value="adset">Por conjunto</SelectItem>
            <SelectItem value="ad">Por anúncio</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
        <Button size="sm" variant="outline" onClick={exportXlsx} disabled={!rows.length}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
        </Button>
        <Button size="sm" variant="outline" onClick={exportPdf} disabled={!rows.length}>
          <FileText className="mr-2 h-4 w-4" /> PDF
        </Button>
      </div>

      <Card className="min-w-0 overflow-hidden border-border/60 bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Nome</th>
                <th className="px-3 py-2.5 text-right font-semibold">Gasto</th>
                <th className="px-3 py-2.5 text-right font-semibold">Impr.</th>
                <th className="px-3 py-2.5 text-right font-semibold">Alcance</th>
                <th className="px-3 py-2.5 text-right font-semibold">Cliques</th>
                <th className="px-3 py-2.5 text-right font-semibold">CTR</th>
                <th className="px-3 py-2.5 text-right font-semibold">CPC</th>
                <th className="px-3 py-2.5 text-right font-semibold">CPA</th>
                <th className="px-3 py-2.5 text-right font-semibold">Conv.</th>
                <th className="px-3 py-2.5 text-right font-semibold">Receita</th>
                <th className="px-4 py-2.5 text-right font-semibold">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td colSpan={11} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center text-muted-foreground">
                    Nenhum dado no período selecionado.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="max-w-[280px] truncate px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cur(r.spend)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(r.impressions)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(r.reach)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(r.clicks)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{percent(r.ctr)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cur(r.cpc)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cur(r.cpa)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(r.conversions)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cur(r.revenue)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{ratio(r.roas)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
