import { useState } from "react";
import { cn } from "@/lib/utils";
import { Section } from "./Section";
import { ShotFrame } from "./ShotFrame";
import { SHOT, type ShotKey } from "./shots";

const TABS: { key: ShotKey; label: string }[] = [
  { key: "students", label: "Alunos" },
  { key: "finance", label: "Financeiro" },
  { key: "schedule", label: "Agenda" },
  { key: "graduations", label: "Graduações" },
];

export function RealScreenshots() {
  const [active, setActive] = useState<ShotKey>("students");
  const label = TABS.find((t) => t.key === active)?.label ?? "";

  return (
    <Section id="prints" eyebrow="Telas do sistema" title="Veja o Dojo Manager por dentro." className="bg-neutral-50">
      <div role="tablist" aria-label="Telas do sistema" className="mb-6 flex flex-wrap justify-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]",
              active === t.key ? "bg-[#C1121F] text-white" : "bg-white text-[#111111]/70 hover:bg-black/5",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <ShotFrame src={SHOT[active]} alt={`Tela real de ${label} do AMT Dojo Manager`} />
      </div>
    </Section>
  );
}
