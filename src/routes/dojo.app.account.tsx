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
import {
  User as UserIcon, Building2, Palette, CreditCard, Receipt, Shield,
  Bell, Monitor, Plug, Upload, Trash2, Save, KeyRound, LogOut, History, Loader2, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCepLookup } from "@/hooks/useCepLookup";
import { useServerFn } from "@tanstack/react-start";
import { createMyAsaasSubaccount, getMyAsaasConfig } from "@/lib/asaas/asaas.functions";

export const Route = createFileRoute("/dojo/app/account")({
  head: () => ({ meta: [{ title: "Minha Conta — AMT Dojo Manager" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    onboarding: s.onboarding === "1" || s.onboarding === 1 ? true : undefined,
  }),
  component: AccountPage,
});

type TabKey =
  | "personal" | "academy" | "brand" | "subscription"
  | "financial" | "security" | "notifications" | "sessions" | "integrations";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "personal", label: "Dados Pessoais", icon: UserIcon },
  { key: "academy", label: "Academia", icon: Building2 },
  { key: "brand", label: "Identidade Visual", icon: Palette },
  { key: "subscription", label: "Assinatura", icon: CreditCard },
  { key: "financial", label: "Financeiro", icon: Receipt },
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({});
  const [academy, setAcademy] = useState<any>({});
  const [notifPrefs, setNotifPrefs] = useState<any>({
    email_enabled: true, system_enabled: true,
    finance_alerts: true, product_news: true, reminders: true,
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    setUser(u.user);
    const uid = u.user.id;

    const [{ data: p }, { data: a }, { data: n }, { data: sub }, { data: inv }, { data: au }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("dojo_academy_profile").select("*").eq("owner_id", uid).maybeSingle(),
      supabase.from("dojo_account_notifications").select("*").eq("owner_id", uid).maybeSingle(),
      supabase.from("dojo_subscriptions").select("*").eq("owner_id", uid).maybeSingle(),
      supabase.from("dojo_invoices").select("*").eq("owner_id", uid).order("due_date", { ascending: false }).limit(50),
      supabase.from("dojo_account_audit").select("*").eq("owner_id", uid).order("created_at", { ascending: false }).limit(30),
    ]);
    setProfile(p ?? { id: uid, email: u.user.email });
    setAcademy(a ?? { owner_id: uid, modalities: [] });
    if (n) setNotifPrefs(n);
    setSubscription(sub);
    setInvoices(inv ?? []);
    setAudit(au ?? []);
    setLoading(false);
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

  const createAsaasFn = useServerFn(createMyAsaasSubaccount);

  async function saveAcademy(opts?: { skipAsaas?: boolean }) {
    if (!user) return;
    const payload = { ...academy, owner_id: user.id };
    const { error } = await supabase.from("dojo_academy_profile").upsert(payload);
    if (error) return toast.error(error.message);
    await logAudit("academy_updated");
    toast.success("Dados da academia salvos");

    // Ativação automática do Asaas assim que os dados fiscais obrigatórios
    // estiverem preenchidos e a subconta ainda não existir.
    const hasSubaccount = !!academy?.asaas_subaccount_id;
    const hasLinkedWallet = !!academy?.asaas_wallet_id;
    const requiredOk =
      (academy?.legal_name || academy?.trade_name) &&
      academy?.cnpj &&
      academy?.email &&
      academy?.phone &&
      academy?.address &&
      academy?.address_number &&
      academy?.neighborhood &&
      academy?.city &&
      academy?.state &&
      academy?.zip;

    // Não tentar criar subconta se já existir OU se o dono já vinculou uma
    // conta Asaas existente pela walletId (mesmo CNPJ).
    if (!opts?.skipAsaas && !hasSubaccount && !hasLinkedWallet && requiredOk) {
      try {
        toast.info("Ativando subconta Asaas…");
        const res = await createAsaasFn({ data: {} });
        await logAudit("asaas_subaccount_auto_created", { subaccount_id: res.subaccountId });
        toast.success("Subconta Asaas ativada automaticamente!");
      } catch (e: any) {
        const msg = String(e?.message || "erro desconhecido");
        if (/CNPJ.*(uso|utiliza|cadastrad)/i.test(msg) || /CPF.*(uso|utiliza|cadastrad)/i.test(msg)) {
          toast.error(
            "Este CNPJ/CPF já possui conta no Asaas. Vá em AMT Pay → 'Já tenho uma conta Asaas' e informe seu walletId para receber via split.",
            { duration: 12000 },
          );
        } else {
          toast.error("Não foi possível ativar a subconta Asaas: " + msg);
        }
      }
    }

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
    if (password.length < 6) return toast.error("Senha muito curta");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    setPassword("");
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
    <div className="space-y-4 max-w-6xl">
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

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <nav className="md:sticky md:top-4 self-start">
          <Card className="p-1.5">
            <div className="flex md:flex-col gap-1 overflow-x-auto">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors whitespace-nowrap md:whitespace-normal",
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
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
            <SubscriptionTab subscription={subscription} />
          )}
          {tab === "financial" && (
            <FinancialTab invoices={invoices} />
          )}
          {tab === "security" && (
            <SecurityTab
              password={password}
              setPassword={setPassword}
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
  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    trial: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
    past_due: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-muted overflow-hidden ring-2 ring-border">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                : <div className="flex items-center justify-center h-full text-2xl font-semibold text-muted-foreground">{(profile?.full_name || user?.email || "U").slice(0, 1).toUpperCase()}</div>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow"
              title="Trocar foto"
            >
              <Upload className="h-3 w-3" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold truncate">{profile?.full_name || "Sem nome cadastrado"}</h1>
                <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {profile?.job_title || "Administrador"}
                  {academy?.trade_name && <span> · {academy.trade_name}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs">
                <Badge variant="outline" className={cn("border", statusColor[status] || "")}>
                  {status === "active" ? "Assinatura ativa" : status === "trial" ? "Período de teste" : status === "cancelled" ? "Cancelada" : status}
                </Badge>
                <span className="text-muted-foreground">
                  Conta criada em {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "—"}
                </span>
                {user?.last_sign_in_at && (
                  <span className="text-muted-foreground">
                    Último acesso: {new Date(user.last_sign_in_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onEditProfile}><UserIcon className="h-3 w-3 mr-1" /> Editar Perfil</Button>
              <Button variant="outline" size="sm" onClick={onChangePassword}><KeyRound className="h-3 w-3 mr-1" /> Alterar Senha</Button>
              <Button variant="outline" size="sm" onClick={onManageSubscription}><CreditCard className="h-3 w-3 mr-1" /> Gerenciar Assinatura</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const bind = (k: string) => ({
    value: academy?.[k] ?? "",
    onChange: (e: any) => setAcademy({ ...academy, [k]: e.target.value }),
  });

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

  // Requisitos mínimos para ativação automática da subconta Asaas
  const req = {
    name: !!(academy?.legal_name || academy?.trade_name),
    cnpj: !!academy?.cnpj,
    email: !!academy?.email,
    phone: !!academy?.phone,
    address: !!academy?.address,
    number: !!academy?.address_number,
    neighborhood: !!academy?.neighborhood,
    city: !!academy?.city,
    state: !!academy?.state,
    zip: !!academy?.zip,
  };
  const allOk = Object.values(req).every(Boolean);
  const hasSubaccount = !!academy?.asaas_subaccount_id;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle>Dados da Academia</CardTitle>
          {hasSubaccount ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">
              <ShieldCheck className="h-3 w-3 mr-1" /> Asaas ativo
            </Badge>
          ) : allOk ? (
            <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 border">
              Pronto para ativar Asaas
            </Badge>
          ) : (
            <Badge variant="outline">Complete os dados para ativar Asaas</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSubaccount && (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Ativação automática do AMT Pay</AlertTitle>
            <AlertDescription>
              Ao salvar com todos os campos marcados com <b>*</b> preenchidos, sua
              subconta Asaas será criada automaticamente para receber mensalidades
              via PIX, boleto e cartão.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Razão social / Nome *"><Input required {...bind("legal_name")} /></Field>
          <Field label="Nome fantasia"><Input {...bind("trade_name")} /></Field>
          <Field label="CPF ou CNPJ *"><Input required {...bind("cnpj")} placeholder="Somente números" /></Field>
          <Field label="Telefone *"><Input required {...bind("phone")} placeholder="(11) 3333-4444" /></Field>
          <Field label="WhatsApp / Celular"><Input {...bind("whatsapp")} placeholder="(11) 9xxxx-xxxx" /></Field>
          <Field label="E-mail institucional *"><Input required type="email" {...bind("email")} /></Field>
          <Field label="Site"><Input {...bind("website")} /></Field>
          <Field label="Instagram"><Input {...bind("instagram")} placeholder="@usuario" /></Field>
          <Field label="Facebook"><Input {...bind("facebook")} /></Field>
        </div>

        <Separator />

        <div className="text-sm font-medium">Endereço fiscal</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <Field label="CEP *">
              <div className="relative">
                <Input
                  required
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
            <Field label="Endereço (rua/avenida) *"><Input required {...bind("address")} /></Field>
          </div>
          <div className="md:col-span-1">
            <Field label="Número *"><Input required {...bind("address_number")} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Complemento"><Input {...bind("address_complement")} placeholder="Sala, andar…" /></Field>
          </div>
          <div className="md:col-span-3">
            <Field label="Bairro *"><Input required {...bind("neighborhood")} /></Field>
          </div>
          <div className="md:col-span-4">
            <Field label="Cidade *"><Input required {...bind("city")} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="UF *"><Input required {...bind("state")} maxLength={2} placeholder="SP" /></Field>
          </div>
        </div>

        <Separator />

        <div className="text-sm font-medium">Informações fiscais (Asaas)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Tipo de titular">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={academy?.company_type ?? "MEI"}
              onChange={(e) => setAcademy({ ...academy, company_type: e.target.value })}
            >
              <option value="INDIVIDUAL">Pessoa Física</option>
              <option value="MEI">MEI</option>
              <option value="LIMITED">LTDA</option>
              <option value="ASSOCIATION">Associação</option>
            </select>
          </Field>
          <Field label="Faturamento mensal estimado (R$)">
            <Input
              type="number"
              min={0}
              value={academy?.monthly_income ?? ""}
              onChange={(e) => setAcademy({ ...academy, monthly_income: Number(e.target.value) || null })}
              placeholder="5000"
            />
          </Field>
          <Field label="Data de nascimento (PF)">
            <Input
              type="date"
              value={academy?.birth_date ? String(academy.birth_date).slice(0, 10) : ""}
              onChange={(e) => setAcademy({ ...academy, birth_date: e.target.value || null })}
            />
          </Field>
        </div>

        <Separator />

        <Field label="Modalidades oferecidas (separadas por vírgula)">
          <Input
            value={(academy?.modalities ?? []).join(", ")}
            onChange={(e) => setAcademy({ ...academy, modalities: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
            placeholder="Jiu-Jitsu, Muay Thai, Boxe"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => onSave()}><Save className="h-4 w-4 mr-1" />Salvar academia</Button>
          {!hasSubaccount && !allOk && (
            <span className="text-xs text-muted-foreground">
              Preencha os campos marcados com <b>*</b> para ativar o recebimento automaticamente.
            </span>
          )}
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
function SubscriptionTab({ subscription }: any) {
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
  return (
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
          <Button size="sm" asChild className="bg-red-600 hover:bg-red-700">
            <a href="/dojo/app/subscription">
              {status === "active" ? "Gerenciar assinatura" : status === "cancelled" ? "Reativar assinatura" : "Ativar assinatura no Mercado Pago"}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Financial ---------------- */
function FinancialTab({ invoices }: any) {
  const [q, setQ] = useState("");
  const pending = invoices.filter((i: any) => i.status !== "paid");
  const paid = invoices.filter((i: any) => i.status === "paid");
  const filter = (list: any[]) => q
    ? list.filter((i) => JSON.stringify(i).toLowerCase().includes(q.toLowerCase()))
    : list;

  const totalPaid = paid.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total pago" value={brl(totalPaid)} />
        <KpiCard label="Faturas pagas" value={String(paid.length)} />
        <KpiCard label="Pendentes" value={String(pending.length)} />
        <KpiCard label="Próxima cobrança" value={pending[0]?.due_date ? new Date(pending[0].due_date).toLocaleDateString("pt-BR") : "—"} />
      </div>
      <div>
        <Input placeholder="Buscar por competência, número, valor…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      </div>
      <Card>
        <CardHeader><CardTitle>Faturas pendentes</CardTitle></CardHeader>
        <CardContent>
          <InvoiceTable rows={filter(pending)} pending />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Histórico de pagamentos</CardTitle></CardHeader>
        <CardContent>
          <InvoiceTable rows={filter(paid)} />
        </CardContent>
      </Card>
    </div>
  );
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
              <td className="py-2 pr-3">{r.description || new Date(r.due_date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</td>
              <td className="py-2 pr-3">{brl(r.amount)}</td>
              <td className="py-2 pr-3">{r.paid_at ? new Date(r.paid_at).toLocaleDateString("pt-BR") : new Date(r.due_date).toLocaleDateString("pt-BR")}</td>
              <td className="py-2 pr-3 capitalize">{r.method || "—"}</td>
              <td className="py-2 pr-3"><Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge></td>
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
function SecurityTab({ password, setPassword, saving, onSubmit, lastSignIn, audit }: any) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
        <CardContent className="space-y-3 max-w-md">
          <Field label="Nova senha">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </Field>
          <Button onClick={onSubmit} disabled={saving}>
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
