// Contrato de configuração do App do Aluno (No-Code Editor)
// Este objeto é armazenado em `dojo_student_app_config.config` / `.draft`.

export type Appearance = {
  app_name: string;
  logo_url: string | null;
  app_icon_url: string | null;
  splash_url: string | null;
  login_bg_url: string | null;
  home_hero_url: string | null;
  brand_primary: string;
  brand_secondary: string;
  button_color: string | null;
  bottom_nav_color: string;
  card_color: string;
  title_color: string;
  font_family: string;
  theme_mode: "light" | "dark";
};

export type FeatureKey =
  | "agenda"
  | "checkin"
  | "videos"
  | "graduations"
  | "certificates"
  | "finance"
  | "competitions"
  | "profile"
  | "documents"
  | "news"
  | "messages"
  | "events"
  | "announcements"
  | "evaluations"
  | "attendance"
  | "digital_card"
  | "store"
  | "ranking"
  | "gamification"
  | "training_plan";

export type Features = Record<FeatureKey, boolean>;

export type NavItem = {
  id: string;
  label: string;
  icon: string; // lucide icon name (lowercase)
  route: string;
  primary?: boolean;
};

export type HomeBlockType =
  | "welcome"
  | "banner"
  | "next_class"
  | "shortcuts"
  | "news"
  | "open_invoices"
  | "graduation"
  | "videos_carousel"
  | "competitions"
  | "certificates";

export type HomeBlock = {
  id: string;
  type: HomeBlockType;
  visible: boolean;
  title?: string;
  items?: string[]; // usado por shortcuts
};

export type LoginConfig = {
  title: string;
  subtitle: string;
  institutional_text: string | null;
  button_color: string | null;
  welcome_screen_enabled: boolean;
  welcome_screen_message: string | null;
};

export type NotificationsConfig = {
  welcome_message: string;
  push_enabled: boolean;
};

export type OnboardingTourStep = {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
};

export type OnboardingConfig = {
  enabled: boolean;
  force: boolean;
  welcome_title: string;
  welcome_subtitle: string;
  benefits: string[];
  tour_enabled: boolean;
  tour_steps: OnboardingTourStep[];
  ask_push: boolean;
  ask_install: boolean;
  show_home_checklist: boolean;
  cta_label: string;
  finish_label: string;
};

export type DigitalCardConfig = {
  title: string;
  subtitle: string | null;
  footer_text: string | null;
  background_style: "gradient" | "solid" | "image";
  background_url: string | null;
  background_color: string;
  text_color: string;
  accent_color: string;
  show_photo: boolean;
  show_qr: boolean;
  show_pin: boolean;
  show_belt: boolean;
  show_enrollment_date: boolean;
  show_registration_number: boolean;
  show_academy_logo: boolean;
  show_unit_name: boolean;
};

export type StudentAppConfig = {
  appearance: Appearance;
  features: Features;
  bottom_nav: NavItem[];
  home_blocks: HomeBlock[];
  login: LoginConfig;
  notifications: NotificationsConfig;
  onboarding: OnboardingConfig;
  digital_card: DigitalCardConfig;
};


export const DEFAULT_FEATURES: Features = {
  agenda: true,
  checkin: true,
  videos: true,
  graduations: true,
  certificates: true,
  finance: true,
  competitions: true,
  profile: true,
  documents: true,
  news: true,
  messages: false,
  events: true,
  announcements: true,
  evaluations: false,
  attendance: true,
  digital_card: false,
  store: false,
  ranking: true,
  gamification: false,
  training_plan: false,
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  agenda: "Agenda",
  checkin: "Check-in",
  videos: "Vídeos",
  graduations: "Graduações",
  certificates: "Certificados",
  finance: "Financeiro",
  competitions: "Competições",
  profile: "Perfil",
  documents: "Contratos",
  news: "Notícias",
  messages: "Mensagens",
  events: "Eventos",
  announcements: "Comunicados",
  evaluations: "Avaliações",
  attendance: "Frequência",
  digital_card: "Carteirinha digital",
  store: "Loja da academia",
  ranking: "Ranking",
  gamification: "Gamificação",
  training_plan: "Plano de treino",
};

export const DEFAULT_CONFIG: StudentAppConfig = {
  appearance: {
    app_name: "Portal do Aluno",
    logo_url: null,
    app_icon_url: null,
    splash_url: null,
    login_bg_url: null,
    home_hero_url: null,
    brand_primary: "#dc2626",
    brand_secondary: "#0a0a0a",
    button_color: null,
    bottom_nav_color: "#ffffff",
    card_color: "#ffffff",
    title_color: "#0a0a0a",
    font_family: "Inter",
    theme_mode: "light",
  },
  features: DEFAULT_FEATURES,
  bottom_nav: [
    { id: "home", label: "Início", icon: "home", route: "/app/home" },
    { id: "agenda", label: "Agenda", icon: "calendar-days", route: "/app/agenda" },
    { id: "checkin", label: "Check-in", icon: "qr-code", route: "/app/checkin", primary: true },
    { id: "videos", label: "Vídeos", icon: "film", route: "/app/videos" },
    { id: "profile", label: "Perfil", icon: "user", route: "/app/profile" },
  ],
  home_blocks: [
    { id: "welcome", type: "welcome", visible: true },
    { id: "banner", type: "banner", visible: true },
    { id: "invoices", type: "open_invoices", visible: true },
    { id: "shortcuts", type: "shortcuts", visible: true, items: ["checkin", "schedule", "videos", "finance", "graduations", "certificates", "competitions", "notifications"] },
    { id: "news", type: "news", visible: true, title: "Notícias" },
    { id: "graduation", type: "graduation", visible: false },
  ],
  login: {
    title: "Bem-vindo",
    subtitle: "Acesse com seu e-mail e senha",
    institutional_text: null,
    button_color: null,
    welcome_screen_enabled: false,
    welcome_screen_message: null,
  },
  notifications: {
    welcome_message: "Bem-vindo(a) ao portal!",
    push_enabled: false,
  },
  onboarding: {
    enabled: true,
    force: false,
    welcome_title: "Bem-vindo(a)!",
    welcome_subtitle:
      "Seu portal está pronto. Aqui você acompanha treinos, faz check-in, vê seus certificados e paga mensalidades.",
    benefits: [
      "Check-in nas aulas",
      "Suas graduações e certificados",
      "Cobranças e Pix",
      "Novidades da academia",
    ],
    tour_enabled: true,
    tour_steps: [
      { id: "s1", title: "Check-in em segundos", description: "Marque presença ao chegar na academia direto pelo app.", icon: "qr-code" },
      { id: "s2", title: "Sua evolução", description: "Acompanhe faixa atual, graus e histórico de graduações.", icon: "award" },
      { id: "s3", title: "Financeiro sem dor", description: "Veja e pague mensalidades via Pix em poucos toques.", icon: "wallet" },
    ],
    ask_push: true,
    ask_install: true,
    show_home_checklist: true,
    cta_label: "Vamos começar",
    finish_label: "Concluir",
  },
  digital_card: {
    title: "Carteirinha do Aluno",
    subtitle: null,
    footer_text: "Apresente esta carteirinha na recepção",
    background_style: "gradient",
    background_url: null,
    background_color: "#0a0a0a",
    text_color: "#ffffff",
    accent_color: "#dc2626",
    show_photo: true,
    show_qr: true,
    show_pin: true,
    show_belt: true,
    show_enrollment_date: true,
    show_registration_number: true,
    show_academy_logo: true,
    show_unit_name: true,
  },
};


// Faz merge tolerante para não quebrar quando novas chaves forem adicionadas
export function normalizeConfig(input: unknown): StudentAppConfig {
  const src = (input && typeof input === "object" ? input : {}) as Partial<StudentAppConfig>;
  return {
    appearance: { ...DEFAULT_CONFIG.appearance, ...(src.appearance ?? {}) },
    features: { ...DEFAULT_FEATURES, ...(src.features ?? {}) },
    bottom_nav: Array.isArray(src.bottom_nav) && src.bottom_nav.length > 0 ? src.bottom_nav : DEFAULT_CONFIG.bottom_nav,
    home_blocks: Array.isArray(src.home_blocks) && src.home_blocks.length > 0 ? src.home_blocks : DEFAULT_CONFIG.home_blocks,
    login: { ...DEFAULT_CONFIG.login, ...(src.login ?? {}) },
    notifications: { ...DEFAULT_CONFIG.notifications, ...(src.notifications ?? {}) },
    onboarding: {
      ...DEFAULT_CONFIG.onboarding,
      ...(src.onboarding ?? {}),
      benefits: Array.isArray(src.onboarding?.benefits) ? src.onboarding!.benefits : DEFAULT_CONFIG.onboarding.benefits,
      tour_steps: Array.isArray(src.onboarding?.tour_steps) && src.onboarding!.tour_steps.length > 0
        ? src.onboarding!.tour_steps
        : DEFAULT_CONFIG.onboarding.tour_steps,
    },
    digital_card: { ...DEFAULT_CONFIG.digital_card, ...(src.digital_card ?? {}) },
  };

}
