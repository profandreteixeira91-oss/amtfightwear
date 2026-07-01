import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bot, User, Wrench } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSalesConversation } from "@/lib/sales.functions";

export const Route = createFileRoute("/_authenticated/sales/conversations/$id")({
  component: ConversationDetailPage,
});

function ConversationDetailPage() {
  const { id } = Route.useParams();
  const get = useServerFn(getSalesConversation);
  const { data, isLoading } = useQuery({
    queryKey: ["sales-conversation", id],
    queryFn: () => get({ data: { id } }),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/sales/conversations">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
      <PageHeader
        title={data?.conv?.customer_name || data?.conv?.external_id || "Conversa"}
        description={`${data?.conv?.channel ?? ""} · ${data?.conv?.customer_email ?? data?.conv?.customer_phone ?? "—"}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <SectionCard title="Histórico">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.messages ?? []).map((m) => {
                const parts = (m.parts ?? {}) as { text?: string };
                const isUser = m.role === "user";
                const isTool = m.role === "tool";
                const Icon = isUser ? User : isTool ? Wrench : Bot;
                return (
                  <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
                    {!isUser && (
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : isTool
                            ? "bg-muted/60 font-mono text-xs"
                            : "bg-muted"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{parts.text ?? JSON.stringify(parts)}</div>
                      <div className="mt-1 text-[10px] opacity-70">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    {isUser && (
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Carrinho">
          {!data?.cart ? (
            <p className="text-sm text-muted-foreground">Nenhum carrinho iniciado.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{data.cart.status}</Badge>
                <span className="font-semibold">
                  R$ {Number(data.cart.total_estimate ?? 0).toFixed(2)}
                </span>
              </div>
              <ul className="space-y-1">
                {(data.cart.sales_cart_items ?? []).map((it, i: number) => (
                  <li key={i} className="flex justify-between text-xs">
                    <span>
                      {it.quantity}× {it.product_name}
                      {it.size ? ` (${it.size})` : ""}
                    </span>
                    <span>R$ {Number(it.unit_price).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {data.cart.checkout_url && (
                <a
                  href={data.cart.checkout_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate rounded bg-primary px-3 py-2 text-center text-xs font-medium text-primary-foreground"
                >
                  Abrir link de checkout
                </a>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
