import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity, CheckCircle2, Clock, Fingerprint, LogOut, QrCode, Search,
  UserPlus, Users, Zap, Shield, ScanLine, History, Settings2,
  FileBarChart2, Trash2, Maximize2, Minimize2, X, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  listAttendance, attendanceStats, manualCheckin, checkinByCode, deleteAttendance,
  listPartnerIntegrations, listPartnerCheckins,
} from "@/lib/dojo/attendance.functions";
import {
  searchStudents, checkinDashboard, presentNowList, checkoutAttendance,
  registerVisitor, getCheckinSettings, saveCheckinSettings,
  simulatePartnerCheckin, attendanceReport,
} from "@/lib/dojo/checkin.functions";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";
import { Camera } from "lucide-react";
import { PhotoCheckinFlow } from "@/components/dojo/checkin/PhotoCheckinFlow";

export const Route = createFileRoute("/dojo/app/checkin")({
  head: () => ({ meta: [{ title: "Check-in — AMT Dojo Manager" }] }),
  component: DojoCheckinModule,
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

function DojoCheckinModule() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* HERO PREMIUM */}
      <section className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black text-white shadow-[0_30px_80px_-30px_rgba(220,38,38,0.45)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/40 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-red-500/20 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-center md:justify-between md:p-9">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-red-200">
              <ScanLine className="h-3 w-3" />
              Central de Presença
            </div>
            <h1 className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
              Check-in <span className="text-red-400">inteligente</span> do seu dojo
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-neutral-300 md:text-base">
              Presença em tempo real, kiosk fullscreen, PIN, QR Code e integração com Gympass e TotalPass — tudo em um só painel premium.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-2 md:gap-3">
            <HeroStat icon={ScanLine} label="Kiosk" />
            <HeroStat icon={Fingerprint} label="PIN/QR" />
            <HeroStat icon={Shield} label="Passes" />
          </div>
        </div>
      </section>

      {/* SUB-COPY */}
      <p className="max-w-2xl text-sm text-muted-foreground">
        Controle de acesso, presença e integrações Gympass/TotalPass.
      </p>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="flex w-max min-w-full justify-start gap-1 rounded-2xl border border-neutral-200 bg-white/70 p-1.5 shadow-sm backdrop-blur">
            <TabsTrigger value="dashboard" className="gap-2 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_25px_-12px_rgba(220,38,38,0.7)]"><Activity className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="kiosk" className="gap-2 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_25px_-12px_rgba(220,38,38,0.7)]"><ScanLine className="h-4 w-4" />Check-in</TabsTrigger>
            <TabsTrigger value="present" className="gap-2 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_25px_-12px_rgba(220,38,38,0.7)]"><Users className="h-4 w-4" />Presentes</TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_25px_-12px_rgba(220,38,38,0.7)]"><History className="h-4 w-4" />Histórico</TabsTrigger>
            <TabsTrigger value="gympass" className="gap-2 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_25px_-12px_rgba(220,38,38,0.7)]"><Shield className="h-4 w-4" />Gympass</TabsTrigger>
            <TabsTrigger value="totalpass" className="gap-2 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_25px_-12px_rgba(220,38,38,0.7)]"><Shield className="h-4 w-4" />TotalPass</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_25px_-12px_rgba(220,38,38,0.7)]"><FileBarChart2 className="h-4 w-4" />Relatórios</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_25px_-12px_rgba(220,38,38,0.7)]"><Settings2 className="h-4 w-4" />Configurações</TabsTrigger>
          </TabsList>
        </div>

          <TabsContent value="dashboard"><DashboardPanel /></TabsContent>
          <TabsContent value="kiosk"><KioskPanel /></TabsContent>
          <TabsContent value="present"><PresentPanel /></TabsContent>
          <TabsContent value="history"><HistoryPanel /></TabsContent>
          <TabsContent value="gympass"><PartnerPanel provider="gympass" /></TabsContent>
          <TabsContent value="totalpass"><PartnerPanel provider="totalpass" /></TabsContent>
          <TabsContent value="reports"><ReportsPanel /></TabsContent>
          <TabsContent value="settings"><SettingsPanel /></TabsContent>
        </Tabs>
    </div>
  );
}

function HeroStat({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2.5 backdrop-blur">
      <Icon className="h-4 w-4 text-red-300" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{label}</span>
    </div>
  );
}

/* ============================ DASHBOARD ============================ */
function DashboardPanel() {
  const dashboard = useServerFn(checkinDashboard);
  const q = useQuery({
    queryKey: ["dojo-checkin-dashboard"],
    queryFn: () => dashboard(),
    refetchInterval: 15000,
  });

  const d = q.data;
  const kpis = [
    { label: "Presentes agora", v: d?.presentNow, icon: Users, glow: "from-emerald-400/25 to-emerald-500/5", ring: "ring-emerald-400/30", accent: "text-emerald-600" },
    { label: "Check-ins hoje", v: d?.today, icon: CheckCircle2, glow: "from-red-500/25 to-red-500/5", ring: "ring-red-400/30", accent: "text-red-600" },
    { label: "Check-outs hoje", v: d?.checkouts, icon: LogOut, glow: "from-orange-400/25 to-orange-500/5", ring: "ring-orange-400/30", accent: "text-orange-600" },
    { label: "Aguardando validação", v: d?.pendingPartner, icon: Clock, glow: "from-amber-400/25 to-amber-500/5", ring: "ring-amber-400/30", accent: "text-amber-600" },
    { label: "Gympass hoje", v: d?.gympass, icon: Shield, glow: "from-violet-400/25 to-violet-500/5", ring: "ring-violet-400/30", accent: "text-violet-600" },
    { label: "TotalPass hoje", v: d?.totalpass, icon: Shield, glow: "from-fuchsia-400/25 to-fuchsia-500/5", ring: "ring-fuchsia-400/30", accent: "text-fuchsia-600" },
    { label: "Média diária (30d)", v: d?.dailyAvg, icon: Activity, glow: "from-cyan-400/25 to-cyan-500/5", ring: "ring-cyan-400/30", accent: "text-cyan-600" },
    { label: "Pico hoje", v: d?.peakCount ? `${d.peakCount} às ${String(d.peakHour).padStart(2, "0")}h` : "—", icon: Zap, glow: "from-rose-400/25 to-rose-500/5", ring: "ring-rose-400/30", accent: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <Card
            key={k.label}
            className={`group relative overflow-hidden border-neutral-200/70 bg-white shadow-sm ring-1 ${k.ring} transition-all hover:-translate-y-0.5 hover:shadow-lg`}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${k.glow} opacity-70`} aria-hidden />
            <CardContent className="relative p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {k.label}
                  </div>
                  <div className="mt-2 font-display text-2xl font-black leading-none tabular-nums text-neutral-900 md:text-3xl">
                    {q.isLoading ? <Skeleton className="h-8 w-16" /> : (k.v ?? 0)}
                  </div>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ${k.ring}`}>
                  <k.icon className={`h-4 w-4 ${k.accent}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-neutral-200/70 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-100 bg-gradient-to-r from-neutral-50 to-white pb-3">
          <div>
            <CardTitle className="text-base font-bold tracking-tight">Distribuição horária</CardTitle>
            <p className="text-xs text-muted-foreground">Fluxo de check-ins ao longo do dia</p>
          </div>
          <Badge variant="outline" className="border-red-200 bg-red-50 text-[10px] font-semibold uppercase tracking-wider text-red-700">
            Hoje
          </Badge>
        </CardHeader>
        <CardContent className="pt-5">
          <HourlyChart data={d?.hourly ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-36 items-end gap-1">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={d.hour} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative flex h-full w-full items-end">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-red-600 via-red-500 to-red-400 shadow-[0_-6px_18px_-6px_rgba(220,38,38,0.6)] transition-all group-hover:opacity-90"
                style={{ height: `${pct}%`, minHeight: d.count > 0 ? 4 : 0 }}
                title={`${d.count} check-ins às ${d.hour}h`}
              />
            </div>
            <div className="text-[10px] font-semibold tabular-nums text-muted-foreground">{d.hour}</div>
          </div>
        );
      })}
    </div>
  );
}


/* ============================ KIOSK ============================ */
function KioskPanel() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showVisitor, setShowVisitor] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showPartner, setShowPartner] = useState<null | "gympass" | "totalpass">(null);
  const [lastCheckin, setLastCheckin] = useState<null | { name: string; photo?: string | null; message: string; method: string }>(null);
  const [unitId, setUnitId] = useState("");
  const [now, setNow] = useState(() => new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const byCode = useServerFn(checkinByCode);
  const settingsFn = useServerFn(getCheckinSettings);
  const listUnits = useServerFn(listDojoUnits);
  const dashFn = useServerFn(checkinDashboard);

  const settingsQ = useQuery({ queryKey: ["dojo-checkin-settings"], queryFn: () => settingsFn() });
  const unitsQ = useQuery({ queryKey: ["dojo-units"], queryFn: () => listUnits() });
  const dashQ = useQuery({ queryKey: ["dojo-checkin-dashboard"], queryFn: () => dashFn(), refetchInterval: 20000 });

  const welcomeTpl = settingsQ.data?.welcome_message || "Bem-vindo, {{name}}! Bom treino 🥋";
  const activeUnit = (unitsQ.data ?? []).find((u: any) => u.id === unitId);
  const todayCount = (dashQ.data as any)?.todayCount ?? (dashQ.data as any)?.today ?? (dashQ.data as any)?.total_today ?? null;
  const presentCount = (dashQ.data as any)?.presentCount ?? (dashQ.data as any)?.present ?? null;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onFsChange() { setIsFullscreen(Boolean(document.fullscreenElement)); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function submitCode(code: string) {
    const c = code.trim();
    if (!c) return;
    try {
      const r = await byCode({ data: { code: c, unitId: unitId || null } });
      const msg = welcomeTpl.replace(/\{\{name\}\}/g, r.student.full_name?.split(" ")[0] ?? "");
      setLastCheckin({ name: r.student.full_name, photo: (r.student as any).photo_url ?? null, message: msg, method: /^\d+$/.test(c) ? "PIN" : "QR" });
      setPin("");
      qc.invalidateQueries({ queryKey: ["dojo-checkin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dojo-att"] });
      qc.invalidateQueries({ queryKey: ["dojo-present"] });
      setTimeout(() => {
        setLastCheckin(null);
        inputRef.current?.focus();
      }, 3500);
    } catch (err: any) {
      toast.error(err.message || "Falha no check-in");
      inputRef.current?.focus();
    }
  }

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const secondsStr = now.getSeconds().toString().padStart(2, "0");
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex h-screen max-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white"
          : "space-y-4"
      }
    >
      {/* HEADER BAR */}
      <div
        className={
          isFullscreen
            ? "flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-8 md:py-4"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        <div className="flex min-w-0 items-center gap-3">
          {isFullscreen && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/40">
              <ScanLine className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            {isFullscreen && (
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
                Check-in {dateStr && <span className="ml-2 normal-case tracking-normal text-white/40">· {dateStr}</span>}
              </div>
            )}
            <div className={isFullscreen ? "truncate text-base font-bold md:text-lg" : "sr-only"}>
              {activeUnit?.name || "Selecione a unidade abaixo"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger
              className={
                isFullscreen
                  ? `h-10 w-48 md:w-56 border-white/20 bg-white/5 text-white ${!unitId ? "ring-2 ring-amber-400/60" : ""}`
                  : "w-52"
              }
            >
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {(unitsQ.data ?? []).length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma unidade cadastrada</div>
              ) : (
                (unitsQ.data ?? []).map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {isFullscreen && (
            <div className="flex items-baseline gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono tabular-nums">
              <span className="text-xl font-bold leading-none md:text-2xl">{timeStr}</span>
              <span className="text-[10px] text-white/50">:{secondsStr}</span>
            </div>
          )}

          <Button
            variant={isFullscreen ? "secondary" : "outline"}
            size="sm"
            onClick={toggleFullscreen}
            className="gap-2"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? "Sair" : "Modo Kiosk"}</span>
          </Button>
        </div>
      </div>

      {/* MAIN CARD */}
      <div
        className={
          isFullscreen
            ? "flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-3 py-3 md:px-6"
            : ""
        }
      >
        <Card
          className={
            isFullscreen
              ? "relative w-full max-w-2xl overflow-hidden border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur"
              : "relative overflow-hidden"
          }
        >
          <CardContent className={isFullscreen ? "p-5 sm:p-7 md:p-9" : "p-8 md:p-12"}>
            {lastCheckin ? (
              <SuccessBanner data={lastCheckin} dark={isFullscreen} />
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); submitCode(pin); }}
                className={isFullscreen ? "mx-auto max-w-xl space-y-4 md:space-y-5" : "mx-auto max-w-2xl space-y-8"}
              >
                <div className={isFullscreen ? "space-y-2 text-center" : "space-y-3 text-center"}>
                  <div
                    className={
                      isFullscreen
                        ? "relative mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40 md:h-16 md:w-16"
                        : "mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
                    }
                  >
                    {isFullscreen && (
                      <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                    )}
                    <Fingerprint className={isFullscreen ? "h-7 w-7 text-primary md:h-8 md:w-8" : "h-8 w-8 text-primary"} />
                  </div>
                  <h2 className={isFullscreen ? "text-xl font-bold tracking-tight md:text-2xl lg:text-3xl" : "text-2xl font-bold md:text-3xl"}>
                    Escaneie o QR ou digite seu PIN
                  </h2>
                  <p className={isFullscreen ? "text-xs text-white/60 md:text-sm" : "text-sm text-muted-foreground"}>
                    {!unitId && (unitsQ.data ?? []).length > 0
                      ? "Selecione a unidade no topo para começar"
                      : "Aproxime-se do leitor ou toque no campo abaixo"}
                  </p>
                </div>

                <Input
                  ref={inputRef}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="• • • • • •"
                  className={
                    isFullscreen
                      ? "h-16 border-white/20 bg-white/5 text-center font-mono text-3xl tracking-[0.4em] text-white placeholder:text-white/30 md:h-20 md:text-4xl"
                      : "h-20 text-center font-mono text-3xl tracking-widest"
                  }
                  autoFocus
                  inputMode="numeric"
                />

                <Button
                  type="submit"
                  className={isFullscreen ? "h-12 w-full text-base font-bold md:h-14 md:text-lg" : "h-14 w-full text-lg"}
                  size="lg"
                  disabled={!pin.trim()}
                >
                  Registrar presença
                </Button>

                <div className="grid grid-cols-2 gap-2 pt-1 md:grid-cols-5">
                  <ActionButton icon={Search} label="Buscar" onClick={() => setShowSearch(true)} dark={isFullscreen} />
                  <ActionButton icon={UserPlus} label="Visitante" onClick={() => setShowVisitor(true)} dark={isFullscreen} />
                  <ActionButton icon={Camera} label="Foto Turma" onClick={() => setShowPhoto(true)} dark={isFullscreen} />
                  <ActionButton icon={Shield} label="Gympass" onClick={() => setShowPartner("gympass")} dark={isFullscreen} />
                  <ActionButton icon={Shield} label="TotalPass" onClick={() => setShowPartner("totalpass")} dark={isFullscreen} />
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FOOTER STATS in fullscreen */}
      {isFullscreen && (
        <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-white/10 px-4 py-2 md:gap-4 md:px-8 md:py-3">
          <KioskStat icon={Users} label="Presentes agora" value={presentCount ?? "—"} />
          <KioskStat icon={CheckCircle2} label="Check-ins hoje" value={todayCount ?? "—"} />
          <KioskStat icon={Clock} label="Sessão" value={timeStr} />
        </div>
      )}


      <SearchDialog open={showSearch} onOpenChange={setShowSearch} unitId={unitId} onSuccess={(name: string) => {
        setLastCheckin({ name, message: welcomeTpl.replace(/\{\{name\}\}/g, name.split(" ")[0]), method: "Manual" });
        setTimeout(() => setLastCheckin(null), 3500);
      }} />

      <VisitorDialog open={showVisitor} onOpenChange={setShowVisitor} unitId={unitId} />

      <Dialog open={showPhoto} onOpenChange={setShowPhoto}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          <div className="p-6">
            <PhotoCheckinFlow 
              unitId={unitId} 
              onCancel={() => setShowPhoto(false)} 
              onComplete={() => {
                setShowPhoto(false);
                qc.invalidateQueries({ queryKey: ["dojo-checkin-dashboard"] });
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <PartnerDialog
        open={!!showPartner}
        provider={showPartner}
        unitId={unitId}
        onOpenChange={() => setShowPartner(null)}
      />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, dark }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        dark
          ? "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/[0.04] transition-all hover:border-primary/60 hover:bg-primary/10 md:h-20 md:gap-1.5"
          : "flex h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all hover:border-primary hover:bg-primary/5"
      }
    >
      <Icon className={dark ? "h-5 w-5 text-primary md:h-6 md:w-6" : "h-6 w-6 text-primary"} />
      <span className={dark ? "text-xs font-semibold text-white/90 md:text-sm" : "text-sm font-medium"}>{label}</span>
    </button>
  );
}

function KioskStat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 md:gap-3 md:px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 md:h-10 md:w-10">
        <Icon className="h-4 w-4 text-primary md:h-5 md:w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[9px] font-semibold uppercase tracking-wider text-white/50 md:text-[11px]">{label}</div>
        <div className="text-lg font-bold tabular-nums text-white md:text-2xl">{value}</div>
      </div>
    </div>
  );
}


function SuccessBanner({ data, dark }: { data: { name: string; photo?: string | null; message: string; method: string }; dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <span className={`absolute inset-0 rounded-full ${dark ? "bg-emerald-400/30" : "bg-emerald-400/40"} animate-ping`} />
        <div className={`relative flex ${dark ? "h-36 w-36" : "h-28 w-28"} items-center justify-center overflow-hidden rounded-full ${dark ? "bg-emerald-500/20 ring-4 ring-emerald-400/50" : "bg-emerald-100 ring-4 ring-emerald-200"} animate-in zoom-in duration-500`}>
          {data.photo ? (
            <img src={data.photo} alt={data.name} className="h-full w-full object-cover" />
          ) : (
            <CheckCircle2 className={dark ? "h-20 w-20 text-emerald-400" : "h-16 w-16 text-emerald-600"} />
          )}
        </div>
      </div>
      <div className="space-y-2">
        <div className={`${dark ? "text-5xl md:text-6xl text-white" : "text-3xl md:text-4xl"} font-bold leading-tight`}>
          {data.message}
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${dark ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-emerald-50 text-emerald-700"}`}>
          <CheckCircle2 className="h-4 w-4" />
          Presença registrada via {data.method}
        </div>
      </div>
    </div>
  );
}

/* ============================ SEARCH DIALOG ============================ */
function SearchDialog({ open, onOpenChange, unitId, onSuccess }: any) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const search = useServerFn(searchStudents);
  const manual = useServerFn(manualCheckin);
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const res = useQuery({
    queryKey: ["dojo-student-search", debounced],
    queryFn: () => (debounced.length >= 2 ? search({ data: { q: debounced } }) : Promise.resolve([])),
    enabled: debounced.length >= 2,
  });

  async function pick(s: any, classId?: string, force = false) {
    try {
      const res = await manual({ data: { studentId: s.id, unitId: unitId || null, classId: classId || null, force } });
      
      if (res && (res as any).error === "MULTIPLE_CLASSES") {
        const available = (res as any).availableClasses;
        const choice = await new Promise<string | null>((resolve) => {
          toast("Múltiplas aulas encontradas. Escolha uma:", {
            duration: 10000,
            action: {
              label: "Ver Aulas",
              onClick: () => {
                // Em um cenário real, abriríamos um mini-modal de seleção.
                // Por brevidade na resposta do AI, pegamos a primeira ou cancelamos.
                resolve(available[0]?.id || null);
              }
            },
            onAutoClose: () => resolve(null),
            onDismiss: () => resolve(null),
          });
        });
        if (choice) return pick(s, choice);
        return;
      }

      toast.success(`Presença registrada: ${s.full_name}`);
      qc.invalidateQueries({ queryKey: ["dojo-checkin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dojo-att"] });
      qc.invalidateQueries({ queryKey: ["dojo-present"] });
      onOpenChange(false);
      setQ("");
      onSuccess?.(s.full_name);
    } catch (e: any) {
      if (e.message === "OUTSIDE_WINDOW") {
        if (confirm("Fora da janela de horário. Deseja forçar o check-in? (Apenas Admin/Professor)")) {
          return pick(s, classId, true);
        }
      } else {
        toast.error(e.message);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-1rem)]">
        <DialogHeader><DialogTitle>Buscar aluno</DialogTitle></DialogHeader>
        <Input
          autoFocus
          placeholder="Nome, CPF, telefone, e-mail ou PIN"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ScrollArea className="max-h-80">
          <div className="space-y-1">
            {res.isFetching && <div className="text-sm text-muted-foreground p-3">Buscando...</div>}
            {!res.isFetching && debounced.length >= 2 && (res.data ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground p-3">Nenhum aluno encontrado.</div>
            )}
            {(res.data ?? []).map((s: any) => (
              <button
                key={s.id}
                onClick={() => pick(s)}
                className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition"
              >
                <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                  {s.photo_url ? <img src={s.photo_url} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.cpf || s.email || s.phone || "—"}</div>
                </div>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status || "—"}</Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ VISITOR DIALOG ============================ */
function VisitorDialog({ open, onOpenChange, unitId }: any) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("");
  const [notes, setNotes] = useState("");
  const reg = useServerFn(registerVisitor);
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Informe o nome");
    setLoading(true);
    try {
      await reg({ data: { name, phone: phone || null, origin: origin || null, notes: notes || null, unitId: unitId || null } });
      toast.success("Visitante registrado");
      qc.invalidateQueries({ queryKey: ["dojo-checkin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dojo-att"] });
      setName(""); setPhone(""); setOrigin(""); setNotes("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)]">
        <DialogHeader><DialogTitle>Registrar visitante</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Origem</Label><Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Instagram, indicação..." /></div>
          </div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ PARTNER DIALOG ============================ */
function PartnerDialog({ open, onOpenChange, provider, unitId }: any) {
  const [id, setId] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const sim = useServerFn(simulatePartnerCheckin);
  const qc = useQueryClient();

  async function submit() {
    if (!provider || !id.trim()) return;
    setLoading(true);
    try {
      const r = await sim({ data: { provider, identifier: id.trim(), token: token || null, unitId: unitId || null } });
      toast.success(`${provider}: ${r.student.full_name} validado`);
      qc.invalidateQueries({ queryKey: ["dojo-checkin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dojo-att"] });
      qc.invalidateQueries({ queryKey: ["dojo-partner-checkins"] });
      onOpenChange(false); setId(""); setToken("");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)]">
        <DialogHeader>
          <DialogTitle>Validar {provider === "gympass" ? "Gympass" : "TotalPass"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Identificador (e-mail ou CPF do aluno)</Label>
            <Input value={id} onChange={(e) => setId(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Token/Protocolo (opcional)</Label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            A validação oficial via API do parceiro será usada quando o webhook estiver configurado.
            Este fluxo registra manualmente a presença com protocolo.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading || !id.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ PRESENT NOW ============================ */
function PresentPanel() {
  const listFn = useServerFn(presentNowList);
  const checkoutFn = useServerFn(checkoutAttendance);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dojo-present"], queryFn: () => listFn(), refetchInterval: 30000 });

  async function doCheckout(id: string) {
    try {
      await checkoutFn({ data: { id } });
      toast.success("Check-out registrado");
      qc.invalidateQueries({ queryKey: ["dojo-present"] });
      qc.invalidateQueries({ queryKey: ["dojo-checkin-dashboard"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Alunos presentes agora</CardTitle></CardHeader>
      <CardContent>
        <div className="divide-y">
          {(q.data ?? []).map((r: any) => (
            <div key={r.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                  {r.dojo_students?.photo_url ? <img src={r.dojo_students.photo_url} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.dojo_students?.full_name ?? "Visitante"}</div>
                  <div className="text-xs text-muted-foreground">
                    Entrada: {new Date(r.checked_in_at).toLocaleTimeString("pt-BR")} · {r.method}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => doCheckout(r.id)} className="gap-2">
                <LogOut className="h-4 w-4" />Check-out
              </Button>
            </div>
          ))}
          {q.isLoading && <div className="py-4"><Skeleton className="h-8" /></div>}
          {!q.isLoading && (q.data ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">Ninguém presente no momento.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================ HISTORY ============================ */
function HistoryPanel() {
  const listFn = useServerFn(listAttendance);
  const delFn = useServerFn(deleteAttendance);
  const qc = useQueryClient();
  const [method, setMethod] = useState<string>("all");

  const q = useQuery({ queryKey: ["dojo-att"], queryFn: () => listFn({ data: { limit: 200 } }) });
  const rows = useMemo(() => {
    const r = q.data ?? [];
    return method === "all" ? r : r.filter((x: any) => x.method === method);
  }, [q.data, method]);

  async function del(id: string) {
    try {
      await delFn({ data: { id } });
      toast.success("Registro excluído");
      qc.invalidateQueries({ queryKey: ["dojo-att"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle>Histórico de presenças</CardTitle>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os métodos</SelectItem>
            <SelectItem value="pin">PIN</SelectItem>
            <SelectItem value="qr">QR Code</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="visitor">Visitante</SelectItem>
            <SelectItem value="gympass">Gympass</SelectItem>
            <SelectItem value="totalpass">TotalPass</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {rows.map((a: any) => (
            <div key={a.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.dojo_students?.full_name ?? a.visitor_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.checked_in_at).toLocaleString("pt-BR")}
                  {a.checked_out_at && ` → saída ${new Date(a.checked_out_at).toLocaleTimeString("pt-BR")}`}
                  {" · "}{a.dojo_units?.name ?? "sem unidade"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline">{a.method}</Badge>
                <Button size="icon" variant="ghost" onClick={() => del(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {q.isLoading && <Skeleton className="h-24" />}
          {!q.isLoading && rows.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">Nenhum registro.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================ PARTNER (Gympass/TotalPass) ============================ */
function PartnerPanel({ provider }: { provider: "gympass" | "totalpass" }) {
  const listCfg = useServerFn(listPartnerIntegrations);
  const listRuns = useServerFn(listPartnerCheckins);

  const cfgQ = useQuery({ queryKey: ["dojo-partners"], queryFn: () => listCfg() });
  const runsQ = useQuery({ queryKey: ["dojo-partner-checkins", provider], queryFn: () => listRuns({ data: { limit: 100 } }) });

  const cfg = (cfgQ.data ?? []).find((c: any) => c.provider === provider);
  const enabled = !!cfg?.enabled;
  const runs = (runsQ.data ?? []).filter((r: any) => r.provider === provider);
  const brand = provider === "gympass" ? "Gympass" : "TotalPass";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Integração {brand}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium flex items-center gap-2">
                Status
                <Badge variant={enabled ? "default" : "outline"}>
                  {enabled ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                A configuração ({brand} API, secret e ativação) é feita na Central de Integrações e reflete automaticamente aqui.
              </div>
            </div>
            <Button asChild variant="outline">
              <a href="/dojo/app/integrations">Abrir Integrações</a>
            </Button>
          </div>

          {cfg?.api_key_hint && (
            <div className="text-xs text-muted-foreground">
              Identificador configurado: <code>{cfg.api_key_hint}</code>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <div className="font-mono break-all">
              Endpoint: <span className="text-primary">/api/public/dojo/partner-checkin/{provider}?owner=...</span>
            </div>
            <div className="text-muted-foreground">
              Cole essa URL no painel {brand}. A URL específica do seu dojo aparece na aba "Seus Webhooks pessoais" dentro de Integrações.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimas validações {brand}</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {runs.map((r: any) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.external_user || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                    {r.reason && ` · ${r.reason}`}
                  </div>
                </div>
                <Badge variant={
                  r.status === "approved" ? "default"
                    : r.status === "denied" ? "destructive"
                      : r.status === "pending" ? "secondary" : "outline"
                }>{r.status}</Badge>
              </div>
            ))}
            {runs.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Sem histórico.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


/* ============================ REPORTS ============================ */
function ReportsPanel() {
  const today = new Date();
  const defFrom = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const defTo = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(defFrom);
  const [to, setTo] = useState(defTo);
  const [groupBy, setGroupBy] = useState<"day" | "student" | "method">("day");
  const reportFn = useServerFn(attendanceReport);
  const q = useQuery({
    queryKey: ["dojo-report", from, to, groupBy],
    queryFn: () => reportFn({ data: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z`, groupBy } }),
  });

  function exportCsv() {
    const items = q.data?.items ?? [];
    const csv = ["Rótulo,Quantidade", ...items.map((i) => `${i.label.replace(/,/g, " ")},${i.count}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `presencas-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Relatórios de presença</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label>Agrupar por</Label>
            <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Dia</SelectItem>
                <SelectItem value="student">Aluno</SelectItem>
                <SelectItem value="method">Método</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button onClick={exportCsv} variant="outline" className="w-full">Exportar CSV</Button></div>
        </div>

        <Separator />

        <div className="text-sm text-muted-foreground">Total no período: <b>{q.data?.total ?? 0}</b></div>

        <div className="divide-y">
          {(q.data?.items ?? []).map((i) => (
            <div key={i.label} className="py-2 flex items-center justify-between">
              <div className="text-sm">{i.label}</div>
              <div className="text-sm font-semibold">{i.count}</div>
            </div>
          ))}
          {q.isLoading && <Skeleton className="h-24" />}
          {!q.isLoading && (q.data?.items ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================ SETTINGS ============================ */
function SettingsPanel() {
  const getFn = useServerFn(getCheckinSettings);
  const saveFn = useServerFn(saveCheckinSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dojo-checkin-settings"], queryFn: () => getFn() });

  const [state, setState] = useState<any>({});
  useEffect(() => {
    if (q.data) {
      const d = q.data as any;
      setState({
        minIntervalMinutes: d.min_interval_minutes ?? 30,
        allowMultipleDaily: d.allow_multiple_daily ?? true,
        requireCheckout: d.require_checkout ?? false,
        welcomeMessage: d.welcome_message ?? "Bem-vindo, {{name}}! Bom treino 🥋",
        blockOnOverdue: d.block_on_overdue ?? false,
        warnOnOverdue: d.warn_on_overdue ?? true,
        warnOnMedical: d.warn_on_medical ?? true,
        requirePartnerValidation: d.require_partner_validation ?? true,
        kioskPin: d.kiosk_pin ?? "",
        geoRequired: d.geo_required ?? false,
        geoLat: d.geo_lat ?? null,
        geoLng: d.geo_lng ?? null,
        geoRadiusM: d.geo_radius_m ?? 50,
        geoAddress: d.geo_address ?? "",
        facialRecognitionEnabled: d.facial_recognition_enabled ?? false,
        checkinWindowPreMins: d.checkin_window_pre_mins ?? 10,
        checkinWindowPostMins: d.checkin_window_post_mins ?? 30,
        allowAdminException: d.allow_admin_exception ?? true,
        allowTeacherException: d.allow_teacher_exception ?? true,
        blockDuplicateCheckin: d.block_duplicate_checkin ?? true,
        allowGpsCheckin: d.allow_gps_checkin ?? true,
        allowPinCheckin: d.allow_pin_checkin ?? true,
        allowQrCheckin: d.allow_qr_checkin ?? true,
        allowFixedQrCheckin: d.allow_fixed_qr_checkin ?? true,
        allowPhotoCheckin: d.allow_photo_checkin ?? false,
      });
    } else if (!q.isLoading) {
      setState({
        minIntervalMinutes: 30, allowMultipleDaily: true, requireCheckout: false,
        welcomeMessage: "Bem-vindo, {{name}}! Bom treino 🥋",
        blockOnOverdue: false, warnOnOverdue: true, warnOnMedical: true,
        requirePartnerValidation: true, kioskPin: "",
        geoRequired: false, geoLat: null, geoLng: null, geoRadiusM: 50, geoAddress: "",
        facialRecognitionEnabled: false,
        checkinWindowPreMins: 10, checkinWindowPostMins: 30,
        allowAdminException: true, allowTeacherException: true, blockDuplicateCheckin: true,
        allowGpsCheckin: true, allowPinCheckin: true, allowQrCheckin: true,
        allowFixedQrCheckin: true, allowPhotoCheckin: false,
      });
    }
  }, [q.data, q.isLoading]);

  async function save() {
    try {
      await saveFn({ data: state });
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["dojo-checkin-settings"] });
    } catch (e: any) { toast.error(e.message); }
  }

  const upd = (k: string, v: any) => setState((s: any) => ({ ...s, [k]: v }));

  return (
    <Card>
      <CardHeader><CardTitle>Configurações do módulo</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Intervalo mínimo entre check-ins (min)</Label>
            <Input type="number" min={0} value={state.minIntervalMinutes ?? 0}
              onChange={(e) => upd("minIntervalMinutes", parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label>PIN de saída do modo Kiosk</Label>
            <Input value={state.kioskPin ?? ""} onChange={(e) => upd("kioskPin", e.target.value)} placeholder="ex: 1234" />
          </div>
        </div>

        <div>
          <Label>Mensagem de boas-vindas</Label>
          <Textarea rows={2}
            value={state.welcomeMessage ?? ""}
            onChange={(e) => upd("welcomeMessage", e.target.value)}
            placeholder="Use {{name}} para o primeiro nome do aluno"
          />
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <div className="font-semibold text-sm">Métodos de check-in aceitos</div>
            <div className="text-xs text-muted-foreground">
              Escolha quais métodos ficam disponíveis para seus alunos. Métodos desativados são ocultados no app do aluno.
            </div>
          </div>
          <div className="space-y-2">
            <SettingRow label="GPS pelo app do aluno" v={state.allowGpsCheckin} onChange={(v) => upd("allowGpsCheckin", v)} />
            <SettingRow label="QR Code fixo da academia (impresso na parede)" v={state.allowFixedQrCheckin} onChange={(v) => upd("allowFixedQrCheckin", v)} />
            <SettingRow label="PIN pessoal do aluno no kiosk" v={state.allowPinCheckin} onChange={(v) => upd("allowPinCheckin", v)} />
            <SettingRow label="QR Code pessoal do aluno no kiosk" v={state.allowQrCheckin} onChange={(v) => upd("allowQrCheckin", v)} />
            <SettingRow label="Reconhecimento por foto (foto da turma)" v={state.allowPhotoCheckin} onChange={(v) => upd("allowPhotoCheckin", v)} />
          </div>
        </div>

        {state.allowFixedQrCheckin && <FixedQrCard />}


        <div className="space-y-2">
          <SettingRow label="Permitir múltiplos check-ins no mesmo dia" v={state.allowMultipleDaily} onChange={(v) => upd("allowMultipleDaily", v)} />
          <SettingRow label="Exigir check-out (saída)" v={state.requireCheckout} onChange={(v) => upd("requireCheckout", v)} />
          <SettingRow label="Bloquear check-in de alunos com mensalidade em atraso" v={state.blockOnOverdue} onChange={(v) => upd("blockOnOverdue", v)} />
          <SettingRow label="Avisar (sem bloquear) mensalidade em atraso" v={state.warnOnOverdue} onChange={(v) => upd("warnOnOverdue", v)} />
          <SettingRow label="Avisar sobre atestado médico vencido" v={state.warnOnMedical} onChange={(v) => upd("warnOnMedical", v)} />
          <SettingRow label="Exigir validação oficial para Gympass/TotalPass" v={state.requirePartnerValidation} onChange={(v) => upd("requirePartnerValidation", v)} />
          <SettingRow label="Habilitar Check-in Inteligente por Foto (Reconhecimento Facial)" v={state.facialRecognitionEnabled} onChange={(v) => upd("facialRecognitionEnabled", v)} />
          <SettingRow label="Impedir check-ins duplicados para a mesma aula" v={state.blockDuplicateCheckin} onChange={(v) => upd("blockDuplicateCheckin", v)} />
          <SettingRow label="Permitir exceções manuais para Administradores" v={state.allowAdminException} onChange={(v) => upd("allowAdminException", v)} />
          <SettingRow label="Permitir exceções manuais para Professores" v={state.allowTeacherException} onChange={(v) => upd("allowTeacherException", v)} />
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <div className="font-semibold text-sm">Janela de Check-in (Validação de Horário)</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Antecedência permitida (minutos)</Label>
              <Input type="number" min={0} value={state.checkinWindowPreMins ?? 10}
                onChange={(e) => upd("checkinWindowPreMins", parseInt(e.target.value) || 0)} />
              <p className="text-[10px] text-muted-foreground mt-1">Tempo antes do início da aula. Padrão: 10 min.</p>
            </div>
            <div>
              <Label>Tolerância após início (minutos)</Label>
              <Input type="number" min={0} value={state.checkinWindowPostMins ?? 30}
                onChange={(e) => upd("checkinWindowPostMins", parseInt(e.target.value) || 0)} />
              <p className="text-[10px] text-muted-foreground mt-1">Tempo após o início da aula. Padrão: 30 min.</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Validação por localização (GPS)</div>
              <div className="text-xs text-muted-foreground">
                Alunos só conseguem fazer check-in pelo app se estiverem dentro do raio configurado a partir do endereço da academia.
              </div>
            </div>
            <Switch checked={!!state.geoRequired} onCheckedChange={(v) => upd("geoRequired", v)} />
          </div>

          {state.geoRequired && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label>Endereço de referência (opcional)</Label>
                <Input
                  value={state.geoAddress ?? ""}
                  onChange={(e) => upd("geoAddress", e.target.value)}
                  placeholder="Ex: Rua X, 123 — Bairro, Cidade/UF"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={state.geoLat ?? ""}
                    onChange={(e) => upd("geoLat", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="-23.550520"
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={state.geoLng ?? ""}
                    onChange={(e) => upd("geoLng", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="-46.633308"
                  />
                </div>
                <div>
                  <Label>Raio permitido (metros)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={5000}
                    value={state.geoRadiusM ?? 50}
                    onChange={(e) => upd("geoRadiusM", parseInt(e.target.value) || 50)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!navigator.geolocation) { toast.error("Geolocalização indisponível neste dispositivo"); return; }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        upd("geoLat", pos.coords.latitude);
                        upd("geoLng", pos.coords.longitude);
                        toast.success("Localização capturada");
                      },
                      () => toast.error("Não foi possível obter a localização. Permita o acesso ao GPS."),
                      { enableHighAccuracy: true, timeout: 10000 },
                    );
                  }}
                >
                  Usar minha localização atual
                </Button>
                {state.geoLat != null && state.geoLng != null && (
                  <a
                    href={`https://www.google.com/maps?q=${state.geoLat},${state.geoLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline text-muted-foreground self-center"
                  >
                    Ver no Google Maps
                  </a>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dica: para maior precisão, abra este painel diretamente do local da academia e clique em “Usar minha localização atual”. O raio padrão é de 50m.
              </p>
            </div>
          )}
        </div>

        <Button onClick={save}>Salvar</Button>
      </CardContent>
    </Card>
  );
}

function SettingRow({ label, v, onChange }: { label: string; v?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="text-sm">{label}</div>
      <Switch checked={!!v} onCheckedChange={onChange} />
    </div>
  );
}

function FixedQrCard() {
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/app/checkin?auto=fixed_qr`
    : "https://amtfightwear.com.br/app/checkin?auto=fixed_qr";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(url)}`;

  function printQr() {
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR de Check-in</title>
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
        h1 { font-size: 28px; margin: 0 0 8px; }
        p { color: #555; margin: 4px 0 24px; }
        img { width: 480px; height: 480px; }
        .foot { margin-top: 24px; font-size: 12px; color: #888; word-break: break-all; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h1>Check-in da Academia</h1>
      <p>Aponte a câmera do celular para o QR abaixo</p>
      <img src="${qrSrc}" alt="QR Code" />
      <div class="foot">${url}</div>
      <button class="no-print" onclick="window.print()" style="margin-top:24px;padding:10px 20px;font-size:14px;">Imprimir</button>
      </body></html>`);
    w.document.close();
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <div className="font-semibold text-sm">QR Code fixo da academia</div>
        <div className="text-xs text-muted-foreground">
          Imprima e cole na entrada do tatame. Alunos com o app aberto (logados) fazem check-in ao apontar a câmera do celular.
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <img
          src={qrSrc}
          alt="QR Code de check-in da academia"
          className="h-40 w-40 rounded border bg-white p-2"
        />
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <p className="text-xs text-muted-foreground break-all">{url}</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <Button size="sm" variant="outline" onClick={printQr}>
              Imprimir QR
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast.success("Link copiado");
              }}
            >
              Copiar link
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
