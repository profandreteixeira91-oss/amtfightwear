import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Radar, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { leadsService, type Lead } from "@/services/leadsService";

export const Route = createFileRoute("/_authenticated/market/leads")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Lead Scraper" }] }),
  component: LeadsPage,
});

const STATUS = ["Novo", "Contactado", "Negociando", "Convertido", "Perdido"] as const;
const TYPES = ["Professor", "Academia", "Escola/Projeto Social"] as const;
const MODALITIES = ["BJJ", "Judô", "BJJ + Judô"] as const;

function statusColor(s: string) {
  return s === "Convertido"
    ? "default"
    : s === "Perdido"
      ? "destructive"
      : s === "Negociando"
        ? "secondary"
        : "outline";
}

function LeadsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: leads, isLoading } = useQuery({ queryKey: ["leads"], queryFn: leadsService.list });

  const create = useMutation({
    mutationFn: leadsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead cadastrado");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => leadsService.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const remove = useMutation({
    mutationFn: leadsService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removido");
    },
  });

  const filtered = (leads ?? []).filter((l) =>
    q ? `${l.name} ${l.responsible ?? ""} ${l.city ?? ""} ${l.email ?? ""}`.toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Lead Scraper"
        description="Base de leads reais: professores, academias e projetos sociais de Jiu-Jitsu/Judô."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1"><Plus className="h-4 w-4" /> Novo lead</Button>
            </DialogTrigger>
            <NewLeadDialog onSubmit={(v) => create.mutate(v)} loading={create.isPending} />
          </Dialog>
        }
      />

      <SectionCard title="Base de leads" icon={Radar}>
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, cidade, e-mail..." className="pl-8" />
          </div>
          <div className="text-xs text-muted-foreground">{filtered.length} de {leads?.length ?? 0}</div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={leads?.length ? "Nenhum lead corresponde à busca" : "Nenhum lead cadastrado"}
            description="Clique em 'Novo lead' para começar sua base de prospecção."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Academia</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: Lead, i) => (
                  <motion.tr
                    key={l.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b"
                  >
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.responsible ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div>{l.email ?? "—"}</div>
                      <div className="text-muted-foreground">{l.phone ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-sm">{l.city ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.modality ?? "—"}</Badge></TableCell>
                    <TableCell>
                      <Select value={l.status} onValueChange={(v) => patchStatus.mutate({ id: l.id, status: v })}>
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue>
                            <Badge variant={statusColor(l.status) as never}>{l.status}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </>
  );
}

function NewLeadDialog({ onSubmit, loading }: { onSubmit: (v: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState<Record<string, string>>({
    name: "", responsible: "", phone: "", email: "", city: "",
    modality: "BJJ", lead_type: "Academia", source: "Manual", notes: "", status: "Novo",
  });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nome / Academia</Label><Input value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
        <div><Label>Responsável</Label><Input value={form.responsible} onChange={(e) => update("responsible", e.target.value)} /></div>
        <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => update("city", e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
        <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
        <div>
          <Label>Tipo</Label>
          <Select value={form.lead_type} onValueChange={(v) => update("lead_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Modalidade</Label>
          <Select value={form.modality} onValueChange={(v) => update("modality", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODALITIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button disabled={!form.name || loading} onClick={() => onSubmit(form)}>{loading ? "Salvando..." : "Cadastrar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
