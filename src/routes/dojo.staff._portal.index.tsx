import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, CalendarDays, ClipboardList, Loader2, Megaphone, QrCode, Trophy, Users } from "lucide-react";

import { getStaffDashboard } from "@/lib/dojo/staff-data.functions";
import { useStaff, useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffNoAccess, StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { Card } from "@/components/ui/card";
import { canAccess } from "@/lib/dojo/permissions";

export const Route = createFileRoute("/dojo/staff/_portal/")({
  head: () => ({
    meta: [
      { title: "Painel da Equipe — Dojo Manager" },
      { name: "description", content: "Visão geral e atalhos de trabalho do professor do dojo." },
    ],
  }),
  component: StaffDashboard,
});

function StaffDashboard() {
  const staff = useStaff();
  const level = useStaffLevel("dashboard");
  const statsFn = useServerFn(getStaffDashboard);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: () => statsFn(),
    enabled: level !== "none",
  });

  if (level === "none") return <StaffNoAccess label="Painel" />;

  const canCheckin = canAccess(staff.permissions, "checkin", "read");
  const canStudents = canAccess(staff.permissions, "students", "read");
  const canSchedule = canAccess(staff.permissions, "schedule", "read");
  const canGraduations = canAccess(staff.permissions, "graduations", "read");
  const canEvaluations = canAccess(staff.permissions, "evaluations", "read");
  const canAnnouncements = canAccess(staff.permissions, "announcements", "read");
  const canCompetitions = canAccess(staff.permissions, "competitions", "read");

  return (
    <div className="space-y-4">
      <StaffPageHeader
        title={`Olá, ${staff.full_name?.split(" ")[0] ?? "Professor"}`}
        subtitle="Bem-vindo ao Portal da Equipe"
        readOnly={level === "read"}
      />

      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canStudents && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total de Alunos</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold">{data?.students ?? 0}</div>
            </Card>
          )}
          {canCheckin && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Presenças Hoje</span>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold">{data?.checkinsToday ?? 0}</div>
            </Card>
          )}
          {canSchedule && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Turmas Ativas</span>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold">{data?.classes ?? 0}</div>
            </Card>
          )}
          {canAnnouncements && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avisos Recentes</span>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold">{data?.announcements.length ?? 0}</div>
            </Card>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Acesso Rápido</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {canCheckin && (
            <Link to="/dojo/staff/checkin">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Frequência / Check-in</div>
                  <div className="text-xs text-muted-foreground">Registrar ou consultar presenças</div>
                </div>
              </Card>
            </Link>
          )}
          {canStudents && (
            <Link to="/dojo/staff/students">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Alunos</div>
                  <div className="text-xs text-muted-foreground">Consultar cadastros da academia</div>
                </div>
              </Card>
            </Link>
          )}
          {canSchedule && (
            <Link to="/dojo/staff/schedule">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Grade de Turmas</div>
                  <div className="text-xs text-muted-foreground">Horários e dias de treino</div>
                </div>
              </Card>
            </Link>
          )}
          {canGraduations && (
            <Link to="/dojo/staff/graduations">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Graduações</div>
                  <div className="text-xs text-muted-foreground">Histórico e trocas de faixa</div>
                </div>
              </Card>
            </Link>
          )}
          {canEvaluations && (
            <Link to="/dojo/staff/evaluations">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Avaliações</div>
                  <div className="text-xs text-muted-foreground">Modelos e testes técnicos</div>
                </div>
              </Card>
            </Link>
          )}
          {canAnnouncements && (
            <Link to="/dojo/staff/announcements">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Quadro de Avisos</div>
                  <div className="text-xs text-muted-foreground">Comunicados para a equipe</div>
                </div>
              </Card>
            </Link>
          )}
          {canCompetitions && (
            <Link to="/dojo/staff/competitions">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Competições</div>
                  <div className="text-xs text-muted-foreground">Próximos torneios e eventos</div>
                </div>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
