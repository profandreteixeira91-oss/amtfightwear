import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listSequences,
  upsertSequence,
  deleteSequence,
  listRuns,
} from "@/lib/email-sequences.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/sequences")({
  head: () => ({ meta: [{ title: "Sequências — Lead Scraper IA" }] }),
  component: SequencesPage,
});

type Step = { day: number; subject: string; body: string };

const DEFAULT_STEPS: Step[] = [
  { day: 0, subject: "Apresentação AMT Fight Wear — {empresa}", body: "Olá, {empresa}.\n\nApresento a AMT Fight Wear, fabricante brasileira de kimonos de BJJ, judô, karategis e faixas, além de patches bordados para uniformes de equipe.\n\nPodemos enviar um catálogo com condições comerciais para equipes e escolas em {cidade}?\n\nAtenciosamente,\nAMT Fight Wear" },
  { day: 3, subject: "Retomando contato — proposta comercial", body: "Olá, {empresa}.\n\nRetomo o contato para reforçar a proposta de fornecimento de kimonos e patches personalizados para {segmento} em {cidade}.\n\nPosso enviar tabela com preços por volume?\n\nAtenciosamente,\nAMT Fight Wear" },
  { day: 7, subject: "Condições comerciais AMT", body: "Olá, {empresa}.\n\nEstou à disposição para apresentar as condições comerciais da AMT Fight Wear para {segmento}.\n\nBasta responder este e-mail com o interesse.\n\nAtenciosamente,\nAMT Fight Wear" },
  { day: 15, subject: "Último contato — AMT Fight Wear", body: "Olá, {empresa}.\n\nEste é o último contato desta série. Caso haja interesse em conhecer os produtos AMT Fight Wear (kimonos, faixas e patches), respondo com prazer.\n\nAtenciosamente,\nAMT Fight Wear" },
];

function SequencesPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listSequences);
  const fetchRuns = useServerFn(listRuns);
  const upsertFn = useServerFn(upsertSequence);
  const deleteFn = useServerFn(deleteSequence);

  const { data: sequences } = useQuery({ queryKey: ["sequences"], queryFn: () => fetchList() });
  const { data: runs } = useQuery({ queryKey: ["sequence-runs"], queryFn: () => fetchRuns() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);

  const openNew = () => {
    setEditing(null);
    setName("Follow-up institucional");
    setDescription("Sequência de 4 e-mails em 15 dias");
    setSteps(DEFAULT_STEPS);
    setOpen(true);
  };
  const openEdit = (s: any) => {
    setEditing(s);
    setName(s.name);
    setDescription(s.description ?? "");
    setSteps((s.steps ?? DEFAULT_STEPS) as Step[]);
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => {
      toast.success("Sequência salva");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["sequences"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Sequência removida");
      qc.invalidateQueries({ queryKey: ["sequences"] });
    },
  });

  const updateStep = (idx: number, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        eyebrow="Lead Scraper IA"
        title="Sequências de Follow-up"
        description="Modelos de 4 e-mails com intervalos configuráveis. Placeholders: {empresa}, {nome}, {cidade}, {estado}, {segmento}. Cancelamento automático ao receber resposta."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Nova sequência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar sequência" : "Nova sequência"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                {steps.map((s, i) => (
                  <Card key={i} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Passo {i + 1}</Badge>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Dia</Label>
                        <Input
                          type="number"
                          className="w-20"
                          value={s.day}
                          onChange={(e) => updateStep(i, { day: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <Input
                      placeholder="Assunto"
                      value={s.subject}
                      onChange={(e) => updateStep(i, { subject: e.target.value })}
                    />
                    <Textarea
                      placeholder="Corpo do e-mail"
                      rows={6}
                      value={s.body}
                      onChange={(e) => updateStep(i, { body: e.target.value })}
                    />
                  </Card>
                ))}
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    saveMut.mutate({
                      id: editing?.id,
                      name,
                      description,
                      steps,
                      is_active: true,
                    })
                  }
                  disabled={saveMut.isPending}
                >
                  <Save className="mr-2 h-4 w-4" /> Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard title="Sequências" description="Ative-as em leads pela Central de Prospecção.">
        {!sequences?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma sequência criada.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(sequences ?? []).map((s: any) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                  <Badge variant={s.is_active ? "default" : "secondary"}>
                    {s.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {(s.steps ?? []).length} passos · dias{" "}
                  {(s.steps ?? []).map((st: Step) => st.day).join(", ")}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => delMut.mutate(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="mt-4" title="Execuções ativas" description="Últimas sequências em curso.">
        {!runs?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma execução ainda.</p>
        ) : (
          <div className="space-y-2">
            {(runs ?? []).slice(0, 20).map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded border p-2 text-sm"
              >
                <div>
                  <div className="font-medium">{r.leads?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.email_sequences?.name} · passo {r.current_step}
                  </div>
                </div>
                <Badge
                  variant={
                    r.status === "running"
                      ? "default"
                      : r.status === "completed"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}
