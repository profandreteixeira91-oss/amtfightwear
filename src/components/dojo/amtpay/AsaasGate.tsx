import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

import { getMyAsaasConfig } from "@/lib/asaas/asaas.functions";
import {
  classifyAsaasStatus,
  getAsaasStatusMeta,
  isAsaasReady,
} from "@/lib/dojo/amt-pay-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Wrapper que bloqueia o conteúdo até o dojo ter subconta Asaas aprovada
 * (ou wallet externa vinculada). Exibe um card explicando o que fazer.
 */
export function AsaasGate({
  children,
  title,
  fallbackHint,
}: {
  children: ReactNode;
  title?: string;
  fallbackHint?: string;
}) {
  const fn = useServerFn(getMyAsaasConfig);
  const { data, isLoading } = useQuery({
    queryKey: ["amtpay", "asaas-config"],
    queryFn: () => fn(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (data && isAsaasReady(data.onboardingStatus)) {
    return <>{children}</>;
  }

  const level = classifyAsaasStatus(data?.onboardingStatus);
  const meta = getAsaasStatusMeta(level);

  return (
    <Card className="border-dashed">
      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
        <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
          <Lock className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            {title ?? "Complete a ativação do AMT Pay"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {fallbackHint ??
              `Status atual: ${meta.label}. ${meta.description} Sem a ativação concluída, as cobranças não podem ser emitidas em nome do seu dojo.`}
          </p>
        </div>
        <Button asChild className="bg-red-600 hover:bg-red-700">
          <Link to="/dojo/onboarding">
            {level === "not_started" ? "Ativar AMT Pay" : "Continuar ativação"}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
