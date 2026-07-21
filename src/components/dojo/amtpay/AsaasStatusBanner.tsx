import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, ArrowRight } from "lucide-react";

import { getMyAsaasConfig } from "@/lib/asaas/asaas.functions";
import {
  classifyAsaasStatus,
  getAsaasStatusMeta,
  type AsaasReadinessLevel,
} from "@/lib/dojo/amt-pay-status";
import { Button } from "@/components/ui/button";

const iconByLevel: Record<AsaasReadinessLevel, typeof Clock> = {
  not_started: ShieldAlert,
  pending: Clock,
  awaiting_docs: AlertTriangle,
  approved: CheckCircle2,
  linked: CheckCircle2,
  rejected: ShieldAlert,
};

const toneClass: Record<string, string> = {
  neutral: "bg-neutral-50 border-neutral-200 text-neutral-800",
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  danger: "bg-red-50 border-red-200 text-red-900",
};

/**
 * Banner de status da subconta Asaas do dojo.
 * Sempre visível no topo do módulo AMT Pay para deixar claro se o dojo
 * já pode emitir cobranças em nome próprio.
 */
export function AsaasStatusBanner() {
  const fn = useServerFn(getMyAsaasConfig);
  const { data, isLoading } = useQuery({
    queryKey: ["amtpay", "asaas-config"],
    queryFn: () => fn(),
  });

  if (isLoading || !data) return null;

  const level = classifyAsaasStatus(data.onboardingStatus);
  const meta = getAsaasStatusMeta(level);
  const Icon = iconByLevel[level];
  const isReady = level === "approved" || level === "linked";

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${toneClass[meta.tone]}`}>
      <div className="mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider font-semibold opacity-80">
            AMT Pay
          </span>
          <span className="text-sm font-bold">{meta.label}</span>
        </div>
        <p className="text-sm mt-1 opacity-90">{meta.description}</p>
      </div>
      {!isReady && (
        <Button asChild size="sm" variant="secondary" className="shrink-0">
          <Link to="/dojo/onboarding">
            {level === "not_started" ? "Ativar" : "Concluir"}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
