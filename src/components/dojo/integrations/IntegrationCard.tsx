import { useState } from "react";
import { cn } from "@/lib/utils";
import { getIntegrationLogoUrl, type IntegrationDef } from "@/lib/dojo/integrations-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings2, Zap, FileText } from "lucide-react";

export type LiveStatus = "connected" | "error" | "inactive" | "available" | "coming_soon";

const statusMeta: Record<LiveStatus, { label: string; className: string; dot: string }> = {
  connected: { label: "Conectado", className: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-500" },
  error: { label: "Erro", className: "text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/30", dot: "bg-red-500" },
  inactive: { label: "Inativo", className: "text-neutral-600 dark:text-neutral-400 bg-neutral-500/10 border-neutral-500/30", dot: "bg-neutral-400" },
  available: { label: "Disponível", className: "text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/30", dot: "bg-sky-500" },
  coming_soon: { label: "Em breve", className: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30", dot: "bg-amber-500" },
};

export function IntegrationCard({
  integration,
  status,
  onConfigure,
  onTest,
  onLogs,
}: {
  integration: IntegrationDef;
  status: LiveStatus;
  onConfigure: () => void;
  onTest?: () => void;
  onLogs?: () => void;
}) {
  const s = statusMeta[status];
  const disabled = status === "coming_soon";
  const logoUrl = getIntegrationLogoUrl(integration);
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!logoUrl && !imgFailed;

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg overflow-hidden",
            showImage ? "bg-white border" : cn("text-white font-bold text-sm", integration.logoColor),
          )}
        >
          {showImage ? (
            <img
              src={logoUrl!}
              alt={`${integration.name} logo`}
              className="h-8 w-8 object-contain"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : (
            integration.logoInitials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-sm leading-tight break-words" title={integration.name}>{integration.name}</h3>
            <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">v{integration.version}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{integration.vendor}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", s.className)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
          {s.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{integration.description}</p>

      {integration.features && (
        <div className="mt-3 flex flex-wrap gap-1">
          {integration.features.map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px] font-normal">{f}</Badge>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t">
        <Button size="sm" onClick={onConfigure} disabled={disabled} className="flex-1 min-w-[7rem]">
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          {status === "connected" ? "Editar" : "Configurar"}
        </Button>
        {onTest && !disabled && (
          <Button size="sm" variant="outline" onClick={onTest} title="Testar conexão">
            <Zap className="h-3.5 w-3.5" />
          </Button>
        )}
        {onLogs && (
          <Button size="sm" variant="outline" onClick={onLogs} title="Logs">
            <FileText className="h-3.5 w-3.5" />
          </Button>
        )}
        <a
          href={integration.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs hover:bg-accent"
          title="Documentação oficial"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
