// Capturas REAIS do sistema (public/dojo-shots). Nenhuma imagem ilustrativa.
export const SHOT = {
  dashboard: "/dojo-shots/dashboard.png",
  students: "/dojo-shots/students.png",
  finance: "/dojo-shots/finance.png",
  schedule: "/dojo-shots/schedule.png",
  graduations: "/dojo-shots/graduations.png",
  checkin: "/dojo-shots/checkin.png",
  competitions: "/dojo-shots/competitions.png",
  evaluations: "/dojo-shots/evaluations.png",
  announcements: "/dojo-shots/announcements.png",
  store: "/dojo-shots/store.png",
  studentApp: "/dojo-shots/app-login.png",
} as const;

export type ShotKey = keyof typeof SHOT;

/** Rotação de fundo do hero — telas reais do sistema. */
export const HERO_ROTATION: { key: ShotKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "finance", label: "Financeiro" },
  { key: "schedule", label: "Agenda" },
  { key: "checkin", label: "Check-in" },
  { key: "graduations", label: "Graduações" },
  { key: "announcements", label: "Comunicação" },
  { key: "students", label: "Alunos" },
  { key: "store", label: "Loja integrada" },
];

