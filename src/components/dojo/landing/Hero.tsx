import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, ChevronDown, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import { SHOT, HERO_ROTATION } from "./shots";

const BADGES = ["14 dias grátis", "Sem cartão de crédito", "Sem fidelidade", "Configuração rápida"];

export function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % HERO_ROTATION.length), 3200);
    return () => clearInterval(t);
  }, []);
  const current = HERO_ROTATION[i];

  return (
    <section id="top" className="relative overflow-hidden px-4 pt-12 pb-16 md:px-6 md:pt-16 md:pb-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#C1121F]/5 blur-3xl" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#111" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <motion.div className="min-w-0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <DojoLogo className="mb-6 h-20 w-auto max-w-full sm:h-24 md:h-32 drop-shadow-[0_10px_30px_rgba(193,18,31,0.15)]" />

          <h1 className="hyphens-auto break-words text-[1.6rem] font-black uppercase leading-[1.06] tracking-tight text-[#111111] sm:text-4xl lg:text-[3.4rem]">
            Pare de perder tempo <span className="text-[#C1121F]">administrando</span> sua academia.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#111111]/65 md:text-lg">
            Automatize alunos, mensalidades, contratos, graduações, check-ins, financeiro, aplicativo do aluno e muito
            mais em uma única plataforma criada exclusivamente para academias de artes marciais.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <li
                key={b}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C1121F]/20 bg-[#C1121F]/5 px-3 py-1.5 text-xs font-semibold text-[#8d0d16]"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> {b}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="group min-h-12 rounded-full bg-[#C1121F] px-7 text-base font-bold text-white shadow-lg shadow-[#C1121F]/25 hover:bg-[#a30f1a]"
            >
              <a href="/dojo/auth">
                COMEÇAR TESTE GRATUITO
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-12 rounded-full border-black/15 bg-white px-6 font-semibold text-[#111111] hover:bg-black/5"
            >
              <a href="#prints">
                <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                ASSISTIR DEMONSTRAÇÃO
              </a>
            </Button>
          </div>

          <p className="mt-7 max-w-xl rounded-2xl border-l-2 border-[#C1121F] bg-white/70 p-4 text-sm leading-relaxed text-[#111111]/70">
            O <strong className="font-semibold text-[#111111]">único sistema criado exclusivamente para academias de
            artes marciais</strong> que reúne gestão completa, aplicativo do aluno, automação financeira, contratos
            digitais, marketing, check-ins inteligentes e integração com o ecossistema AMT Fight Wear.
          </p>
        </motion.div>

        {/* Mockup premium com capturas REAIS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative mx-auto min-w-0 w-full max-w-xl"
        >
          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-1.5 border-b border-black/5 bg-neutral-50 px-3 py-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#28c840]" />
              <span className="ml-3 min-w-0 truncate text-[11px] font-semibold uppercase tracking-wider text-[#111111]/50">
                AMT Dojo Manager · {current.label}
              </span>
            </div>
            <div className="relative aspect-[16/10] bg-neutral-100">
              <AnimatePresence mode="wait">
                <motion.img
                  key={current.key}
                  src={SHOT[current.key]}
                  alt={`Tela real de ${current.label} do AMT Dojo Manager`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute top-0 left-[-26%] h-full w-[170%] max-w-none object-cover object-top md:left-0 md:w-full"
                  fetchPriority="high"
                  decoding="async"
                />
              </AnimatePresence>
            </div>
          </div>

          {/* App do aluno real na frente */}
          <div className="absolute -bottom-8 -left-4 w-28 rounded-[1.6rem] border-4 border-[#111111] bg-[#111111] shadow-2xl sm:-left-8 sm:w-36">
            <img
              src={SHOT.studentApp}
              alt="Tela real do aplicativo do aluno do AMT Dojo Manager"
              className="h-auto w-full rounded-[1.25rem]"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
            {HERO_ROTATION.map((r, idx) => (
              <span
                key={r.key}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  idx === i ? "bg-[#C1121F] text-white" : "bg-black/5 text-[#111111]/50"
                }`}
              >
                {r.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <a
        href="#problemas"
        className="mx-auto mt-12 flex w-fit flex-col items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#111111]/45 transition-colors hover:text-[#C1121F]"
      >
        Role para ver como funciona
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <ChevronDown className="h-5 w-5" aria-hidden="true" />
        </motion.span>
      </a>
    </section>
  );
}
