import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Zap, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listAutomations, upsertAutomation, deleteAutomation } from "@/lib/ig-hub.functions";

export const Route = createFileRoute("/_authenticated/admin/instagram/automacoes")({
  component: IgAutomations,
});

const TRIGGERS = [
  { v: "new_conversation", label: "Nova conversa" },
  { v: "new_comment", label: "Novo comentário" },
  { v: "keyword_match", label: "Palavra-chave detectada" },
  { v: "mention", label: "Menção" },
];

const ACTIONS = [
  { v: "create_lead", label: "Criar lead" },
  { v: "assign", label: "Atribuir responsável" },
  { v: "move_stage", label: "Mover no funil" },
  { v: "create_task", label: "Criar tarefa" },
  { v: "auto_reply", label: "Enviar resposta automática" },
  { v: "notify", label: "Notificar equipe" },
  { v: "add_tag", label: "Aplicar tag" },
];

function IgAutomations() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAutomations);
  const upsertFn = useServerFn(upsertAutomation);
  const delFn = useServerFn(deleteAutomation);
  const { data, isLoading } = useQuery({ queryKey: ["ig-automations"], queryFn: () => listFn() });

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("new_conversation");
  const [action, setAction] = useState("create_lead");

  const mCreate = useMutation({
    mutationFn: () => upsertFn({
      data: { name, trigger: trigger as "new_conversation" | "new_comment" | "keyword_match" | "mention", conditions: {}, actions: [{ type: action }], enabled: true },
    }),
    onSuccess: () => {
      toast.success("Automação criada.");
      setName("");
      qc.invalidateQueries({ queryKey: ["ig-automations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mToggle = useMutation({
    mutationFn: (a: { id: string; name: string; trigger: string; conditions: Record<string, unknown>; actions: Record<string, unknown>[]; enabled: boolean }) =>
      upsertFn({ data: { ...a, trigger: a.trigger as "new_conversation" | "new_comment" | "keyword_match" | "mention" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig-automations"] }),
  });

  const mDel = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido.");
      qc.invalidateQueries({ queryKey: ["ig-automations"] });
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Automações do Instagram"
        description="Regras que reagem em tempo real a novas conversas, comentários e menções."
      />

      <SectionCard title="Nova regra">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Nome da regra" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ACTIONS.map((a) => <SelectItem key={a.v} value={a.v}>{a.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => name.trim() && mCreate.mutate()} disabled={!name.trim() || mCreate.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Regras ativas">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (data ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">Nenhuma regra criada.</div>
        ) : (
          <div className="divide-y">
            {(data ?? []).map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-3">
                <Zap className={`h-4 w-4 ${a.enabled ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Trigger: <Badge variant="outline">{a.trigger}</Badge>
                    {" · "}Ações: {(a.actions as { type: string }[]).map((x) => x.type).join(", ")}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => mToggle.mutate({ ...a, enabled: !a.enabled } as any)}>
                  {a.enabled ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => mDel.mutate(a.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}
