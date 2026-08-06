import { createFileRoute } from "@tanstack/react-router";
import { OwnerOnly } from "@/lib/auth/owner-only";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { UserSquare2, Search, Users, TrendingUp, Building2, GraduationCap, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminListDojoAccounts, adminDeleteDojoOwnerAccount, type DojoAccountRow } from "@/lib/store/dojo-admin.functions";
import { brl, intFmt } from "@/lib/format";
import { formatBR } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/clientes-growth")({
  head: () => ({
    meta: [
      { title: "Clientes — AMT Growth" },
      { name: "description", content: "Donos de dojo cadastrados no AMT Dojo Manager." },
    ],
  }),
  component: () => (
    <OwnerOnly>
      <CustomersPage />
    </OwnerOnly>
  ),
});

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Ativo",
  authorized: "Ativo",
  pending: "Pendente",
  paused: "Pausado",
  cancelled: "Cancelado",
  none: "Sem plano",
};

function statusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active" || status === "authorized") return "default";
  if (status === "cancelled") return "destructive";
  if (status === "trial") return "secondary";
  return "outline";
}

function CustomersPage() {
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const fetchAccounts = useServerFn(adminListDojoAccounts);
  const deleteAccountFn = useServerFn(adminDeleteDojoOwnerAccount);

  const { data, isLoading, error, refetch } = useQuery<DojoAccountRow[]>({
    queryKey: ["admin", "growth", "dojo-accounts"],
    queryFn: () => fetchAccounts(),
    refetchInterval: 60_000,
  });

  const { mutate: deleteAccount, isPending: isDeleting } = useMutation({
    mutationFn: (ownerId: string) => deleteAccountFn({ data: { ownerId } }),
    onSuccess: () => {
      toast.success("Conta removida com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin", "growth", "dojo-accounts"] });
      setDeletingId(null);
    },
    onError: (err) => {
      toast.error(`Falha ao remover conta: ${err.message}`);
    },
  });

  const items = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((c) =>
      [c.full_name, c.trade_name, c.legal_name, c.email, c.phone, c.whatsapp, c.city, c.state, c.slug]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data, q]);

  const list = data ?? [];
  const total = list.length;
  const activeCount = list.filter((c) => c.sub_status === "active" || c.sub_status === "authorized").length;
  const mrr = list.reduce(
    (a, c) =>
      c.sub_status === "active" || c.sub_status === "authorized" ? a + Number(c.sub_plan_amount ?? 0) : a,
    0,
  );
  const studentsTotal = list.reduce((a, c) => a + c.students_count, 0);

  return (
    <>
      <PageHeader
        eyebrow="Base ativa"
        title="Base de donos de dojo"
        description="Donos de dojo cadastrados no AMT Dojo Manager e status de assinatura."
      />

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Donos de dojo" value={intFmt(total)} icon={Users} loading={isLoading} index={0} />
            <StatCard label="Assinaturas ativas" value={intFmt(activeCount)} icon={TrendingUp} loading={isLoading} index={1} />
            <StatCard label="Receita recorrente" value={brl(mrr)} icon={UserSquare2} loading={isLoading} index={2} />
            <StatCard label="Alunos na base" value={intFmt(studentsTotal)} icon={GraduationCap} loading={isLoading} index={3} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Base de donos de dojo</CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nome, dojo, e-mail ou cidade"
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={Building2}
                      title="Nenhum dono de dojo ainda"
                      description="As contas aparecerão aqui conforme novos dojos forem cadastrados."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Responsável</TableHead>
                          <TableHead className="hidden md:table-cell">Dojo</TableHead>
                          <TableHead className="hidden md:table-cell">Contato</TableHead>
                          <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                          <TableHead>Plano</TableHead>
                           <TableHead className="text-right">Alunos</TableHead>
                          <TableHead className="hidden lg:table-cell text-right">Cadastro</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((c) => (
                          <TableRow key={c.owner_id}>
                            <TableCell className="font-medium">
                              {c.full_name ?? c.email ?? "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {c.trade_name ?? c.legal_name ?? "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {c.email ?? c.whatsapp ?? c.phone ?? "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {[c.city, c.state].filter(Boolean).join(" / ") || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(c.sub_status)}>
                                {STATUS_LABEL[c.sub_status ?? "none"] ?? c.sub_status ?? "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{intFmt(c.students_count)}</TableCell>
                             <TableCell className="hidden lg:table-cell text-right text-sm text-muted-foreground">
                              {formatBR(c.created_at)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeletingId(c.owner_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover conta de Dono de Dojo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação removerá permanentemente as unidades, alunos, planos e o vínculo desta conta com o Dojo Manager.
                  O acesso administrativo do usuário será revogado, mas o perfil básico pode permanecer no sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingId && deleteAccount(deletingId)}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Removendo..." : "Sim, remover conta"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
