import { useState } from "react";
import { Section } from "./Section";
import { SHOT, type ShotKey } from "./shots";

const VIEWS: { key: ShotKey; label: string }[] = [
  { key: "students", label: "Alunos" },
  { key: "finance", label: "Financeiro" },
  { key: "schedule", label: "Agenda" },
  { key: "graduations", label: "Graduações" },
];

/** Uma captura real por vez, em tamanho legível. */
export function RealScreenshots() {
  const [active, setActive] = useState<ShotKey>(VIEWS[0].key);
  const current = VIEWS.find((v) => v.key === active) ?? VIEWS[0];

  return (
    <Section id="prints" eyebrow="O sistema" title="Veja como é por dentro." description="Telas reais do Dojo Manager." className="bg-neutral-50">
      <div className="mb-6 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Telas do sistema">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={v.key === active}
            onClick={() => setActive(v.key)}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F] ${
              v.key === active ? "bg-[#111111] text-white" : "bg-white text-[#111111]/65 hover:text-[#111111]"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
        <img
          src={SHOT[current.key]}
          alt={`Tela real de ${current.label} do AMT Dojo Manager`}
          className="block aspect-[16/10] w-full object-cover object-left-top"
          loading="lazy"
          decoding="async"
        />
      </div>
    </Section>
  );
}
