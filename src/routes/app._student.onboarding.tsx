import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Bell, Smartphone, Share, MoreVertical, ArrowRight, Sparkles } from "lucide-react";
import { getVapidPublicKey, subscribeMyPush } from "@/lib/student/push.functions";
import { isPushSupported, subscribePush, subscriptionToPayload } from "@/lib/pwa/push-client";

export const Route = createFileRoute("/app/_student/onboarding")({
  head: () => ({ meta: [{ title: "Bem-vindo — Portal do Aluno" }, { name: "robots", content: "noindex" }] }),
  component: OnboardingPage,
});

type Step = "welcome" | "push" | "install" | "done";

function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function OnboardingPage() {
  const navigate = useNavigate();
  const getKey = useServerFn(getVapidPublicKey);
  const sub = useServerFn(subscribeMyPush);
  const [step, setStep] = useState<Step>("welcome");
  const [busy, setBusy] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(isStandalone);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function finish() {
    try {
      localStorage.setItem("amt-student-onboarded", "1");
    } catch {}
    navigate({ to: "/app/home", replace: true });
  }

  async function enablePush() {
    if (!isPushSupported()) {
      toast.info("Este dispositivo não suporta notificações push");
      setStep("install");
      return;
    }
    setBusy(true);
    try {
      const { key } = await getKey({});
      if (!key) throw new Error("Servidor sem chave VAPID configurada");
      const s = await subscribePush(key);
      if (!s) throw new Error("Permissão negada");
      await sub({ data: subscriptionToPayload(s) });
      toast.success("Notificações ativadas!");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível ativar", { description: "Você pode ativar mais tarde no cabeçalho." });
    } finally {
      setBusy(false);
      setStep("install");
    }
  }

  async function triggerInstall() {
    if (!installEvent) return;
    setBusy(true);
    try {
      installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        toast.success("App instalado!");
        setInstalled(true);
      }
    } finally {
      setBusy(false);
    }
  }

  const platform = detectPlatform();

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center justify-center gap-1.5">
        {(["welcome", "push", "install", "done"] as Step[]).map((s, i) => {
          const currentIdx = ["welcome", "push", "install", "done"].indexOf(step);
          const active = i <= currentIdx;
          return (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full transition ${active ? "bg-red-600" : "bg-neutral-200"}`}
            />
          );
        })}
      </div>

      {step === "welcome" && (
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-bold" style={{ color: "var(--sa-title)" }}>Bem-vindo(a)!</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Seu portal está pronto. Aqui você acompanha treinos, faz check-in, vê seus certificados e paga mensalidades.
          </p>
          <ul className="mt-6 space-y-2 text-left">
            {["Check-in nas aulas", "Suas graduações e certificados", "Cobranças e Pix", "Novidades da academia"].map((f) => (
              <li key={f} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-neutral-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-neutral-700">{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setStep("push")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-red-700"
          >
            Vamos começar <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === "push" && (
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-100 text-blue-700">
            <Bell className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-bold" style={{ color: "var(--sa-title)" }}>Ative as notificações</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Receba avisos de aulas, novas cobranças, faixas concedidas e comunicados importantes.
          </p>
          <div className="mt-6 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-neutral-100">
            <ul className="space-y-2 text-sm text-neutral-700">
              <li>• Aviso de check-in e horários</li>
              <li>• Cobrança em aberto e confirmação de pagamento</li>
              <li>• Novidades e eventos da academia</li>
            </ul>
          </div>
          <button
            onClick={enablePush}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Ativando…" : "Ativar notificações"}
          </button>
          <button
            onClick={() => setStep("install")}
            className="mt-2 w-full py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700"
          >
            Agora não
          </button>
        </div>
      )}

      {step === "install" && (
        <div>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-neutral-900 text-white">
            <Smartphone className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-center text-2xl font-bold" style={{ color: "var(--sa-title)" }}>
            {installed ? "Já está instalado 🎉" : "Instale como app"}
          </h1>
          <p className="mt-2 text-center text-sm text-neutral-500">
            {installed
              ? "Você pode abrir direto pelo ícone da tela inicial."
              : "Tenha acesso rápido e uma experiência de app nativo."}
          </p>

          {!installed && installEvent && (
            <button
              onClick={triggerInstall}
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-red-700 disabled:opacity-60"
            >
              Instalar agora
            </button>
          )}

          {!installed && !installEvent && platform === "ios" && (
            <div className="mt-5 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-neutral-100">
              <h3 className="font-semibold">📱 iPhone / iPad (Safari)</h3>
              <ol className="mt-3 space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <Share className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <span>Toque no ícone <b>Compartilhar</b> na barra do Safari.</span>
                </li>
                <li>2. Escolha <b>“Adicionar à Tela de Início”</b>.</li>
                <li>3. Toque em <b>Adicionar</b>. Pronto!</li>
              </ol>
            </div>
          )}

          {!installed && !installEvent && platform === "android" && (
            <div className="mt-5 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-neutral-100">
              <h3 className="font-semibold">🤖 Android (Chrome)</h3>
              <ol className="mt-3 space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <MoreVertical className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Toque no menu <b>⋮</b> no topo direito.</span>
                </li>
                <li>2. Selecione <b>“Instalar aplicativo”</b>.</li>
                <li>3. Confirme para adicionar à tela inicial.</li>
              </ol>
            </div>
          )}

          {!installed && !installEvent && platform === "other" && (
            <div className="mt-5 rounded-2xl bg-white p-4 text-center text-xs text-neutral-500 ring-1 ring-neutral-100">
              No desktop, use o menu do navegador para instalar como aplicativo.
              <div className="mt-2">
                <Link to="/app/install" className="text-red-600 underline">Ver instruções completas</Link>
              </div>
            </div>
          )}

          <button
            onClick={finish}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            {installed ? "Continuar" : "Concluir"} <ArrowRight className="h-4 w-4" />
          </button>
          {!installed && (
            <button
              onClick={finish}
              className="mt-2 w-full py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700"
            >
              Pular por enquanto
            </button>
          )}
        </div>
      )}
    </div>
  );
}
