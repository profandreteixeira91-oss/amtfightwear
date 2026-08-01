import { Smartphone, IdCard, CalendarCheck, Wallet, Trophy, Bell, Video, MapPin } from "lucide-react";
import { Section, FadeIn } from "./Section";
import { CTABand } from "./CTABand";
import { SHOT } from "./shots";

const features = [
  { icon: IdCard, t: "Carteirinha digital", d: "Identificação do aluno com faixa, plano e situação atual." },
  { icon: CalendarCheck, t: "Grade de aulas", d: "Agenda completa do dojo direto no celular do aluno." },
  { icon: MapPin, t: "Check-in por localização", d: "Presença validada dentro do tatame, sem fraude." },
  { icon: Wallet, t: "Financeiro do aluno", d: "Mensalidades, boletos e PIX com link de pagamento." },
  { icon: Trophy, t: "Ranking de presença", d: "Competição saudável que aumenta a frequência." },
  { icon: Video, t: "Vídeos e evolução", d: "Lutas gravadas, graduações e histórico de evolução." },
  { icon: Bell, t: "Avisos push", d: "Comunicado do professor chega como notificação." },
  { icon: Smartphone, t: "Instalável (PWA)", d: "Vira ícone no celular, sem loja de aplicativos." },
];

export function StudentApp() {
  return (
    <Section
      id="app-aluno"
      eyebrow="Aplicativo do aluno"
      title="Seus alunos com a academia no bolso."
      description="Um aplicativo próprio para o seu dojo, instalável e com a sua marca — incluído no plano, sem custo extra."
      className="bg-[#0d0d0d] text-white"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <FadeIn className="mx-auto w-full max-w-[280px]">
          <div className="relative rounded-[2.5rem] border-[10px] border-[#1c1c1c] bg-[#1c1c1c] shadow-[0_40px_80px_-30px_rgba(193,18,31,0.4)]">
            <span className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/60" aria-hidden="true" />
            <img
              src={SHOT.studentApp}
              alt="Tela real do aplicativo do aluno do AMT Dojo Manager"
              loading="lazy"
              decoding="async"
              className="h-auto w-full rounded-[2rem]"
            />
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <FadeIn key={f.t} delay={i * 0.04}>
              <div className="flex h-full gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C1121F]/15 text-[#ff6b76]">
                  <f.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">{f.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{f.d}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      <CTABand variant="dark" title="Dê um aplicativo aos seus alunos hoje mesmo." />
    </Section>
  );
}
