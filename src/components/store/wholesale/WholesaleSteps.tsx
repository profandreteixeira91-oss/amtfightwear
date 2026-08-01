import { ShoppingCart, Palette, ClipboardCheck, CreditCard, Factory, Truck } from "lucide-react";

const STEPS = [
  { label: "Escolha os produtos", icon: ShoppingCart },
  { label: "Personalize", icon: Palette },
  { label: "Revise o pedido", icon: ClipboardCheck },
  { label: "Pagamento", icon: CreditCard },
  { label: "Produção", icon: Factory },
  { label: "Entrega", icon: Truck },
];

/** Trilha do processo de compra — reduz a ansiedade do comprador B2B. */
export function WholesaleSteps({ current = 0 }: { current?: number }) {
  return (
    <section aria-label="Etapas da compra" className="border-b bg-muted/40">
      <ol className="mx-auto flex max-w-7xl snap-x gap-2 overflow-x-auto px-4 py-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STEPS.map((s, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <li
              key={s.label}
              aria-current={active ? "step" : undefined}
              className={`flex min-w-[9.5rem] flex-1 snap-start items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : done
                  ? "border-primary/30 bg-background text-muted-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              <s.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">
                <span className="mr-1 tabular-nums opacity-60">{i + 1}.</span>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
