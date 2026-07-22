import type { EditorSchema, AnyElement } from "@/components/dojo/certificate-editor/types";
import { makeId } from "@/components/dojo/certificate-editor/types";
import { PAGE_PRESETS } from "./studio-store";

export type CertificatePreset = {
  id: string;
  name: string;
  category: string;
  description: string;
  accent: string;
  build: () => EditorSchema;
};

const el = (e: Partial<AnyElement> & { kind: AnyElement["kind"] }, z: number): AnyElement =>
  ({ id: makeId(), rotation: 0, opacity: 1, z, ...(e as any) } as AnyElement);

function landscape(bg: string, elements: AnyElement[]): EditorSchema {
  const p = PAGE_PRESETS.a4_landscape;
  return { version: 2, page: { width: p.width, height: p.height, background: bg, margin: 60 }, elements };
}
function portrait(bg: string, elements: AnyElement[]): EditorSchema {
  const p = PAGE_PRESETS.a4_portrait;
  return { version: 2, page: { width: p.width, height: p.height, background: bg, margin: 60 }, elements };
}

/** 1. Clássico Serif — bordas duplas, tipografia serifada */
const classicSerif = (): EditorSchema =>
  landscape("#fdfaf3", [
    el({ kind: "rect", x: 4, y: 4, w: 92, h: 92, fill: "transparent", stroke: "#8a6a2a", strokeWidth: 4, radius: 4 }, 1),
    el({ kind: "rect", x: 6, y: 6, w: 88, h: 88, fill: "transparent", stroke: "#c9a24a", strokeWidth: 1, radius: 2 }, 2),
    el({ kind: "text", text: "CERTIFICADO", x: 50, y: 16, fontSize: 96, color: "#3b2a12", bold: true, align: "center", fontFamily: "Cinzel", uppercase: true, letterSpacing: 8 }, 3),
    el({ kind: "text", text: "de Graduação", x: 50, y: 26, fontSize: 32, color: "#8a6a2a", align: "center", fontFamily: "Cormorant Garamond", italic: true }, 4),
    el({ kind: "line", x: 50, y: 32, w: 30, h: 0.3, fill: "#c9a24a" }, 5),
    el({ kind: "text", text: "Certificamos que", x: 50, y: 40, fontSize: 26, color: "#5a4a2a", align: "center", fontFamily: "Cormorant Garamond" }, 6),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 51, fontSize: 76, color: "#1a1204", bold: true, align: "center", fontFamily: "Playfair Display" }, 7),
    el({ kind: "text", text: "concluiu com êxito a graduação de {{aluno_faixa}} em {{aluno_modalidade}}, demonstrando dedicação, disciplina e comprometimento.", x: 50, y: 64, w: 70, fontSize: 22, color: "#3b2a12", align: "center", fontFamily: "Cormorant Garamond", lineHeight: 1.5 }, 8),
    el({ kind: "text", text: "{{data_atual}}", x: 28, y: 84, fontSize: 18, color: "#5a4a2a", align: "center", fontFamily: "Inter" }, 9),
    el({ kind: "line", x: 28, y: 81, w: 22, h: 0.15, fill: "#5a4a2a" }, 10),
    el({ kind: "text", text: "Data", x: 28, y: 87, fontSize: 14, color: "#8a6a2a", align: "center", fontFamily: "Inter" }, 11),
    el({ kind: "text", text: "{{professor_nome}}", x: 72, y: 84, fontSize: 18, color: "#5a4a2a", bold: true, align: "center", fontFamily: "Inter" }, 12),
    el({ kind: "line", x: 72, y: 81, w: 22, h: 0.15, fill: "#5a4a2a" }, 13),
    el({ kind: "text", text: "Professor Responsável", x: 72, y: 87, fontSize: 14, color: "#8a6a2a", align: "center", fontFamily: "Inter" }, 14),
  ]);

/** 2. Moderno Minimalista */
const modernMinimal = (): EditorSchema =>
  landscape("#ffffff", [
    el({ kind: "rect", x: 0, y: 0, w: 100, h: 8, fill: "#111827" }, 1),
    el({ kind: "rect", x: 0, y: 92, w: 100, h: 8, fill: "#111827" }, 2),
    el({ kind: "text", text: "CERTIFICADO", x: 50, y: 22, fontSize: 24, color: "#6b7280", align: "center", fontFamily: "Inter", letterSpacing: 12, uppercase: true }, 3),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 40, fontSize: 84, color: "#111827", bold: true, align: "center", fontFamily: "Montserrat" }, 4),
    el({ kind: "line", x: 50, y: 52, w: 12, h: 0.4, fill: "#111827" }, 5),
    el({ kind: "text", text: "conquistou a graduação de", x: 50, y: 58, fontSize: 20, color: "#6b7280", align: "center", fontFamily: "Inter" }, 6),
    el({ kind: "text", text: "{{aluno_faixa}}", x: 50, y: 66, fontSize: 44, color: "#111827", bold: true, align: "center", fontFamily: "Montserrat", uppercase: true }, 7),
    el({ kind: "text", text: "em {{aluno_modalidade}}", x: 50, y: 74, fontSize: 18, color: "#6b7280", align: "center", fontFamily: "Inter" }, 8),
    el({ kind: "text", text: "{{data_atual}}", x: 20, y: 86, fontSize: 14, color: "#111827", align: "center", fontFamily: "Inter" }, 9),
    el({ kind: "text", text: "{{professor_nome}}", x: 80, y: 86, fontSize: 14, color: "#111827", align: "center", fontFamily: "Inter", bold: true }, 10),
  ]);

/** 3. Elegante Dourado */
const elegantGold = (): EditorSchema =>
  landscape("#0b0b0d", [
    el({ kind: "rect", x: 6, y: 6, w: 88, h: 88, fill: "transparent", stroke: "#d4af37", strokeWidth: 2, radius: 2 }, 1),
    el({ kind: "text", text: "★", x: 50, y: 14, fontSize: 40, color: "#d4af37", align: "center", fontFamily: "Playfair Display" }, 2),
    el({ kind: "text", text: "CERTIFICADO DE HONRA", x: 50, y: 22, fontSize: 40, color: "#d4af37", bold: true, align: "center", fontFamily: "Cinzel", letterSpacing: 6, uppercase: true }, 3),
    el({ kind: "line", x: 50, y: 30, w: 25, h: 0.2, fill: "#d4af37" }, 4),
    el({ kind: "text", text: "Concedido a", x: 50, y: 38, fontSize: 22, color: "#e5e7eb", align: "center", fontFamily: "Cormorant Garamond", italic: true }, 5),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 50, fontSize: 84, color: "#ffffff", bold: true, align: "center", fontFamily: "Great Vibes" }, 6),
    el({ kind: "text", text: "por concluir com distinção a graduação de {{aluno_faixa}} em {{aluno_modalidade}}.", x: 50, y: 66, w: 70, fontSize: 20, color: "#d1d5db", align: "center", fontFamily: "Cormorant Garamond", lineHeight: 1.5 }, 7),
    el({ kind: "text", text: "{{professor_nome}}", x: 50, y: 82, fontSize: 20, color: "#d4af37", align: "center", fontFamily: "Playfair Display", italic: true }, 8),
    el({ kind: "line", x: 50, y: 79, w: 20, h: 0.15, fill: "#d4af37" }, 9),
    el({ kind: "text", text: "Mestre Responsável", x: 50, y: 86, fontSize: 13, color: "#9ca3af", align: "center", fontFamily: "Inter", uppercase: true, letterSpacing: 3 }, 10),
  ]);

/** 4. Rústico Marcial */
const rusticMartial = (): EditorSchema =>
  landscape("#f4ecdc", [
    el({ kind: "rect", x: 0, y: 0, w: 100, h: 100, fill: "#f4ecdc" }, 1),
    el({ kind: "rect", x: 3, y: 3, w: 94, h: 94, fill: "transparent", stroke: "#7a1f1f", strokeWidth: 6 }, 2),
    el({ kind: "rect", x: 5, y: 5, w: 90, h: 90, fill: "transparent", stroke: "#7a1f1f", strokeWidth: 1 }, 3),
    el({ kind: "text", text: "武", x: 50, y: 14, fontSize: 56, color: "#7a1f1f", align: "center", fontFamily: "Cinzel", bold: true }, 4),
    el({ kind: "text", text: "CERTIFICADO DE GRADUAÇÃO", x: 50, y: 25, fontSize: 34, color: "#3b0f0f", bold: true, align: "center", fontFamily: "Bebas Neue", letterSpacing: 6 }, 5),
    el({ kind: "line", x: 50, y: 30, w: 40, h: 0.25, fill: "#7a1f1f" }, 6),
    el({ kind: "text", text: "Outorgado ao praticante", x: 50, y: 38, fontSize: 22, color: "#3b0f0f", align: "center", fontFamily: "Merriweather", italic: true }, 7),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 50, fontSize: 72, color: "#3b0f0f", bold: true, align: "center", fontFamily: "Playfair Display" }, 8),
    el({ kind: "text", text: "que conquistou a graduação de {{aluno_faixa}} em {{aluno_modalidade}}, mantendo firmes os princípios da disciplina, respeito e honra.", x: 50, y: 65, w: 72, fontSize: 20, color: "#3b0f0f", align: "center", fontFamily: "Merriweather", lineHeight: 1.5 }, 9),
    el({ kind: "text", text: "{{academia_cidade}}, {{data_atual}}", x: 50, y: 82, fontSize: 16, color: "#3b0f0f", align: "center", fontFamily: "Merriweather", italic: true }, 10),
    el({ kind: "text", text: "{{professor_nome}}", x: 50, y: 88, fontSize: 18, color: "#7a1f1f", bold: true, align: "center", fontFamily: "Bebas Neue", letterSpacing: 3 }, 11),
  ]);

/** 5. Corporate Blue */
const corporateBlue = (): EditorSchema =>
  landscape("#ffffff", [
    el({ kind: "rect", x: 0, y: 0, w: 30, h: 100, fill: "#1e3a8a" }, 1),
    el({ kind: "rect", x: 0, y: 0, w: 30, h: 8, fill: "#3b82f6" }, 2),
    el({ kind: "rect", x: 0, y: 92, w: 30, h: 8, fill: "#3b82f6" }, 3),
    el({ kind: "text", text: "CERTIFICADO", x: 15, y: 45, fontSize: 28, color: "#ffffff", bold: true, align: "center", fontFamily: "Montserrat", uppercase: true, letterSpacing: 3 }, 4),
    el({ kind: "text", text: "DE CONCLUSÃO", x: 15, y: 52, fontSize: 14, color: "#93c5fd", align: "center", fontFamily: "Inter", letterSpacing: 4 }, 5),
    el({ kind: "text", text: "{{academia_nome}}", x: 65, y: 18, fontSize: 22, color: "#1e3a8a", bold: true, align: "center", fontFamily: "Montserrat" }, 6),
    el({ kind: "line", x: 65, y: 22, w: 30, h: 0.2, fill: "#3b82f6" }, 7),
    el({ kind: "text", text: "Certificamos que", x: 65, y: 32, fontSize: 20, color: "#475569", align: "center", fontFamily: "Inter" }, 8),
    el({ kind: "text", text: "{{aluno_nome}}", x: 65, y: 45, fontSize: 58, color: "#0f172a", bold: true, align: "center", fontFamily: "Montserrat" }, 9),
    el({ kind: "text", text: "concluiu com êxito o programa de {{aluno_modalidade}}, alcançando a graduação de {{aluno_faixa}}.", x: 65, y: 60, w: 55, fontSize: 18, color: "#334155", align: "center", fontFamily: "Inter", lineHeight: 1.5 }, 10),
    el({ kind: "text", text: "{{data_atual}}", x: 50, y: 82, fontSize: 14, color: "#475569", align: "center", fontFamily: "Inter" }, 11),
    el({ kind: "text", text: "{{professor_nome}}", x: 80, y: 82, fontSize: 14, color: "#0f172a", bold: true, align: "center", fontFamily: "Inter" }, 12),
    el({ kind: "line", x: 50, y: 80, w: 15, h: 0.15, fill: "#475569" }, 13),
    el({ kind: "line", x: 80, y: 80, w: 15, h: 0.15, fill: "#475569" }, 14),
  ]);

/** 6. Retrato Vintage */
const portraitVintage = (): EditorSchema =>
  portrait("#f7f1e1", [
    el({ kind: "rect", x: 5, y: 4, w: 90, h: 92, fill: "transparent", stroke: "#6b4423", strokeWidth: 3 }, 1),
    el({ kind: "rect", x: 7, y: 6, w: 86, h: 88, fill: "transparent", stroke: "#a67c3a", strokeWidth: 1 }, 2),
    el({ kind: "text", text: "❦", x: 50, y: 10, fontSize: 36, color: "#6b4423", align: "center", fontFamily: "Cinzel" }, 3),
    el({ kind: "text", text: "CERTIFICADO", x: 50, y: 16, fontSize: 54, color: "#4a2f14", bold: true, align: "center", fontFamily: "Cinzel", letterSpacing: 6, uppercase: true }, 4),
    el({ kind: "text", text: "de Mérito", x: 50, y: 22, fontSize: 26, color: "#6b4423", align: "center", fontFamily: "Cormorant Garamond", italic: true }, 5),
    el({ kind: "line", x: 50, y: 26, w: 30, h: 0.3, fill: "#a67c3a" }, 6),
    el({ kind: "text", text: "Este certificado é concedido a", x: 50, y: 33, fontSize: 20, color: "#4a2f14", align: "center", fontFamily: "Cormorant Garamond" }, 7),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 42, fontSize: 54, color: "#2a1a08", bold: true, align: "center", fontFamily: "Playfair Display" }, 8),
    el({ kind: "line", x: 50, y: 48, w: 40, h: 0.2, fill: "#a67c3a" }, 9),
    el({ kind: "text", text: "pela conquista da graduação de {{aluno_faixa}} em {{aluno_modalidade}}, com honra, disciplina e dedicação.", x: 50, y: 58, w: 70, fontSize: 20, color: "#4a2f14", align: "center", fontFamily: "Cormorant Garamond", lineHeight: 1.6 }, 10),
    el({ kind: "text", text: "{{academia_cidade}}, {{data_atual}}", x: 50, y: 78, fontSize: 16, color: "#6b4423", align: "center", fontFamily: "Cormorant Garamond", italic: true }, 11),
    el({ kind: "text", text: "{{professor_nome}}", x: 50, y: 88, fontSize: 18, color: "#4a2f14", bold: true, align: "center", fontFamily: "Playfair Display" }, 12),
    el({ kind: "line", x: 50, y: 86, w: 30, h: 0.15, fill: "#6b4423" }, 13),
    el({ kind: "text", text: "Professor Responsável", x: 50, y: 91, fontSize: 12, color: "#6b4423", align: "center", fontFamily: "Inter", letterSpacing: 3, uppercase: true }, 14),
  ]);

/** 7. Faixa Preta — celebração */
const blackBelt = (): EditorSchema =>
  landscape("#111111", [
    el({ kind: "rect", x: 0, y: 0, w: 100, h: 100, fill: "#111111" }, 1),
    el({ kind: "rect", x: 0, y: 44, w: 100, h: 12, fill: "#000000" }, 2),
    el({ kind: "rect", x: 88, y: 44, w: 8, h: 12, fill: "#b91c1c" }, 3),
    el({ kind: "text", text: "CERTIFICADO DE FAIXA", x: 50, y: 18, fontSize: 32, color: "#e5e7eb", bold: true, align: "center", fontFamily: "Bebas Neue", letterSpacing: 8 }, 4),
    el({ kind: "text", text: "{{aluno_faixa}}", x: 50, y: 30, fontSize: 60, color: "#b91c1c", bold: true, align: "center", fontFamily: "Cinzel", uppercase: true, letterSpacing: 10 }, 5),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 68, fontSize: 68, color: "#ffffff", bold: true, align: "center", fontFamily: "Playfair Display" }, 6),
    el({ kind: "text", text: "conquista a graduação máxima em {{aluno_modalidade}}.", x: 50, y: 78, w: 70, fontSize: 20, color: "#d1d5db", align: "center", fontFamily: "Cormorant Garamond", italic: true }, 7),
    el({ kind: "text", text: "{{data_atual}}", x: 25, y: 90, fontSize: 14, color: "#9ca3af", align: "center", fontFamily: "Inter", uppercase: true, letterSpacing: 3 }, 8),
    el({ kind: "text", text: "{{professor_nome}}", x: 75, y: 90, fontSize: 14, color: "#e5e7eb", bold: true, align: "center", fontFamily: "Inter", uppercase: true, letterSpacing: 3 }, 9),
  ]);

/** 8. Seminário / Evento */
const seminar = (): EditorSchema =>
  landscape("#fef7ec", [
    el({ kind: "rect", x: 0, y: 0, w: 100, h: 20, fill: "#c2410c" }, 1),
    el({ kind: "text", text: "SEMINÁRIO", x: 50, y: 8, fontSize: 40, color: "#ffffff", bold: true, align: "center", fontFamily: "Bebas Neue", letterSpacing: 10 }, 2),
    el({ kind: "text", text: "{{aluno_modalidade}}", x: 50, y: 15, fontSize: 18, color: "#fed7aa", align: "center", fontFamily: "Inter", letterSpacing: 6, uppercase: true }, 3),
    el({ kind: "text", text: "Certificado de Participação", x: 50, y: 30, fontSize: 28, color: "#7c2d12", align: "center", fontFamily: "Playfair Display", italic: true }, 4),
    el({ kind: "line", x: 50, y: 35, w: 25, h: 0.25, fill: "#c2410c" }, 5),
    el({ kind: "text", text: "Certificamos que", x: 50, y: 42, fontSize: 22, color: "#7c2d12", align: "center", fontFamily: "Inter" }, 6),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 54, fontSize: 66, color: "#431407", bold: true, align: "center", fontFamily: "Montserrat" }, 7),
    el({ kind: "text", text: "participou do seminário ministrado por {{professor_nome}}, contribuindo com dedicação e presença ativa.", x: 50, y: 68, w: 72, fontSize: 20, color: "#7c2d12", align: "center", fontFamily: "Inter", lineHeight: 1.5 }, 8),
    el({ kind: "text", text: "{{academia_cidade}} · {{data_atual}}", x: 50, y: 84, fontSize: 16, color: "#c2410c", bold: true, align: "center", fontFamily: "Inter", uppercase: true, letterSpacing: 4 }, 9),
  ]);

/** 9. Curso Técnico */
const technicalCourse = (): EditorSchema =>
  landscape("#ffffff", [
    el({ kind: "rect", x: 0, y: 0, w: 100, h: 100, fill: "#ffffff" }, 1),
    el({ kind: "rect", x: 0, y: 0, w: 8, h: 100, fill: "#065f46" }, 2),
    el({ kind: "rect", x: 92, y: 0, w: 8, h: 100, fill: "#065f46" }, 3),
    el({ kind: "text", text: "CURSO CONCLUÍDO", x: 50, y: 14, fontSize: 20, color: "#059669", align: "center", fontFamily: "Inter", letterSpacing: 8, uppercase: true, bold: true }, 4),
    el({ kind: "text", text: "Certificado", x: 50, y: 24, fontSize: 68, color: "#064e3b", bold: true, align: "center", fontFamily: "DM Serif Display" }, 5),
    el({ kind: "line", x: 50, y: 32, w: 15, h: 0.3, fill: "#059669" }, 6),
    el({ kind: "text", text: "Concedido a", x: 50, y: 40, fontSize: 20, color: "#374151", align: "center", fontFamily: "Inter" }, 7),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 50, fontSize: 60, color: "#064e3b", bold: true, align: "center", fontFamily: "Playfair Display" }, 8),
    el({ kind: "text", text: "pela conclusão do curso de {{aluno_modalidade}}, com aproveitamento e frequência conforme as normas da academia.", x: 50, y: 65, w: 70, fontSize: 20, color: "#374151", align: "center", fontFamily: "Inter", lineHeight: 1.5 }, 9),
    el({ kind: "text", text: "{{data_atual}}", x: 30, y: 84, fontSize: 15, color: "#374151", align: "center", fontFamily: "Inter" }, 10),
    el({ kind: "line", x: 30, y: 82, w: 18, h: 0.15, fill: "#374151" }, 11),
    el({ kind: "text", text: "{{professor_nome}}", x: 70, y: 84, fontSize: 15, color: "#064e3b", bold: true, align: "center", fontFamily: "Inter" }, 12),
    el({ kind: "line", x: 70, y: 82, w: 18, h: 0.15, fill: "#374151" }, 13),
  ]);

/** 10. Kids / Infantil */
const kids = (): EditorSchema =>
  landscape("#eff6ff", [
    el({ kind: "rect", x: 4, y: 4, w: 92, h: 92, fill: "#ffffff", stroke: "#2563eb", strokeWidth: 6, radius: 24 }, 1),
    el({ kind: "circle", x: 12, y: 14, w: 8, h: 8, fill: "#fbbf24" }, 2),
    el({ kind: "circle", x: 88, y: 14, w: 8, h: 8, fill: "#ef4444" }, 3),
    el({ kind: "circle", x: 12, y: 86, w: 8, h: 8, fill: "#22c55e" }, 4),
    el({ kind: "circle", x: 88, y: 86, w: 8, h: 8, fill: "#a855f7" }, 5),
    el({ kind: "text", text: "★ SUPER ALUNO ★", x: 50, y: 18, fontSize: 40, color: "#fbbf24", bold: true, align: "center", fontFamily: "Bebas Neue", letterSpacing: 4 }, 6),
    el({ kind: "text", text: "Certificado", x: 50, y: 28, fontSize: 56, color: "#1d4ed8", bold: true, align: "center", fontFamily: "Poppins" }, 7),
    el({ kind: "text", text: "Parabéns", x: 50, y: 40, fontSize: 26, color: "#2563eb", align: "center", fontFamily: "Dancing Script", italic: true }, 8),
    el({ kind: "text", text: "{{aluno_nome}}", x: 50, y: 52, fontSize: 62, color: "#0f172a", bold: true, align: "center", fontFamily: "Poppins" }, 9),
    el({ kind: "text", text: "Por sua dedicação e conquista da faixa {{aluno_faixa}} em {{aluno_modalidade}}! Você é demais! 🥋", x: 50, y: 68, w: 70, fontSize: 22, color: "#1e40af", align: "center", fontFamily: "Poppins", lineHeight: 1.5 }, 10),
    el({ kind: "text", text: "{{data_atual}}", x: 30, y: 86, fontSize: 15, color: "#2563eb", bold: true, align: "center", fontFamily: "Poppins" }, 11),
    el({ kind: "text", text: "{{professor_nome}}", x: 70, y: 86, fontSize: 15, color: "#2563eb", bold: true, align: "center", fontFamily: "Poppins" }, 12),
  ]);

export const CERTIFICATE_PRESETS: CertificatePreset[] = [
  { id: "classic-serif", name: "Clássico Serif", category: "graduacao", description: "Bordas duplas, tipografia serifada e tons de pergaminho.", accent: "#c9a24a", build: classicSerif },
  { id: "modern-minimal", name: "Moderno Minimalista", category: "graduacao", description: "Layout limpo, tipografia sans e barras superior/inferior.", accent: "#111827", build: modernMinimal },
  { id: "elegant-gold", name: "Elegante Dourado", category: "graduacao", description: "Fundo escuro com dourado e caligrafia manuscrita.", accent: "#d4af37", build: elegantGold },
  { id: "rustic-martial", name: "Rústico Marcial", category: "graduacao", description: "Papel envelhecido com ideograma e moldura vermelha.", accent: "#7a1f1f", build: rusticMartial },
  { id: "corporate-blue", name: "Corporativo Azul", category: "curso", description: "Barra lateral azul, ideal para cursos institucionais.", accent: "#1e3a8a", build: corporateBlue },
  { id: "portrait-vintage", name: "Retrato Vintage", category: "graduacao", description: "Orientação retrato, moldura clássica e ornamentos.", accent: "#6b4423", build: portraitVintage },
  { id: "black-belt", name: "Faixa Preta", category: "graduacao", description: "Design sóbrio para celebrar graduações máximas.", accent: "#b91c1c", build: blackBelt },
  { id: "seminar", name: "Seminário", category: "seminario", description: "Cabeçalho impactante para eventos e workshops.", accent: "#c2410c", build: seminar },
  { id: "technical-course", name: "Curso Técnico", category: "curso", description: "Verde institucional, foco em conclusão de curso.", accent: "#059669", build: technicalCourse },
  { id: "kids", name: "Infantil / Kids", category: "participacao", description: "Colorido e divertido para alunos da turma infantil.", accent: "#2563eb", build: kids },
];
