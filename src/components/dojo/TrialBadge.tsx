import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Clock } from "lucide-react";
import { getMySubscription } from "@/lib/dojo/subscription.functions";

export function TrialBadge() {
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
  const urgent = days <= 3;

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
