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

export const Route = createFileRoute("/dojo/app/checkin")({
  head: () => ({ meta: [{ title: "Check-in — AMT Dojo Manager" }] }),
  component: DojoCheckinModule,
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

function DojoCheckinModule() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Check-in</h1>
            <p className="text-sm text-muted-foreground">Controle de acesso, presença e integrações Gympass/TotalPass</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 md:p-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="w-max min-w-full flex justify-start">
              <TabsTrigger value="dashboard" className="gap-2"><Activity className="h-4 w-4" />Dashboard</TabsTrigger>
              <TabsTrigger value="kiosk" className="gap-2"><ScanLine className="h-4 w-4" />Check-in</TabsTrigger>
              <TabsTrigger value="present" className="gap-2"><Users className="h-4 w-4" />Presentes</TabsTrigger>
              <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />Histórico</TabsTrigger>
              <TabsTrigger value="gympass" className="gap-2"><Shield className="h-4 w-4" />Gympass</TabsTrigger>
              <TabsTrigger value="totalpass" className="gap-2"><Shield className="h-4 w-4" />TotalPass</TabsTrigger>
              <TabsTrigger value="reports" className="gap-2"><FileBarChart2 className="h-4 w-4" />Relatórios</TabsTrigger>
              <TabsTrigger value="settings" className="gap-2"><Settings2 className="h-4 w-4" />Configurações</TabsTrigger>
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
    { label: "Presentes agora", v: d?.presentNow, icon: Users, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Check-ins hoje", v: d?.today, icon: CheckCircle2, tone: "text-blue-600 bg-blue-50" },
    { label: "Check-outs hoje", v: d?.checkouts, icon: LogOut, tone: "text-orange-600 bg-orange-50" },
    { label: "Aguardando validação", v: d?.pendingPartner, icon: Clock, tone: "text-yellow-600 bg-yellow-50" },
    { label: "Gympass hoje", v: d?.gympass, icon: Shield, tone: "text-purple-600 bg-purple-50" },
    { label: "TotalPass hoje", v: d?.totalpass, icon: Shield, tone: "text-pink-600 bg-pink-50" },
    { label: "Média diária (30d)", v: d?.dailyAvg, icon: Activity, tone: "text-cyan-600 bg-cyan-50" },
    { label: "Pico hoje", v: d?.peakCount ? `${d.peakCount} às ${String(d.peakHour).padStart(2, "0")}h` : "—", icon: Zap, tone: "text-rose-600 bg-rose-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-2xl font-bold mt-1">
                    {q.isLoading ? <Skeleton className="h-8 w-16" /> : (k.v ?? 0)}
                  </div>
                </div>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${k.tone}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição horária (hoje)</CardTitle>
        </CardHeader>
        <CardContent>
          <HourlyChart data={d?.hourly ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => (
        <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/80 rounded-sm transition-all hover:bg-primary"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
            title={`${d.count} check-ins às ${d.hour}h`}
          />
          <div className="text-[10px] text-muted-foreground">{d.hour}</div>
        </div>
      ))}
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
  const [showPartner, setShowPartner] = useState<null | "gympass" | "totalpass">(null);
  const [lastCheckin, setLastCheckin] = useState<null | { name: string; photo?: string | null; message: string; method: string }>(null);
  const [unitId, setUnitId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const byCode = useServerFn(checkinByCode);
  const settingsFn = useServerFn(getCheckinSettings);
  const listUnits = useServerFn(listDojoUnits);

  const settingsQ = useQuery({ queryKey: ["dojo-checkin-settings"], queryFn: () => settingsFn() });
  const unitsQ = useQuery({ queryKey: ["dojo-units"], queryFn: () => listUnits() });

  const welcomeTpl = settingsQ.data?.welcome_message || "Bem-vindo, {{name}}! Bom treino 🥋";

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  async function submitCode(code: string) {
    const c = code.trim();
    if (!c) return;
    try {
      const r = await byCode({ data: { code: c, unitId: unitId || null } });
      const msg = welcomeTpl.replace(/\{\{name\}\}/g, r.student.full_name?.split(" ")[0] ?? "");
      setLastCheckin({ name: r.student.full_name, message: msg, method: /^\d+$/.test(c) ? "PIN" : "QR" });
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

  return (
    <div ref={containerRef} className={`space-y-4 ${isFullscreen ? "bg-background p-6" : ""}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Unidade (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {(unitsQ.data ?? []).map((u: any) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={toggleFullscreen} className="gap-2">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFullscreen ? "Sair da tela cheia" : "Modo Kiosk"}
        </Button>
      </div>

      <Card className="relative overflow-hidden">
        <CardContent className="p-8 md:p-12">
          {lastCheckin ? (
            <SuccessBanner data={lastCheckin} />
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); submitCode(pin); }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
                  <Fingerprint className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Digite seu PIN ou escaneie o QR</h2>
                <p className="text-muted-foreground text-sm">Aproxime-se do leitor ou digite abaixo</p>
              </div>

              <Input
                ref={inputRef}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN ou código QR"
                className="text-center text-3xl h-20 tracking-widest font-mono"
                autoFocus
                inputMode="numeric"
              />

              <Button type="submit" className="w-full h-14 text-lg" size="lg" disabled={!pin.trim()}>
                Registrar presença
              </Button>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
                <ActionButton icon={Search} label="Buscar aluno" onClick={() => setShowSearch(true)} />
                <ActionButton icon={UserPlus} label="Visitante" onClick={() => setShowVisitor(true)} />
                <ActionButton icon={Shield} label="Gympass" onClick={() => setShowPartner("gympass")} />
                <ActionButton icon={Shield} label="TotalPass" onClick={() => setShowPartner("totalpass")} />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <SearchDialog open={showSearch} onOpenChange={setShowSearch} unitId={unitId} onSuccess={(name: string) => {
        setLastCheckin({ name, message: welcomeTpl.replace(/\{\{name\}\}/g, name.split(" ")[0]), method: "Manual" });
        setTimeout(() => setLastCheckin(null), 3500);
      }} />

      <VisitorDialog open={showVisitor} onOpenChange={setShowVisitor} unitId={unitId} />

      <PartnerDialog
        open={!!showPartner}
        provider={showPartner}
        unitId={unitId}
        onOpenChange={() => setShowPartner(null)}
      />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
    >
      <Icon className="h-6 w-6 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function SuccessBanner({ data }: { data: { name: string; photo?: string | null; message: string; method: string } }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center py-6 animate-in fade-in zoom-in duration-300">
      <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in duration-500">
        <CheckCircle2 className="h-14 w-14 text-emerald-600" />
      </div>
      <div>
        <div className="text-3xl md:text-4xl font-bold">{data.message}</div>
        <div className="text-muted-foreground mt-2 text-sm">
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

  async function pick(s: any) {
    try {
      await manual({ data: { studentId: s.id, unitId: unitId || null } });
      toast.success(`Presença registrada: ${s.full_name}`);
      qc.invalidateQueries({ queryKey: ["dojo-checkin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dojo-att"] });
      qc.invalidateQueries({ queryKey: ["dojo-present"] });
      onOpenChange(false);
      setQ("");
      onSuccess?.(s.full_name);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
      <DialogContent>
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
      <DialogContent>
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
      });
    } else if (!q.isLoading) {
      setState({
        minIntervalMinutes: 30, allowMultipleDaily: true, requireCheckout: false,
        welcomeMessage: "Bem-vindo, {{name}}! Bom treino 🥋",
        blockOnOverdue: false, warnOnOverdue: true, warnOnMedical: true,
        requirePartnerValidation: true, kioskPin: "",
        geoRequired: false, geoLat: null, geoLng: null, geoRadiusM: 50, geoAddress: "",
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

        <div className="space-y-2">
          <SettingRow label="Permitir múltiplos check-ins no mesmo dia" v={state.allowMultipleDaily} onChange={(v) => upd("allowMultipleDaily", v)} />
          <SettingRow label="Exigir check-out (saída)" v={state.requireCheckout} onChange={(v) => upd("requireCheckout", v)} />
          <SettingRow label="Bloquear check-in de alunos com mensalidade em atraso" v={state.blockOnOverdue} onChange={(v) => upd("blockOnOverdue", v)} />
          <SettingRow label="Avisar (sem bloquear) mensalidade em atraso" v={state.warnOnOverdue} onChange={(v) => upd("warnOnOverdue", v)} />
          <SettingRow label="Avisar sobre atestado médico vencido" v={state.warnOnMedical} onChange={(v) => upd("warnOnMedical", v)} />
          <SettingRow label="Exigir validação oficial para Gympass/TotalPass" v={state.requirePartnerValidation} onChange={(v) => upd("requirePartnerValidation", v)} />
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
