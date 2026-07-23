import dojoVideoAsset from "@/assets/dojo-manager-square.mp4.asset.json";
import dojoWordmarkAsset from "@/assets/amt-dojo-manager-wordmark.png.asset.json";

const FEATURES = [
  "Gestão completa de alunos e atletas",
  "Controle de graduações e histórico de evolução",
  "Cadastro de professores e instrutores",
  "Controle de turmas e horários de treino",
  "Gestão financeira e mensalidades",
  "Cobranças e integrações de pagamento",
  "Avaliações e acompanhamento de desempenho",
  "Dashboard com indicadores da academia",
  "Comunicação e organização da equipe",
  "Relatórios administrativos",
];

export function DojoManagerPromo() {
  return (
    <section id="dojo-manager" aria-labelledby="dojo-manager-promo" className="mx-auto max-w-7xl px-4 py-12 scroll-mt-32">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-background shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]">
        {/* Accent bar */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        {/* Decorative shapes */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-foreground/[0.03] blur-3xl" />

        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-12 lg:p-14">
          {/* Copy */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Novo · SaaS AMT
            </div>

            <h2 id="dojo-manager-promo" className="mt-5 text-3xl font-black leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              AMT <span className="text-primary">Dojo Manager</span>
            </h2>

            <p className="mt-4 max-w-xl text-lg font-semibold leading-snug text-foreground/80 sm:text-xl">
              O sistema completo para transformar a gestão da sua academia de Jiu-Jitsu.
            </p>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Tenha controle total da sua academia em uma única plataforma. Gerencie alunos, graduações, pagamentos, avaliações, treinos, professores, turmas e muito mais com uma ferramenta criada especialmente para academias de artes marciais.
            </p>

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                  <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-primary">
                    <path fill="currentColor" d="M7.629 13.233 3.9 9.503l-1.414 1.414 5.143 5.143 10-10L16.214 4.646z" />
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="https://dojomanager.amtfightwear.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/35 hover:brightness-110"
              >
                Conheça o AMT Dojo Manager
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Feito por atletas, para academias
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative flex items-center justify-center">
            <div aria-hidden className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-foreground/5" />
            <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <img
                src={dojoPreview}
                alt="Pré-visualização do painel do AMT Dojo Manager, sistema de gestão para academias de jiu-jitsu"
                width={1280}
                height={960}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            {/* Floating stat chips */}
            <div className="pointer-events-none absolute -left-2 top-6 hidden rounded-xl border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur sm:block">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alunos ativos</div>
              <div className="text-xl font-black text-foreground">+1.200</div>
            </div>
            <div className="pointer-events-none absolute -right-2 bottom-6 hidden rounded-xl border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur sm:block">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Receita mensal</div>
              <div className="text-xl font-black text-foreground">100% no controle</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
