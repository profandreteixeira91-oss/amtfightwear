import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, MapPin, Calendar as CalIcon, Building2, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStudentCompetition, setMyInterest } from "@/lib/student/competitions.functions";
import { scopeLabel } from "@/lib/dojo/competitions/classifier";

export const Route = createFileRoute("/app/_student/competitions/$id")({
  head: () => ({ meta: [{ title: "Competição" }] }),
  component: StudentCompetitionDetail,
});

function StudentCompetitionDetail() {
  const { id } = useParams({ from: "/app/_student/competitions/$id" });
  const getFn = useServerFn(getStudentCompetition);
  const interestFn = useServerFn(setMyInterest);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["student-comp", id], queryFn: () => getFn({ data: { id } }) });
  const [category, setCategory] = useState("");
  const [weight, setWeight] = useState("");

  const mut = useMutation({
    mutationFn: (status: "interested" | "confirmed" | "cancelled") =>
      interestFn({ data: { academy_competition_id: id, status, category: category || null, weight_class: weight || null } }),
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["student-comp", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (q.isError || !q.data) return <div className="p-6 text-sm text-red-500">Erro ao carregar.</div>;

  const data = q.data as unknown as {
    row: { competition: { name: string; scope: string | null; city: string | null; state: string | null; venue: string | null; start_at: string | null; end_at: string | null; registration_deadline: string | null; official_url: string | null; registration_url: string | null; price: number | null; currency: string | null } | null };
    athlete: { status: string; category: string | null; weight_class: string | null } | null;
    hotels: Array<{ name: string; address: string | null; check_in: string | null; check_out: string | null }>;
    transport: Array<{ kind: string | null; departure_at: string | null; return_at: string | null; driver: string | null; seats: number | null }>;
  };

  const comp = data.row.competition!;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="ghost"><Link to="/app/competitions"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="flex-1 truncate text-lg font-bold">{comp.name}</h1>
      </div>

      <Card><CardContent className="space-y-2 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{scopeLabel(comp.scope)}</Badge>
          {comp.start_at && <span className="inline-flex items-center gap-1"><CalIcon className="h-3 w-3" />{new Date(comp.start_at).toLocaleDateString("pt-BR")}{comp.end_at && ` – ${new Date(comp.end_at).toLocaleDateString("pt-BR")}`}</span>}
        </div>
        {(comp.city || comp.state) && <div className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{comp.city}{comp.state && `/${comp.state}`}</div>}
        {comp.venue && <div className="text-muted-foreground italic">{comp.venue}</div>}
        {comp.registration_deadline && <div className="text-xs text-muted-foreground">Prazo de inscrição: {new Date(comp.registration_deadline).toLocaleDateString("pt-BR")}</div>}
        {typeof comp.price === "number" && <div className="text-xs text-muted-foreground">Taxa: {comp.currency ?? "R$"} {comp.price}</div>}
        <div className="flex flex-wrap gap-2 pt-1">
          {comp.official_url && <Button size="sm" variant="outline" asChild><a href={comp.official_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3 w-3" />Site oficial</a></Button>}
          {comp.registration_url && <Button size="sm" asChild><a href={comp.registration_url} target="_blank" rel="noreferrer">Inscrever-se</a></Button>}
        </div>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-4">
        <div className="font-semibold">Minha participação</div>
        {data.athlete && (
          <div className="text-sm text-muted-foreground">Status atual: <Badge>{data.athlete.status}</Badge></div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Categoria (ex: Adulto Faixa Roxa)" value={category || data.athlete?.category || ""} onChange={(e) => setCategory(e.target.value)} />
          <Input placeholder="Peso (ex: Meio-Pesado)" value={weight || data.athlete?.weight_class || ""} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => mut.mutate("interested")}>Tenho interesse</Button>
          <Button size="sm" onClick={() => mut.mutate("confirmed")}>Confirmar participação</Button>
          <Button size="sm" variant="ghost" onClick={() => mut.mutate("cancelled")}>Cancelar</Button>
        </div>
      </CardContent></Card>

      {data.hotels.length > 0 && (
        <Card><CardContent className="space-y-2 p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" /> Hospedagem</div>
          {data.hotels.map((h, i) => (
            <div key={i} className="rounded border p-2">
              <div className="font-medium">{h.name}</div>
              {h.address && <div className="text-xs text-muted-foreground">{h.address}</div>}
              {(h.check_in || h.check_out) && <div className="text-xs text-muted-foreground">{h.check_in && `Check-in: ${new Date(h.check_in).toLocaleDateString("pt-BR")}`} {h.check_out && `· Check-out: ${new Date(h.check_out).toLocaleDateString("pt-BR")}`}</div>}
            </div>
          ))}
        </CardContent></Card>
      )}

      {data.transport.length > 0 && (
        <Card><CardContent className="space-y-2 p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold"><Bus className="h-4 w-4" /> Transporte</div>
          {data.transport.map((t, i) => (
            <div key={i} className="rounded border p-2">
              <div className="font-medium">{t.kind}{t.driver && ` · ${t.driver}`}</div>
              {(t.departure_at || t.return_at) && (
                <div className="text-xs text-muted-foreground">
                  {t.departure_at && `Saída: ${new Date(t.departure_at).toLocaleString("pt-BR")}`}
                  {t.return_at && ` · Retorno: ${new Date(t.return_at).toLocaleString("pt-BR")}`}
                </div>
              )}
              {typeof t.seats === "number" && <div className="text-xs text-muted-foreground">{t.seats} assentos</div>}
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}
