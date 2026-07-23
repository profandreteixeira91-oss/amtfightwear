import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users, Building2, FileText, UsersRound } from "lucide-react";
import { listIssuedContracts, CONTRACT_STATUS_LABELS } from "@/lib/dojo/contracts.functions";

export const Route = createFileRoute("/dojo/app/contracts/issued")({
  head: () => ({
    meta: [
      { title: "Contratos emitidos — Central de Contratos" },
      { name: "description", content: "Busca global de contratos assinados, pendentes e cancelados do dojo." },
    ],
  }),
  component: IssuedContractsPage,
});

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-500/10 text-neutral-700",
  issued: "bg-blue-500/10 text-blue-700",
  sent: "bg-cyan-500/10 text-cyan-700",
  pending_signature: "bg-amber-500/10 text-amber-700",
  pending: "bg-amber-500/10 text-amber-700",
  signed: "bg-emerald-500/10 text-emerald-700",
  active: "bg-emerald-500/10 text-emerald-700",
  refused: "bg-red-500/10 text-red-700",
  cancelled: "bg-red-500/10 text-red-700",
  expired: "bg-orange-500/10 text-orange-700",
  terminated: "bg-red-500/10 text-red-700",
  completed: "bg-emerald-500/10 text-emerald-700",
};

function IssuedContractsPage() {
  const [kind, setKind] = useState<"all"|"student"|"affiliate"|"team">("all");
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");

  const listFn = useServerFn(listIssuedContracts);
  const list = useQuery({
    queryKey: ["issued-contracts", kind, status, q],
    queryFn: () => listFn({ data: {
      kind, status: status === "all" ? undefined : status, q: q || undefined,
    } }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por título ou número do contrato…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="student">Alunos</SelectItem>
                <SelectItem value="team">Equipe</SelectItem>
                <SelectItem value="affiliate">Filiais</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[190px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
      ) : (list.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Nenhum contrato encontrado com esses filtros.</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {(list.data ?? []).map((r: any) => (
                <Link
                  key={`${r.kind}-${r.id}`}
                  to="/dojo/app/contracts/issued/$kind/$id"
                  params={{ kind: r.kind, id: r.id }}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${r.kind === "student" ? "bg-blue-500/10 text-blue-700" : "bg-purple-500/10 text-purple-700"}`}>
                      {r.kind === "student" ? <Users className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                        {r.number ? <span className="font-mono">{r.number}</span> : null}
                        <span>· {r.target ?? "—"}</span>
                        <span>· {new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                    {CONTRACT_STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
