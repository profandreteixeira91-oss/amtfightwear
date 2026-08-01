import { Factory, Headset, Lock, ShieldCheck, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGES = [
  { icon: ShieldCheck, label: "Compra segura" },
  { icon: Factory, label: "Produção própria" },
  { icon: Lock, label: "Pagamento seguro" },
  { icon: BadgeCheck, label: "Garantia de fabricação" },
  { icon: Headset, label: "Atendimento especializado" },
];

/**
 * Selos de confiança exibidos ao lado dos botões de compra.
 * Reutilizável em produto, carrinho e checkout.
 */
export function TrustBadges({
  className,
  variant = "grid",
}: {
  className?: string;
  variant?: "grid" | "list";
}) {
  if (variant === "list") {
    return (
      <ul className={cn("space-y-1.5", className)}>
        {BADGES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-3 sm:grid-cols-3",
        className,
      )}
    >
      {BADGES.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-2 text-[11px] font-semibold leading-tight text-muted-foreground"
        >
          <Icon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span className="min-w-0">{label}</span>
        </li>
      ))}
    </ul>
  );
}
