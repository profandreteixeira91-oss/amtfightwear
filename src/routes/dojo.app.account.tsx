import { brDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/components/common/UnsavedChangesGuard";
import {
  User as UserIcon, Building2, Palette, CreditCard, Shield,
  Bell, Monitor, Plug, Upload, Trash2, Save, KeyRound, LogOut, History, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCepLookup } from "@/hooks/useCepLookup";
import { useQueryClient } from "@tanstack/react-query";
import { DocumentsTab } from "@/components/dojo/account/DocumentsTab";
import { useServerFn } from "@tanstack/react-start";
import { listMySubscriptionPayments } from "@/lib/dojo/subscription.functions";
import { PasswordStrength, isPasswordStrong } from "@/components/auth/PasswordStrength";



export const Route = createFileRoute("/dojo/app/account")({
  head: () => ({ meta: [{ title: "Minha Conta — AMT Dojo Manager" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    onboarding: s.onboarding === "1" || s.onboarding === 1 ? true : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: AccountPage,
});

type TabKey =
  | "personal" | "academy" | "brand" | "subscription"
  | "documents" | "security" | "notifications" | "sessions" | "integrations";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "personal", label: "Dados Pessoais", icon: UserIcon },
  { key: "academy", label: "Academia", icon: Building2 },
  { key: "brand", label: "Identidade Visual", icon: Palette },
  { key: "subscription", label: "Assinatura", icon: CreditCard },
  { key: "documents", label: "Documentos", icon: Upload },
  { key: "security", label: "Segurança", icon: Shield },
  { key: "notifications", label: "Notificações", icon: Bell },
  { key: "sessions", label: "Sessões Ativas", icon: Monitor },
  { key: "integrations", label: "Integrações", icon: Plug },
];


const PLACEMENTS: { key: string; label: string }[] = [
  { key: "certificates_graduation", label: "Certificados de graduação" },
  { key: "certificates_courses", label: "Certificados de cursos" },
  { key: "certificates_participation", label: "Certificados de participação" },
  { key: "declarations", label: "Declarações" },
  { key: "reports", label: "Relatórios" },
  { key: "receipts", label: "Recibos" },
  { key: "contracts", label: "Contratos" },
  { key: "enrollment_forms", label: "Fichas de matrícula" },
  { key: "student_card", label: "Carteirinha do aluno" },
  { key: "custom_documents", label: "Documentos personalizados" },
];

function AccountPage() {
  const { onboarding } = Route.useSearch();
  const [tab, setTab] = useState<TabKey>(onboarding ? "academy" : "personal");
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({});
  const [academy, setAcademy] = useState<any>({});
  const [notifPrefs, setNotifPrefs] = useState<any>({
    email_enabled: true, system_enabled: true,
    finance_alerts: true, product_news: true, reminders: true,
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [subPayments, setSubPayments] = useState<{ paid: any[]; pending: any[] }>({ paid: [], pending: [] });
  const fetchSubPayments = useServerFn(listMySubscriptionPayments);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const [snapshot, setSnapshot] = useState<string>("");
  const currentSnap = JSON.stringify({ profile, academy, notifPrefs });
  useUnsavedChanges(!loading && snapshot !== "" && snapshot !== currentSnap);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    setUser(u.user);
    const uid = u.user.id;

    const [{ data: p }, { data: a }, { data: n }, { data: sub }, { data: au }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("dojo_academy_profile").select("*").eq("owner_id", uid).maybeSingle(),
      supabase.from("dojo_account_notifications").select("*").eq("owner_id", uid).maybeSingle(),
      supabase.from("dojo_subscriptions").select("*").eq("owner_id", uid).maybeSingle(),
      supabase.from("dojo_account_audit").select("*").eq("owner_id", uid).order("created_at", { ascending: false }).limit(30),
    ]);
    const pv = p ?? { id: uid, email: u.user.email };
    const av = a ?? { owner_id: uid, modalities: [] };
    setProfile(pv);
    setAcademy(av);
    const nv = n ?? { email_enabled: true, system_enabled: true, finance_alerts: true, product_news: true, reminders: true };
    if (n) setNotifPrefs(n);
    setSubscription(sub);
    setAudit(au ?? []);
    setSnapshot(JSON.stringify({ profile: pv, academy: av, notifPrefs: nv }));
    setLoading(false);
    fetchSubPayments()
      .then((r: any) => setSubPayments({ paid: r?.paid ?? [], pending: r?.pending ?? [] }))
      .catch(() => setSubPayments({ paid: [], pending: [] }));
  }

  async function logAudit(action: string, meta: any = {}) {
    if (!user) return;
    await supabase.from("dojo_account_audit").insert({ owner_id: user.id, action, meta });
  }

  async function saveProfile() {
    if (!user) return;
    const payload = { ...profile, id: user.id, email: user.email };
    const { error } = await supabase.from("profiles").upsert(payload);
    if (error) return toast.error(error.message);
    await logAudit("profile_updated");
    toast.success("Dados pessoais salvos");
    load();
  }

  async function saveAcademy() {
    if (!user) return;
    const payload = { ...academy, owner_id: user.id };
    const { error } = await supabase.from("dojo_academy_profile").upsert(payload);
    if (error) return toast.error(error.message);
    await logAudit("academy_updated");
    await queryClient.invalidateQueries({ queryKey: ["dojo", "branding", "me"] });
    toast.success("Dados da academia salvos");
    load();
  }


  async function saveNotifs() {
    if (!user) return;
    const { error } = await supabase.from("dojo_account_notifications")
      .upsert({ ...notifPrefs, owner_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Preferências salvas");
  }

  async function updatePassword() {
    if (!isPasswordStrong(password)) {
      return toast.error("Senha não atende aos requisitos", {
        description: "Cumpra todos os critérios da lista antes de continuar.",
      });
    }
    if (password !== passwordConfirm) {
      return toast.error("As senhas não coincidem");
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    setPassword("");
    setPasswordConfirm("");
    await logAudit("password_changed");
    toast.success("Senha atualizada");
  }


  async function signOutAll() {
    await supabase.auth.signOut({ scope: "others" as any });
    await logAudit("signed_out_others");
    toast.success("Outras sessões encerradas");
  }

  if (loading) {
    return (
      <div className="space-y-3 max-w-6xl">
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {onboarding && (
        <Alert className="border-red-500/40 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent">
          <AlertTitle>Bem-vindo ao AMT Dojo Manager!</AlertTitle>
          <AlertDescription>
            Para começar a operar, preencha os dados da sua academia (razão social,
            CNPJ, endereço e contato).
          </AlertDescription>
        </Alert>
      )}

      <AccountHeader
        user={user}
        profile={profile}
        academy={academy}
        subscription={subscription}
        onEditProfile={() => setTab("personal")}
        onChangePassword={() => setTab("security")}
        onManageSubscription={() => setTab("subscription")}
        setProfile={setProfile}
        saveProfile={saveProfile}
      />

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
        <nav className="md:sticky md:top-4 self-start">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 p-2 shadow-[0_10px_40px_-20px_rgba(220,38,38,0.35)] backdrop-blur-xl">
            <div className="flex md:flex-col gap-1 overflow-x-auto">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all whitespace-nowrap md:whitespace-normal relative",
                      active
                        ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/40"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-transform", active ? "" : "group-hover:scale-110")} />
                    <span className="font-medium tracking-tight">{t.label}</span>
                    {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-white/70 md:block hidden" />}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>


        <div className="min-w-0 space-y-4">
          {tab === "personal" && (
            <PersonalTab profile={profile} setProfile={setProfile} email={user?.email} onSave={saveProfile} />
          )}
          {tab === "academy" && (
            <AcademyTab academy={academy} setAcademy={setAcademy} onSave={saveAcademy} />
          )}
          {tab === "brand" && (
            <BrandTab
              academy={academy}
              setAcademy={setAcademy}
              onSave={saveAcademy}
              onLog={(a: string, m: any) => logAudit(a, m)}
            />
          )}
          {tab === "subscription" && (
            <SubscriptionTab subscription={subscription} payments={subPayments} />
          )}
          {tab === "security" && (
            <SecurityTab
              password={password}
              setPassword={setPassword}
              passwordConfirm={passwordConfirm}
              setPasswordConfirm={setPasswordConfirm}
              saving={savingPwd}
              onSubmit={updatePassword}
              lastSignIn={user?.last_sign_in_at}
              audit={audit}
            />

          )}
          {tab === "notifications" && (
            <NotificationsTab prefs={notifPrefs} setPrefs={setNotifPrefs} onSave={saveNotifs} />
          )}
          {tab === "sessions" && (
            <SessionsTab user={user} onSignOutAll={signOutAll} />
          )}
          {tab === "documents" && <DocumentsTab />}
          {tab === "integrations" && <IntegrationsTab />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Header ---------------- */
function AccountHeader({ user, profile, academy, subscription, onEditProfile, onChangePassword, onManageSubscription, setProfile, saveProfile }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    const path = `avatars/${user.id}/${Date.now()}-${f.name}`;
    const { error: upErr } = await supabase.storage.from("dojo-brand").upload(path, f, { upsert: true, contentType: f.type });
    if (upErr) return toast.error(upErr.message);
    const { data: pub } = supabase.storage.from("dojo-brand").getPublicUrl(path);
    setProfile((p: any) => ({ ...p, avatar_url: pub.publicUrl }));
    setTimeout(() => saveProfile(), 50);
  }

  const status = subscription?.status ?? "trial";
  const statusChip: Record<string, { label: string; cls: string; dot: string }> = {
    active:    { label: "Assinatura ativa",   cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
    trial:     { label: "Período de teste",   cls: "bg-sky-500/15 text-sky-300 border-sky-500/30",             dot: "bg-sky-400" },
    trialing:  { label: "Período de teste",   cls: "bg-sky-500/15 text-sky-300 border-sky-500/30",             dot: "bg-sky-400" },
    pending:   { label: "Aguardando",         cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",       dot: "bg-amber-400" },
    cancelled: { label: "Cancelada",          cls: "bg-red-500/15 text-red-300 border-red-500/30",             dot: "bg-red-400" },
    past_due:  { label: "Vencida",            cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",       dot: "bg-amber-400" },
  };
  const chip = statusChip[status] ?? { label: status, cls: "bg-white/10 text-white/70 border-white/10", dot: "bg-white/50" };
  const initials = (profile?.full_name || user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black shadow-[0_20px_60px_-20px_rgba(220,38,38,0.45)]">
      {/* Glow ornaments */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-red-600/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-red-900/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_400px_at_50%_-10%,rgba(255,255,255,0.06),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-red-800 opacity-70 blur-md" />
            <div className="relative h-24 w-24 rounded-full overflow-hidden ring-2 ring-white/20 bg-neutral-800">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                : <div className="flex items-center justify-center h-full text-3xl font-serif text-white/80">{initials}</div>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-full p-2 bg-gradient-to-br from-red-600 to-red-800 text-white shadow-lg shadow-red-900/50 ring-2 ring-neutral-950 hover:scale-105 transition-transform"
              title="Trocar foto"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.24em] text-red-400/80 mb-1">Minha Conta</div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white truncate">
                  {profile?.full_name || "Sem nome cadastrado"}
                </h1>
                <div className="mt-1 text-sm text-neutral-400 truncate">{user?.email}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    {profile?.job_title || "Administrador"}
                  </span>
                  {academy?.trade_name && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      <Building2 className="h-3 w-3" />{academy.trade_name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 text-right">
                <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", chip.cls)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />
                  {chip.label}
                </span>
                <div className="text-[11px] text-neutral-500 leading-relaxed">
                  <div>Conta criada em {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "—"}</div>
                  {user?.last_sign_in_at && (
                    <div>Último acesso: {new Date(user.last_sign_in_at).toLocaleString("pt-BR")}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={onEditProfile}
                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 backdrop-blur"
              >
                <UserIcon className="h-3.5 w-3.5 mr-1.5" /> Editar perfil
              </Button>
              <Button
                size="sm"
                onClick={onChangePassword}
                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 backdrop-blur"
              >
                <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Alterar senha
              </Button>
              <Button
                size="sm"
                onClick={onManageSubscription}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-900/40 hover:from-red-500 hover:to-red-600"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Gerenciar assinatura
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ---------------- Personal ---------------- */
function PersonalTab({ profile, setProfile, email, onSave }: any) {
  const bind = (k: string) => ({
    value: profile?.[k] ?? "",
    onChange: (e: any) => setProfile({ ...profile, [k]: e.target.value }),
  });
  return (
    <Card>
      <CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome completo"><Input {...bind("full_name")} /></Field>
          <Field label="E-mail (login)">
            <Input value={email ?? ""} disabled />
            <p className="text-xs text-muted-foreground mt-1">O endereço de e-mail utilizado para login não pode ser alterado.</p>
          </Field>
          <Field label="Telefone"><Input {...bind("phone")} /></Field>
          <Field label="WhatsApp"><Input {...bind("whatsapp")} /></Field>
          <Field label="CPF"><Input {...bind("cpf")} /></Field>
          <Field label="RG"><Input {...bind("rg")} /></Field>
          <Field label="Data de nascimento"><Input type="date" {...bind("birth_date")} /></Field>
          <Field label="Cargo"><Input {...bind("job_title")} placeholder="Ex: Professor, Diretor" /></Field>
          <Field label="Idioma">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={profile?.language ?? "pt-BR"}
              onChange={(e) => setProfile({ ...profile, language: e.target.value })}>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </Field>
          <Field label="Fuso horário">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={profile?.timezone ?? "America/Sao_Paulo"}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}>
              <option value="America/Sao_Paulo">America/São Paulo</option>
              <option value="America/Manaus">America/Manaus</option>
              <option value="America/Belem">America/Belém</option>
              <option value="America/Cuiaba">America/Cuiabá</option>
            </select>
          </Field>
        </div>
        <Field label="Observações"><Textarea rows={3} {...bind("notes")} /></Field>
        <Button onClick={onSave}><Save className="h-4 w-4 mr-1" />Salvar alterações</Button>
      </CardContent>
    </Card>
  );
}

/* ---------------- Academy ---------------- */
function AcademyTab({ academy, setAcademy, onSave }: any) {
  const { lookup: cepLookup, loading: cepLoading } = useCepLookup();
  const [availableModalities, setAvailableModalities] = useState<string[]>([]);
  const [customModality, setCustomModality] = useState("");
  const bind = (k: string) => ({
    value: academy?.[k] ?? "",
    onChange: (e: any) => setAcademy({ ...academy, [k]: e.target.value }),
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("dojo_belts").select("modality");
      const set = new Set<string>();
      (data ?? []).forEach((b: any) => { if (b.modality) set.add(String(b.modality)); });
      setAvailableModalities(Array.from(set).sort());
    })();
  }, []);

  const selectedModalities: string[] = academy?.modalities ?? [];
  const toggleModality = (m: string) => {
    const has = selectedModalities.includes(m);
    const next = has ? selectedModalities.filter((x) => x !== m) : [...selectedModalities, m];
    setAcademy({ ...academy, modalities: next });
  };
  const addCustomModality = () => {
    const v = customModality.trim();
    if (!v) return;
    if (!selectedModalities.includes(v)) setAcademy({ ...academy, modalities: [...selectedModalities, v] });
    if (!availableModalities.includes(v)) setAvailableModalities((prev) => [...prev, v].sort());
    setCustomModality("");
  };

  async function handleCepBlur() {
    const zip = String(academy?.zip || "").replace(/\D/g, "");
    if (zip.length !== 8) return;
    const addr = await cepLookup(zip);
    if (!addr) {
      toast.error("CEP não encontrado");
      return;
    }
    setAcademy((prev: any) => ({
      ...prev,
      zip: addr.zip,
      address: addr.address || prev?.address || "",
      neighborhood: addr.neighborhood || prev?.neighborhood || "",
      city: addr.city || prev?.city || "",
      state: addr.state || prev?.state || "",
    }));
    toast.success("Endereço preenchido pelo CEP");
  }




  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Academia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Razão social / Nome"><Input {...bind("legal_name")} /></Field>
          <Field label="Nome fantasia"><Input {...bind("trade_name")} /></Field>
          <Field label="CPF ou CNPJ"><Input {...bind("cnpj")} placeholder="Somente números" /></Field>
          <Field label="Telefone fixo"><Input {...bind("phone")} placeholder="(11) 3333-4444" /></Field>
          <Field label="Celular / WhatsApp"><Input {...bind("whatsapp")} placeholder="(11) 9xxxx-xxxx" /></Field>
          <Field label="E-mail institucional"><Input type="email" {...bind("email")} /></Field>
          <Field label="Site"><Input {...bind("website")} /></Field>
          <Field label="Instagram"><Input {...bind("instagram")} placeholder="@usuario" /></Field>
          <Field label="Facebook"><Input {...bind("facebook")} /></Field>
        </div>

        <Separator />

        <div className="text-sm font-medium">Endereço fiscal</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <Field label="CEP">
              <div className="relative">
                <Input
                  value={academy?.zip ?? ""}
                  onChange={(e) => setAcademy({ ...academy, zip: e.target.value })}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && (
                  <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
            </Field>
          </div>
          <div className="md:col-span-4">
            <Field label="Endereço (rua/avenida)"><Input {...bind("address")} /></Field>
          </div>
          <div className="md:col-span-1">
            <Field label="Número"><Input {...bind("address_number")} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Complemento"><Input {...bind("address_complement")} placeholder="Sala, andar…" /></Field>
          </div>
          <div className="md:col-span-3">
            <Field label="Bairro"><Input {...bind("neighborhood")} /></Field>
          </div>
          <div className="md:col-span-4">
            <Field label="Cidade"><Input {...bind("city")} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="UF"><Input {...bind("state")} maxLength={2} placeholder="SP" /></Field>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Modalidades oferecidas</Label>
          <p className="text-xs text-muted-foreground">
            Selecione quais modalidades sua academia oferece. Apenas essas modalidades aparecerão em Graduações e nos preços por faixa.
          </p>
          {availableModalities.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              Nenhuma modalidade cadastrada. Configure em <a href="/dojo/app/belts" className="text-primary underline">Modalidades e Faixas</a>.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableModalities.map((m) => {
                const active = selectedModalities.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleModality(m)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm capitalize transition",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    )}
                  >
                    {active ? "✓ " : ""}{m}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              value={customModality}
              onChange={(e) => setCustomModality(e.target.value)}
              placeholder="Adicionar outra modalidade…"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomModality(); } }}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addCustomModality}>Adicionar</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => onSave()}><Save className="h-4 w-4 mr-1" />Salvar academia</Button>
        </div>
      </CardContent>
    </Card>
  );

}

/* ---------------- Brand / Identidade Visual ---------------- */
function BrandTab({ academy, setAcademy, onSave, onLog }: any) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  async function uploadAsset(file: File, kind: "logo" | "signature" | "stamp") {
    if (!file) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUploading(true);
    const path = `${kind}/${u.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("dojo-brand").upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("dojo-brand").getPublicUrl(path);
    const field = kind === "logo" ? "logo_url" : kind === "signature" ? "signature_url" : "stamp_url";
    setAcademy({ ...academy, [field]: pub.publicUrl });
    if (kind === "logo") setPreviewUrl(pub.publicUrl);
    await onLog(`brand_${kind}_uploaded`, { url: pub.publicUrl });
    toast.success("Imagem enviada. Clique em Salvar para aplicar.");
  }

  const placements = academy?.logo_placements ?? {};
  function togglePlacement(key: string) {
    const next = { ...placements, [key]: !placements[key] };
    setAcademy({ ...academy, logo_placements: next });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Logomarca oficial</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start">
            <div className="rounded-lg border border-dashed p-3 bg-muted/30 flex items-center justify-center h-40">
              {(previewUrl || academy?.logo_url)
                ? <img src={previewUrl || academy.logo_url} alt="Logomarca" className="max-h-full max-w-full object-contain" />
                : <span className="text-xs text-muted-foreground">Sem logomarca</span>}
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-1" /> {academy?.logo_url ? "Substituir" : "Enviar"} logo
                </Button>
                {academy?.logo_url && (
                  <Button variant="outline" size="sm" onClick={() => { setAcademy({ ...academy, logo_url: null }); setPreviewUrl(null); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remover
                  </Button>
                )}
                <input
                  ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/jpg" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], "logo")}
                />
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                <li>Resolução mínima recomendada: 1000 × 1000 px</li>
                <li>Fundo transparente (PNG) é o formato preferido</li>
                <li>Arquivos em SVG também são suportados</li>
              </ul>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Utilizar como padrão da academia</div>
                  <div className="text-xs text-muted-foreground">Aplica automaticamente em certificados, relatórios e documentos.</div>
                </div>
                <Switch
                  checked={!!academy?.logo_as_default}
                  onCheckedChange={(v) => setAcademy({ ...academy, logo_as_default: v })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Onde utilizar a logomarca</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLACEMENTS.map((p) => (
              <label key={p.key} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!placements[p.key]}
                  onChange={() => togglePlacement(p.key)}
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assinatura, carimbo e cores</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BrandAssetBlock
              title="Assinatura institucional"
              url={academy?.signature_url}
              onPick={() => sigRef.current?.click()}
              onRemove={() => setAcademy({ ...academy, signature_url: null })}
              inputRef={sigRef}
              onChange={(f: File) => uploadAsset(f, "signature")}
            />
            <BrandAssetBlock
              title="Carimbo oficial / Selo"
              url={academy?.stamp_url}
              onPick={() => stampRef.current?.click()}
              onRemove={() => setAcademy({ ...academy, stamp_url: null })}
              inputRef={stampRef}
              onChange={(f: File) => uploadAsset(f, "stamp")}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Cor primária">
              <div className="flex gap-2">
                <input type="color" className="h-10 w-14 rounded border" value={academy?.brand_primary || "#C1121F"} onChange={(e) => setAcademy({ ...academy, brand_primary: e.target.value })} />
                <Input value={academy?.brand_primary || ""} onChange={(e) => setAcademy({ ...academy, brand_primary: e.target.value })} placeholder="#C1121F" />
              </div>
            </Field>
            <Field label="Cor secundária">
              <div className="flex gap-2">
                <input type="color" className="h-10 w-14 rounded border" value={academy?.brand_secondary || "#111111"} onChange={(e) => setAcademy({ ...academy, brand_secondary: e.target.value })} />
                <Input value={academy?.brand_secondary || ""} onChange={(e) => setAcademy({ ...academy, brand_secondary: e.target.value })} placeholder="#111111" />
              </div>
            </Field>
          </div>
          <Button onClick={onSave}><Save className="h-4 w-4 mr-1" />Salvar identidade visual</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BrandAssetBlock({ title, url, onPick, onRemove, inputRef, onChange }: any) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="h-24 rounded bg-muted/30 flex items-center justify-center">
        {url ? <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
             : <span className="text-xs text-muted-foreground">Nenhum arquivo enviado</span>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onPick}><Upload className="h-3 w-3 mr-1" />Enviar</Button>
        {url && <Button size="sm" variant="outline" onClick={onRemove}><Trash2 className="h-3 w-3 mr-1" />Remover</Button>}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e: any) => e.target.files?.[0] && onChange(e.target.files[0])} />
      </div>
    </div>
  );
}

/* ---------------- Subscription ---------------- */
function SubscriptionTab({ subscription, payments = { paid: [], pending: [] } }: any) {
  const status = subscription?.status ?? "trialing";
  const trialLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;
  const statusLabel: Record<string, string> = {
    trialing: "Período de teste",
    pending: "Aguardando autorização",
    active: "Ativa",
    paused: "Pausada",
    cancelled: "Cancelada",
  };
  const pending = payments.pending ?? [];
  const paid = payments.paid ?? [];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Assinatura</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info label="Plano atual" value="AMT Dojo Manager" />
            <Info label="Status" value={statusLabel[status] ?? status} />
            <Info label="Valor mensal" value={brl(subscription?.plan_amount ?? 69.9)} />
            <Info label="Próxima cobrança" value={subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR") : "—"} />
            <Info label="Forma de pagamento" value="Mercado Pago" />
            <Info label="Renovação automática" value={status === "active" ? "Sim" : "—"} />
          </div>
          {trialLeft != null && trialLeft > 0 && (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm">
              Período de teste: <strong>{trialLeft} dias restantes</strong> (termina em {new Date(subscription.trial_ends_at).toLocaleDateString("pt-BR")}).
            </div>
          )}
          <p className="text-xs text-neutral-500">
            Cobrança recorrente processada pelo Mercado Pago (cartão de crédito ou saldo da conta MP). Cancele quando quiser — nenhum dado do cartão é armazenado no sistema.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild className="bg-red-600 hover:bg-red-700 text-white">
              <a href="/dojo/app/subscription" className="text-white">
                {status === "active" ? "Gerenciar assinatura" : status === "cancelled" ? "Reativar assinatura" : "Ativar assinatura"}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faturas pendentes da assinatura</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Mensalidades do sistema AMT Dojo Manager em aberto ou agendadas.</p>
        </CardHeader>
        <CardContent>
          <InvoiceTable rows={pending} pending />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos da assinatura</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Cobranças mensais do sistema já pagas ao Mercado Pago. Não inclui mensalidades dos alunos.</p>
        </CardHeader>
        <CardContent>
          <InvoiceTable rows={paid} />
        </CardContent>
      </Card>

    </div>
  );
}



function invoiceStatusLabel(s: string): string {
  const map: Record<string, string> = {
    approved: "Pago", paid: "Pago",
    pending: "Aguardando pagamento", in_process: "Processando",
    rejected: "Rejeitado", cancelled: "Cancelado", refunded: "Reembolsado",
    charged_back: "Estornado", scheduled: "Agendado", trial: "Em teste",
  };
  return map[s] ?? s;
}

function InvoiceTable({ rows, pending }: { rows: any[]; pending?: boolean }) {
  if (!rows.length) return <div className="text-sm text-muted-foreground">Nenhum registro.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-2 pr-3">Competência</th>
            <th className="py-2 pr-3">Valor</th>
            <th className="py-2 pr-3">{pending ? "Vencimento" : "Pago em"}</th>
            <th className="py-2 pr-3">Método</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2 pr-3">{r.description || new Date(r.due_date + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</td>
              <td className="py-2 pr-3">{brl(r.amount)}</td>
              <td className="py-2 pr-3">{brDate(r.paid_at || r.due_date)}</td>
              <td className="py-2 pr-3 capitalize">{r.method || "—"}</td>
              <td className="py-2 pr-3"><Badge variant={r.status === "approved" || r.status === "paid" ? "default" : "secondary"}>{invoiceStatusLabel(r.status)}</Badge></td>
              <td className="py-2 pr-3 text-right">
                {r.payment_link && <a className="text-primary text-xs underline" href={r.payment_link} target="_blank" rel="noreferrer">Abrir</a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Security ---------------- */
function SecurityTab({ password, setPassword, passwordConfirm, setPasswordConfirm, saving, onSubmit, lastSignIn, audit }: any) {
  const strong = isPasswordStrong(password);
  const matches = password.length > 0 && password === passwordConfirm;
  const canSubmit = strong && matches && !saving;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <Field label="Nova senha">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha forte"
              autoComplete="new-password"
            />
          </Field>
          <PasswordStrength password={password} />
          <Field label="Confirmar nova senha">
            <Input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Digite a senha novamente"
              autoComplete="new-password"
            />
            {passwordConfirm.length > 0 && !matches && (
              <p className="mt-1 text-xs text-red-600">As senhas não coincidem.</p>
            )}
          </Field>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            <KeyRound className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Atualizar senha"}
          </Button>
        </CardContent>

      </Card>
      <Card>
        <CardHeader><CardTitle>Autenticação em dois fatores</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Em breve você poderá ativar 2FA por aplicativo autenticador.
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Histórico de segurança</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-2">Último login: {lastSignIn ? new Date(lastSignIn).toLocaleString("pt-BR") : "—"}</div>
          {audit?.length ? (
            <ul className="space-y-1.5 text-sm">
              {audit.map((a: any) => (
                <li key={a.id} className="flex items-start gap-2">
                  <History className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                  <span className="flex-1">
                    <span className="font-medium">{humanizeAudit(a.action)}</span>
                    <span className="text-xs text-muted-foreground"> · {new Date(a.created_at).toLocaleString("pt-BR")}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <div className="text-sm text-muted-foreground">Nenhum evento registrado.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Notifications ---------------- */
function NotificationsTab({ prefs, setPrefs, onSave }: any) {
  const items = [
    { k: "email_enabled", label: "Receber notificações por e-mail" },
    { k: "system_enabled", label: "Receber notificações no sistema" },
    { k: "finance_alerts", label: "Avisos financeiros" },
    { k: "product_news", label: "Novidades do produto" },
    { k: "reminders", label: "Lembretes" },
  ];
  return (
    <Card>
      <CardHeader><CardTitle>Preferências de notificação</CardTitle></CardHeader>
      <CardContent className="space-y-3 max-w-lg">
        {items.map((i) => (
          <div key={i.k} className="flex items-center justify-between rounded-md border p-3">
            <div className="text-sm">{i.label}</div>
            <Switch checked={!!prefs[i.k]} onCheckedChange={(v) => setPrefs({ ...prefs, [i.k]: v })} />
          </div>
        ))}
        <Button onClick={onSave}><Save className="h-4 w-4 mr-1" />Salvar preferências</Button>
      </CardContent>
    </Card>
  );
}

/* ---------------- Sessions ---------------- */
function SessionsTab({ user, onSignOutAll }: any) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return (
    <Card>
      <CardHeader><CardTitle>Sessões ativas</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Sessão atual</div>
              <div className="text-xs text-muted-foreground break-all">{ua || "Navegador desconhecido"}</div>
              <div className="text-xs text-muted-foreground">
                Último acesso: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("pt-BR") : "—"}
              </div>
            </div>
            <Badge>Ativo</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={onSignOutAll}>
          <LogOut className="h-4 w-4 mr-1" /> Encerrar outras sessões
        </Button>
        <p className="text-xs text-muted-foreground">
          A listagem detalhada de dispositivos por IP/localização estará disponível em breve.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Integrations ---------------- */
function IntegrationsTab() {
  return (
    <Card>
      <CardHeader><CardTitle>Integrações</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>Área preparada para integrações futuras: API Keys, Webhooks, Zapier, Google Calendar, WhatsApp Business.</p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Helpers ---------------- */
function Field({ label, children }: any) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
function Info({ label, value }: any) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5 break-words">{value}</div>
    </div>
  );
}
function KpiCard({ label, value }: any) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </CardContent></Card>
  );
}
function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n || 0));
}
function humanizeAudit(a: string) {
  const map: Record<string, string> = {
    profile_updated: "Dados pessoais atualizados",
    academy_updated: "Dados da academia atualizados",
    password_changed: "Senha alterada",
    brand_logo_uploaded: "Logomarca atualizada",
    brand_signature_uploaded: "Assinatura atualizada",
    brand_stamp_uploaded: "Carimbo atualizado",
    signed_out_others: "Outras sessões encerradas",
  };
  return map[a] ?? a;
}
