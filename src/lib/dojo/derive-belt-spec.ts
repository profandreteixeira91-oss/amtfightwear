/**
 * Deriva um BeltSpec estruturado a partir do estado "legado" de uma faixa
 * (nome + modalidade + color_hex + stripe_hex + max_degrees).
 *
 * Usado pelo Belt Studio para carregar o estado atual da faixa no editor
 * quando a coluna `visual` ainda está vazia — assim o editor abre com a
 * ilustração equivalente ao que já é renderizado no sistema em vez de
 * abrir "zerado".
 *
 * A lógica espelha as regras de `src/components/dojo/BeltVisual.tsx`.
 */
import type { BeltSpec } from "@/components/dojo/BeltSpecVisual";

const COLOR_NAMES: Record<string, string> = {
  branca: "#FFFFFF", branco: "#FFFFFF",
  cinza: "#9CA3AF", "cinza claro": "#D1D5DB", "cinza escuro": "#4B5563",
  preta: "#111111", preto: "#111111",
  amarela: "#FDD835", amarelo: "#FDD835",
  laranja: "#FB923C",
  verde: "#16A34A",
  azul: "#2563EB", "azul claro": "#60A5FA", "azul escuro": "#1E3A8A",
  roxa: "#7C3AED", roxo: "#7C3AED",
  marrom: "#78350F",
  vermelha: "#B71C1C", vermelho: "#B71C1C",
  rosa: "#EC4899",
  dourada: "#C5A657", dourado: "#C5A657",
  prata: "#C0C0C0",
};
const colorNameToHex = (raw: string): string | null => {
  const key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return COLOR_NAMES[key] ?? null;
};

export type BeltLegacyInput = {
  name?: string | null;
  modality?: string | null;
  color_hex?: string | null;
  stripe_hex?: string | null;
  max_degrees?: number | null;
};

export function deriveBeltSpec(belt: BeltLegacyInput): BeltSpec {
  const n = (belt.name ?? "").trim();
  const mod = (belt.modality ?? "").toString().toLowerCase().trim();
  const isJiuJitsu = mod === "" || mod === "jiu-jitsu" || mod === "jiujitsu" || mod === "bjj";
  const color = belt.color_hex || "#F5F5F5";
  const stripe = belt.stripe_hex ?? null;
  const hasTrim = /aparador/i.test(n);

  // --- Preta family (BJJ) ---
  const isPretaPlain = /^preta$/i.test(n);
  const isPretaAparador = /^preta\s+com\s+aparador/i.test(n);
  const pretaGrauMatch = n.match(/^preta\s+(\d)\s*grau/i);
  const isPretaGrau = !!pretaGrauMatch;
  if (isJiuJitsu && (isPretaPlain || isPretaAparador || isPretaGrau)) {
    return {
      segments: [{ color: "#111111", widthPct: 55 }],
      ...(isPretaAparador || isPretaGrau
        ? { dividers: [{ color: "#FFFFFF", widthPx: 6, side: "before-tip" as const }] }
        : {}),
      tip: { color: "#D32F2F", widthPct: 38, stripeColor: "#FFFFFF" },
    };
  }

  // --- High rank (BJJ) ---
  if (isJiuJitsu && /^vermelha e preta$/i.test(n)) {
    return {
      segments: [
        { color: "#B71C1C", flex: 1 }, { color: "#111111", flex: 1 },
        { color: "#B71C1C", flex: 1 }, { color: "#111111", flex: 1 },
      ],
      dividers: [{ color: "#8A8A8A", widthPx: 10, side: "before-tip" }],
      tip: { color: "#FFFFFF", widthPct: 42, stripeColor: "#B71C1C", forcedStripes: 7 },
    };
  }
  if (isJiuJitsu && /^vermelha e branca$/i.test(n)) {
    return {
      segments: [
        { color: "#B71C1C", flex: 1 }, { color: "#FFFFFF", flex: 1 },
        { color: "#B71C1C", flex: 1 }, { color: "#FFFFFF", flex: 1 },
      ],
      dividers: [{ color: "#8A8A8A", widthPx: 10, side: "before-tip" }],
      tip: { color: "#FFFFFF", widthPct: 48, stripeColor: "#B71C1C", forcedStripes: 8 },
    };
  }
  if (isJiuJitsu && /^vermelha$/i.test(n)) {
    return {
      segments: [{ color: "#B71C1C", flex: 1 }],
      dividers: [{ color: "#C5A657", widthPx: 10, side: "before-tip" }],
      tip: { color: "#FFFFFF", widthPct: 54, stripeColor: "#B71C1C", forcedStripes: 9 },
    };
  }

  // --- Judô Preta (Dan) ---
  const isJudo = /judo|judô/i.test(mod);
  if (isJudo && /^preta/i.test(n)) {
    return {
      segments: [{ color: "#111111", flex: 1 }],
      tip: { color: "#111111", widthPct: 20, stripeColor: "#D32F2F" },
    };
  }

  // --- Non-BJJ com "ponta {cor}" ---
  const pontaMatch = n.match(/ponta[s]?\s+([a-zç\s]+?)(?:\s+\d.*)?$/i);
  const pontaColor = pontaMatch ? colorNameToHex(pontaMatch[1].trim()) : null;
  if (!isJiuJitsu && pontaColor) {
    return {
      segments: [
        { color: pontaColor, widthPct: 22 },
        { color, flex: 1 },
        { color: pontaColor, widthPct: 22 },
      ],
    };
  }

  // --- Non-BJJ genérico ---
  if (!isJiuJitsu) {
    return {
      segments: [{ color, flex: 1 }],
      ...(stripe && hasTrim ? { aparador: { color: stripe, sizePct: 18 } } : {}),
      ...(stripe && !hasTrim ? { centerBand: { color: stripe, heightPct: 33 } } : {}),
    };
  }

  // --- Jiu-Jitsu padrão (ponteira preta com listras brancas) ---
  return {
    segments: [{ color, flex: 1 }],
    ...(stripe && hasTrim ? { aparador: { color: stripe, sizePct: 18 } } : {}),
    ...(stripe && !hasTrim ? { centerBand: { color: stripe, heightPct: 33 } } : {}),
    tip: { color: "#111111", widthPct: 38, stripeColor: "#FFFFFF" },
  };
}
