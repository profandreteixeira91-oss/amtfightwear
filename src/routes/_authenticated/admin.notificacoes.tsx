import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Smartphone, ShieldCheck, Zap } from "lucide-react";
import { AdminPushCard } from "@/components/store/AdminPushCard";
import { AdminNotificationPrefsCard } from "@/components/store/AdminNotificationPrefsCard";
import { PageShell } from "@/components/common/PageShell";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  head: () => ({
    meta: [
      { title: "Central de Notificações | Admin AMT Fight Wear" },
      {
        name: "description",
        content: "Gerencie como você recebe alertas em tempo real sobre vendas, atendimento e o Dojo Manager.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StoreNotificationsPage,
});

function StoreNotificationsPage() {
  return (
    <PageShell
      eyebrow="Configurações"
      title="Central de Alertas"
      description="Ative o modo PWA e configure quais eventos devem notificar seus dispositivos em tempo real."
    >
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
              <Zap className="h-4 w-4" /> 1. Instalação & Ativação
            </div>
            <AdminPushCard />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
              <BellRing className="h-4 w-4" /> 2. Preferências de Envio
            </div>
            <AdminNotificationPrefsCard />
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-white/5 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <Smartphone className="h-5 w-5 text-primary" />
              Por que usar o PWA?
            </h3>
            <ul className="space-y-4">
              {[
                {
                  title: "Alertas Instantâneos",
                  desc: "Receba notificações push mesmo com o navegador fechado.",
                },
                {
                  title: "Acesso Rápido",
                  desc: "Ícone na tela de início para acesso direto ao painel.",
                },
                {
                  title: "Experiência Nativa",
                  desc: "Navegação mais fluida e sem barras de endereço do browser.",
                },
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-6">
            <h4 className="mb-2 text-sm font-bold text-amber-500">Atenção com o modo economia</h4>
            <p className="text-xs leading-relaxed text-amber-200/70">
              Em alguns dispositivos Android e iOS, o modo de "Economia de Energia" ou "Otimização de Bateria"
              pode atrasar ou bloquear notificações push. Para garantir o recebimento em tempo real,
              adicione o Admin AMT às exceções de bateria do seu sistema.
            </p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
