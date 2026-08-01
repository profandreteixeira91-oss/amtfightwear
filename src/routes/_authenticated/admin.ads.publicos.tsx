import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdsManager } from "@/components/ads-manager/AdsManagerContext";
import { num, shortDate } from "@/components/ads-manager/helpers";
import { amCreateLookalike, amListAudiences } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/publicos")({
  component: AudiencesPage,
});

function AudiencesPage() {
  const qc = useQueryClient();
  const { accountId, refreshKey, search } = useAdsManager();
  const list = useServerFn(amListAudiences);
  const createLal = useServerFn(amCreateLookalike);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [pct, setPct] = useState("1");
  const [country, setCountry] = useState("BR");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "audiences", accountId, refreshKey],
    queryFn: () => list({ data: { ...(accountId ? { accountId } : {}) } }),
    retry: false,
  });

  const q = search.trim().toLowerCase();
  const custom = useMemo(
    () => (data?.custom ?? []).filter((a) => !q || a.name.toLowerCase().includes(q) || a.id.includes(q)),
    [data, q],
  );
  const saved = useMemo(
    () => (data?.saved ?? []).filter((a) => !q || a.name.toLowerCase().includes(q) || a.id.includes(q)),
    [data, q],
  );

  const mut = useMutation({
    mutationFn: () =>
      createLal({
        data: {
          ...(accountId ? { accountId } : {}),
          name: name.trim(),
          sourceId,
          ratio: Number(pct),
          country,
        },
      }),
    onSuccess: () => {
      toast.success("Lookalike em processamento na Meta");
      void qc.invalidateQueries({ queryKey: ["ads-manager", "audiences"] });
      setOpen(false);
      setName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline">
          {custom.length} personalizado(s) · {saved.length} salvo(s)
        </Badge>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4" />
          Criar lookalike
        </Button>
      </div>

      <Card className="min-w-0 border-border/60 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Públicos personalizados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-y border-border/60 bg-muted/30">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Nome</th>
                  <th className="px-3 py-2.5 font-semibold">Tipo</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Tamanho</th>
                  <th className="px-3 py-2.5 font-semibold">Situação</th>
                  <th className="px-4 py-2.5 font-semibold">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td colSpan={5} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : custom.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhum público personalizado nesta conta.
                    </td>
                  </tr>
                ) : (
                  custom.map((a) => (
                    <tr key={a.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="max-w-[280px] px-4 py-2.5">
                        <span className="block truncate font-medium">{a.name}</span>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground">
                          {a.id}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{a.subtype}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{num(a.size)}</td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-xs text-muted-foreground">
                        {a.status ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs">{shortDate(a.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/60 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Públicos salvos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum público salvo.</p>
          ) : (
            saved.map((a) => (
              <div key={a.id} className="min-w-0 rounded-lg border border-border/60 p-3">
                <p className="truncate font-medium">{a.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.size ? `${num(a.size)} pessoas` : "tamanho indisponível"} ·{" "}
                  {shortDate(a.updatedAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar público semelhante</DialogTitle>
            <DialogDescription>
              Gera um lookalike a partir de um público personalizado existente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="lal-name">Nome</Label>
              <Input id="lal-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Origem</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar público" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.custom ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="lal-pct">Similaridade (%)</Label>
                <Input
                  id="lal-pct"
                  type="number"
                  min={1}
                  max={10}
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lal-country">País (ISO)</Label>
                <Input
                  id="lal-country"
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !sourceId || name.trim().length < 2}
            >
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
