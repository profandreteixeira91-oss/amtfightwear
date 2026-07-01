import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { deleteAutomation, listAutomations, upsertAutomation } from "@/lib/lead-scraper.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/automations")({
  head: () => ({ meta: [{ title: "Automações — Lead Scraper IA" }] }),
  component: AutomationsPage,
});

function AutomationsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAutomations);
  const upsert = useServerFn(upsertAutomation);
  const del = useServerFn(deleteAutomation);

  const { data, isLoading } = useQuery({ queryKey: ["automations"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"pesquisa" | "enriquecimento" | "webhook" | "outreach">("pesquisa");
  const [cron, setCron] = useState("0 12 * * *");
  const [active, setActive] = useState(true);

  const create = useMutation({
    mutationFn: async () => upsert({ data: { name, kind, schedule_cron: cron, active } }),
    onSuccess: () => { toast.success("Automação criada"); setName(""); qc.invalidateQueries({ queryKey: ["automations"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader eyebrow="Lead Scraper IA" title="Automações" description="Configure rotinas agendadas: pesquisa, enriquecimento, envio de leads ao CRM e webhooks." />

      <SectionCard title="Nova automação">
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Label className="mb-2 block text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pesquisa diária Nordeste" />
          </div>
          <div>
            <Label className="mb-2 block text-xs">Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pesquisa">Pesquisa</SelectItem>
                <SelectItem value="enriquecimento">Enriquecimento</SelectItem>
                <SelectItem value="outreach">Outreach</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-xs">Cron</Label>
            <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 12 * * *" />
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><span className="text-xs">Ativa</span></div>
            <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Criar
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="mt-6" title="Automações configuradas">
        {isLoading ? <Skeleton className="h-40 w-full" /> : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma automação. Os cron jobs padrão do sistema (busca diária + enriquecimento) já estão ativos no Supabase.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cron</TableHead>
                <TableHead>Última execução</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.kind}</TableCell>
                  <TableCell className="font-mono text-xs">{a.schedule_cron}</TableCell>
                  <TableCell className="text-xs">{a.last_run_at ? new Date(a.last_run_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell><Badge variant={a.active ? "default" : "secondary"}>{a.active ? "Ativa" : "Pausada"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
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
