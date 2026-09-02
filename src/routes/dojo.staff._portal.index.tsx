import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Loader2, Megaphone, Trophy, Users, QrCode } from "lucide-react";

import { getStaffDashboard } from "@/lib/dojo/staff-data.functions";
import { useStaff } from "@/components/dojo/staff/staff-context";
import { StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { visibleStaffModules } from "@/lib/dojo/staff-modules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBR } from "@/lib/dates";

export const Route = createFileRoute("/dojo/staff/_portal/")({
  head: () => ({
    meta: [
      { title: "Portal da Equipe — AMT Dojo Manager" },
      {
        name: "description",
        content: "Área exclusiva do professor: alunos, turmas, frequência e graduações liberadas pelo dono do dojo.",
      },
      { property: "og:title", content: "Portal da Equipe — AMT Dojo Manager" },
      {
        property: "og:description",
        content: "Portal independente do professor, com acesso somente aos módulos autorizados pelo dojo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffHome,
});

function StaffHome() {
  const staff = useStaff();
  const dashFn = useServerFn(getStaffDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["staff-dashboard"], queryFn: () => dashFn() });
  const modules = visibleStaffModules(staff.permissions).filter((m) => m.key !== "dashboard");

  const firstName = (staff.full_name ?? staff.email).split(" ")[0];

  return (
    <div className="space-y-4">
      <StaffPageHeader
        title={`Olá, ${firstName}!`}
        subtitle={`Resumo da sua atuação em ${staff.academy?.trade_name ?? "seu dojo"}`}
      />

      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {data?.students != null && (
              <Metric icon={Users} label="Alunos ativos" value={data.students} />
            )}
            {data?.classes != null && (
              <Metric icon={CalendarDays} label="Turmas ativas" value={data.classes} />
            )}
            {data?.todayClasses.length ? (
              <Metric icon={CalendarDays} label="Aulas de hoje" value={data.todayClasses.length} />
            ) : null}
            {data?.checkinsToday != null && (
              <Metric icon={QrCode} label="Check-ins hoje" value={data.checkinsToday} />
            )}
          </div>

          {data?.todayClasses.length ? (
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Aulas de hoje</div>
              <ul className="divide-y divide-border text-sm">
                {data.todayClasses.map((c) => (
                  <li key={`${c.id}-${c.start_time}`} className="flex items-center justify-between py-2">
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {c.start_time}
                      {c.end_time ? `–${c.end_time}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {data?.announcements.length ? (
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Megaphone className="h-4 w-4" /> Comunicados recentes
              </div>
              <ul className="space-y-2 text-sm">
                {data.announcements.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{a.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {a.publish_at ? formatBR(a.publish_at) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {data?.competitions.length ? (
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4" /> Próximas competições
              </div>
              <ul className="space-y-2 text-sm">
                {data.competitions.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.starts_at ? formatBR(c.starts_at) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">Seus módulos</div>
        {modules.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            O dono do dojo ainda não liberou módulos para a sua conta.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {modules.map((m) => (
              <Link
                key={m.key}
                to={m.to}
                className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{m.description}</div>
                </div>
                <Badge variant={staff.permissions[m.key] === "write" ? "default" : "secondary"}>
                  {staff.permissions[m.key] === "write" ? "Acesso total" : "Leitura"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
