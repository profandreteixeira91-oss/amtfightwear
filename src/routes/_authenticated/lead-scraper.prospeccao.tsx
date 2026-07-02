import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Instagram,
  Mail,
  MessageCircle,
  Phone,
  ExternalLink,
  Sparkles,
  Play,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  getProspeccao,
  updatePipelineStage,
  markContacted,
} from "@/lib/lead-scraper.functions";
import { listSequences, startSequenceForLead } from "@/lib/email-sequences.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/prospeccao")({
  head: () => ({ meta: [{ title: "Central de Prospecção — Lead Scraper IA" }] }),
  component: ProspeccaoPage,
});

const STAGES = [
  { v: "novo", label: "Novo" },
  { v: "enriquecido", label: "Enriquecido" },
  { v: "contato_iniciado", label: "Contato iniciado" },
  { v: "resposta_recebida", label: "Resposta recebida" },
  { v: "reuniao", label: "Reunião" },
  { v: "proposta", label: "Proposta" },
  { v: "cliente", label: "Cliente" },
  { v: "perdido", label: "Perdido" },
];

function ProspeccaoPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(getProspeccao);
  const fetchSeqs = useServerFn(listSequences);
  const startSeqFn = useServerFn(startSequenceForLead);
  const updateStageFn = useServerFn(updatePipelineStage);
  const markContactedFn = useServerFn(markContacted);

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("");
  const [channel, setChannel] = useState<"" | "email" | "instagram" | "phone">("");
  const [minScore, setMinScore] = useState<number>(0);
  const pageSize = 25;

  const filter = {
    q: q || undefined,
    stage: stage || undefined,
    hasEmail: channel === "email" || undefined,
    hasInstagram: channel === "instagram" || undefined,
    hasPhone: channel === "phone" || undefined,
    minScore: minScore > 0 ? minScore : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["prospeccao", page, filter],
    queryFn: () => fetchList({ data: { page, pageSize, filter } }),
  });
  const { data: seqs } = useQuery({ queryKey: ["sequences"], queryFn: () => fetchSeqs() });

  const stageMut = useMutation({
    mutationFn: (v: { leadId: string; stage: string }) =>
      updateStageFn({ data: v as any }),
    onSuccess: () => {
      toast.success("Etapa atualizada");
      qc.invalidateQueries({ queryKey: ["prospeccao"] });
    },
  });

  const startSeqMut = useMutation({
    mutationFn: (v: { leadId: string; sequenceId: string }) =>
      startSeqFn({ data: v }),
    onSuccess: () => {
      toast.success("Sequência iniciada");
      qc.invalidateQueries({ queryKey: ["prospeccao"] });
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        eyebrow="Lead Scraper IA"
        title="Central de Prospecção"
        description="Todos os leads enriquecidos com canais disponíveis, score IA e pipeline. Foto vem do perfil do Instagram quando localizado."
      />

      <SectionCard title="Filtros">
        <div className="grid gap-3 sm:grid-cols-5">
          <Input
            placeholder="Buscar por empresa, cidade ou e-mail…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="sm:col-span-2"
          />
          <Select value={stage || "all"} onValueChange={(v) => { setPage(1); setStage(v === "all" ? "" : v); }}>
            <SelectTrigger><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={channel || "all"} onValueChange={(v) => { setPage(1); setChannel(v === "all" ? "" : v as any); }}>
            <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              <SelectItem value="email">Com e-mail</SelectItem>
              <SelectItem value="instagram">Com Instagram</SelectItem>
              <SelectItem value="phone">Com telefone</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(minScore)} onValueChange={(v) => { setPage(1); setMinScore(Number(v)); }}>
            <SelectTrigger><SelectValue placeholder="Score mínimo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Qualquer score</SelectItem>
              <SelectItem value="40">40+</SelectItem>
              <SelectItem value="60">60+</SelectItem>
              <SelectItem value="80">80+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard className="mt-4" title="Leads" description={`${data?.total ?? 0} resultados`}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data?.rows.length ? (
          <p className="text-sm text-muted-foreground">Nenhum lead com esses filtros.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Cidade / UF</TableHead>
                  <TableHead>Canais</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Últ. contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={l.instagram_avatar_url ?? undefined} />
                        <AvatarFallback>{(l.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{l.name}</div>
                      {l.modality && <div className="text-xs text-muted-foreground">{l.modality}</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.city ?? "—"} / {l.state ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {l.email && <Mail className="h-4 w-4 text-emerald-500" aria-label="email" />}
                        {l.instagram_handle && <Instagram className="h-4 w-4 text-pink-500" aria-label="instagram" />}
                        {l.phone && <Phone className="h-4 w-4 text-blue-500" aria-label="phone" />}
                        {l.whatsapp && <MessageCircle className="h-4 w-4 text-green-500" aria-label="whatsapp" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      {l.ai_score != null ? (
                        <Badge variant={l.ai_score >= 70 ? "default" : "secondary"}>
                          {l.ai_score}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={l.pipeline_stage ?? "novo"}
                        onValueChange={(v) => stageMut.mutate({ leadId: l.id, stage: v })}
                      >
                        <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.last_contact_at ? new Date(l.last_contact_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {l.instagram_handle && (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            onClick={() => markContactedFn({ data: { leadId: l.id } }).then(() => qc.invalidateQueries({ queryKey: ["prospeccao"] }))}
                          >
                            <a
                              href={`https://www.instagram.com/${l.instagram_handle}/`}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir perfil"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {l.email && (seqs?.length ?? 0) > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" title="Iniciar sequência">
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {(seqs ?? []).map((s: any) => (
                                <DropdownMenuItem
                                  key={s.id}
                                  onClick={() => startSeqMut.mutate({ leadId: l.id, sequenceId: s.id })}
                                >
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  {s.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>{page}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </SectionCard>
    </motion.div>
  );
}
