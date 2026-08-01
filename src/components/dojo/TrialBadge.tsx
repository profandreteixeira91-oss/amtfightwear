import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getMySubscription } from "@/lib/dojo/subscription.functions";
import { todayISO } from "@/lib/dates";

function useTrial() {
  const fn = useServerFn(getMySubscription);
  const { data } = useQuery({
    queryKey: ["dojo", "my-subscription"],
    queryFn: () => fn({}),
    staleTime: 5 * 60 * 1000,
  });
  if (!data) return null;
  const status = (data as any).status as string;
  const trialEnd = (data as any).trial_ends_at as string | null;
  if (status !== "trialing" || !trialEnd) return null;
  const ms = new Date(trialEnd).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return { days, trialEnd, urgent: days <= 3 };
}

/** Toast automático quando faltam 3, 2 ou 1 dia — dispara uma vez por dia. */
function useTrialReminder(days: number | undefined) {
  useEffect(() => {
    if (days == null) return;
    if (days > 3 || days < 1) return;
    if (typeof window === "undefined") return;
    const key = `dojo-trial-reminder-${todayISO()}-${days}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    toast.warning(
      `Faltam ${days} ${days === 1 ? "dia" : "dias"} para o término do seu período de teste`,
      {
        description:
          "Após o término, seus dados ficarão armazenados por 30 dias no sistema. Assine agora para continuar sem interrupções.",
        duration: 12000,
        action: {
          label: "Assinar",
          onClick: () => {
            window.location.href = "/dojo/app/subscription";
          },
        },
      },
    );
  }, [days]);
}

export function TrialBadge() {
  const trial = useTrial();
  useTrialReminder(trial?.days);
  if (!trial) return null;
  const { days, urgent } = trial;
  return (
    <Link
      to="/dojo/app/subscription"
      title="Seu período de teste — clique para assinar"
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        urgent
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
      }`}
    >
      {urgent ? <Clock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      <span>
        Trial · {days} {days === 1 ? "dia restante" : "dias restantes"}
      </span>
    </Link>
  );
}

export function AccountTrialInline() {
  const trial = useTrial();
  if (!trial) return null;
  const { days, urgent } = trial;
  return (
    <span
      className={`ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
        urgent
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-primary/10 text-primary"
      }`}
    >
      <Clock className="h-2.5 w-2.5" />
      {days}d
    </span>
  );
}

/** Bloco exibido dentro do dropdown do cabeçalho (logo + nome do dojo). */
export function TrialDropdownCard() {
  const trial = useTrial();
  if (!trial) return null;
  const { days, urgent } = trial;
  return (
    <Link
      to="/dojo/app/subscription"
      className={`mx-1 mb-1 mt-1 flex flex-col gap-1.5 rounded-md border p-2.5 text-left transition-colors ${
        urgent
          ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
          : "border-primary/30 bg-primary/5 hover:bg-primary/10"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {urgent ? (
          <Clock className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        )}
        <span className={`text-[11px] font-bold uppercase tracking-wider ${urgent ? "text-destructive" : "text-primary"}`}>
          Trial de 14 dias
        </span>
      </div>
      <div className="text-sm font-semibold text-foreground">
        {days > 0
          ? `${days} ${days === 1 ? "dia restante" : "dias restantes"}`
          : "Encerrado hoje"}
      </div>
      {urgent && (
        <div className="flex items-start gap-1 text-[10px] leading-snug text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Seus dados ficarão armazenados por 30 dias após o término do trial.
          </span>
        </div>
      )}
      <div className={`inline-flex items-center gap-1 text-[11px] font-semibold ${urgent ? "text-destructive" : "text-primary"}`}>
        Assinar agora <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
