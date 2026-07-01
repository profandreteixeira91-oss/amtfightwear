import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { exportLeads, listExports } from "@/lib/lead-scraper.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/exports")({
  head: () => ({ meta: [{ title: "Exportações — Lead Scraper IA" }] }),
  component: ExportsPage,
});

function ExportsPage() {
  const qc = useQueryClient();
  const doExport = useServerFn(exportLeads);
  const list = useServerFn(listExports);

  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [state, setState] = useState<string>("");
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["lead-exports"], queryFn: () => list() });

  const mut = useMutation({
    mutationFn: async () =>
      doExport({
        data: {
          format,
          filters: {
            state: state || undefined,
            hasEmail: hasEmail || undefined,
            hasPhone: hasPhone || undefined,
          },
        },
      }),
    onSuccess: (r: any) => {
      toast.success(`Exportado: ${r.count ?? r.rows ?? 0} linhas`);
      // Download inline
      const blob = new Blob([r.content], { type: r.format === "json" ? "application/json" : "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `leads-${Date.now()}.${r.format}`; a.click();
      URL.revokeObjectURL(url);
      qc.invalidateQueries({ queryKey: ["lead-exports"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader eyebrow="Lead Scraper IA" title="Exportações" description="Baixe seus leads em CSV ou JSON. Arquivos ficam disponíveis via link assinado." />

      <SectionCard title="Nova exportação" description="Aplique filtros antes de exportar">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="mb-2 block text-xs">Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-xs">UF (opcional)</Label>
            <input value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} placeholder="PB" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={hasEmail} onCheckedChange={setHasEmail} id="email" />
            <Label htmlFor="email" className="text-sm">Com e-mail</Label>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={hasPhone} onCheckedChange={setHasPhone} id="phone" />
            <Label htmlFor="phone" className="text-sm">Com telefone</Label>
          </div>
          <div className="flex items-end">
            <Button className="w-full" disabled={mut.isPending} onClick={() => mut.mutate()}>
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="mt-6" title="Histórico">
        {isLoading ? <Skeleton className="h-40 w-full" /> : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma exportação ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead className="text-right">Linhas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.created_at!).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="uppercase">{e.format}</TableCell>
                  <TableCell className="text-right">{e.count ?? 0}</TableCell>
                  <TableCell className="text-right">
                    {e.file_url && (
                      <Button size="sm" variant="outline" onClick={() => window.open(e.file_url!, "_blank")}>Baixar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </motion.div>
  );
}
