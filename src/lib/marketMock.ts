// Fictional data for AMT MarketEngine (Jiu-Jitsu / Judô niche)

export type LeadType = "Professor" | "Academia" | "Escola/Projeto Social";
export type Modality = "BJJ" | "Judô" | "BJJ + Judô";
export type LeadStatus = "Novo" | "Contactado" | "Negociando" | "Convertido" | "Perdido";

export type Lead = {
  id: string;
  name: string;
  responsible: string;
  phone: string;
  email: string;
  city: string;
  modality: Modality;
  type: LeadType;
  status: LeadStatus;
  source: "Google Maps" | "Instagram" | "Facebook";
};

export const MOCK_LEADS: Lead[] = [
  { id: "1", name: "Gracie Barra Pinheiros", responsible: "Prof. Rafael Mendes", phone: "(11) 98422-1120", email: "contato@gbpinheiros.com.br", city: "São Paulo, SP", modality: "BJJ", type: "Academia", status: "Novo", source: "Google Maps" },
  { id: "2", name: "Kodokan Ipanema", responsible: "Sensei Yuki Tanaka", phone: "(21) 99711-4402", email: "kodokan.rj@gmail.com", city: "Rio de Janeiro, RJ", modality: "Judô", type: "Academia", status: "Contactado", source: "Google Maps" },
  { id: "3", name: "Projeto Lutar pela Vida", responsible: "Coord. Ana Beatriz", phone: "(31) 98120-3355", email: "lutarpelavida@ong.org", city: "Belo Horizonte, MG", modality: "BJJ + Judô", type: "Escola/Projeto Social", status: "Negociando", source: "Instagram" },
  { id: "4", name: "Prof. Marcelo 'Tigre' Souza", responsible: "Marcelo Souza", phone: "(41) 99630-8877", email: "tigrejjt@gmail.com", city: "Curitiba, PR", modality: "BJJ", type: "Professor", status: "Novo", source: "Instagram" },
  { id: "5", name: "Alliance Recife", responsible: "Prof. Diego Nogueira", phone: "(81) 98844-9021", email: "alliance.rec@alliance.com", city: "Recife, PE", modality: "BJJ", type: "Academia", status: "Convertido", source: "Google Maps" },
  { id: "6", name: "CT Judô Osasco", responsible: "Sensei Carlos Onuki", phone: "(11) 97511-6633", email: "ctjudo.osasco@ig.com.br", city: "Osasco, SP", modality: "Judô", type: "Academia", status: "Contactado", source: "Facebook" },
  { id: "7", name: "Escola Municipal Vila Real", responsible: "Prof. Julia Ramos", phone: "(51) 99122-4700", email: "ed.fisica@vilareal.edu.br", city: "Porto Alegre, RS", modality: "Judô", type: "Escola/Projeto Social", status: "Novo", source: "Google Maps" },
  { id: "8", name: "Checkmat Salvador", responsible: "Prof. Leandro Nyza", phone: "(71) 98330-1122", email: "checkmat.ba@checkmat.com", city: "Salvador, BA", modality: "BJJ", type: "Academia", status: "Negociando", source: "Instagram" },
  { id: "9", name: "Prof. Camila Hirano", responsible: "Camila Hirano", phone: "(11) 96612-8890", email: "camila.hirano@judo.br", city: "São Paulo, SP", modality: "Judô", type: "Professor", status: "Novo", source: "Instagram" },
  { id: "10", name: "Nova União Fortaleza", responsible: "Prof. André Pederneiras Jr.", phone: "(85) 98811-2244", email: "nu.ceara@novauniao.com", city: "Fortaleza, CE", modality: "BJJ", type: "Academia", status: "Perdido", source: "Google Maps" },
];

export type AmtProduct = {
  id: string;
  name: string;
  category: "Kimono" | "Faixa" | "Patch/Backnumber";
  line: "Training" | "Pro" | "Premium" | "Especial";
  price: number;
  stock: number;
  searches30d: number;
};

export const AMT_CATALOG: AmtProduct[] = [
  { id: "k1", name: "Kimono Trançado AMT Training A2", category: "Kimono", line: "Training", price: 429, stock: 84, searches30d: 1820 },
  { id: "k2", name: "Kimono Trançado AMT Pro A3", category: "Kimono", line: "Pro", price: 649, stock: 42, searches30d: 2440 },
  { id: "k3", name: "Kimono Trançado AMT Premium Gold Weave A2", category: "Kimono", line: "Premium", price: 899, stock: 18, searches30d: 3110 },
  { id: "f1", name: "Faixa BJJ Premium Bordado Kanji Preta", category: "Faixa", line: "Premium", price: 189, stock: 120, searches30d: 4120 },
  { id: "f2", name: "Faixa BJJ Pro Roxa", category: "Faixa", line: "Pro", price: 129, stock: 240, searches30d: 2870 },
  { id: "f3", name: "Faixa Judô Training Branca", category: "Faixa", line: "Training", price: 89, stock: 310, searches30d: 1560 },
  { id: "f4", name: "Faixa BJJ Coral Premium Bordada", category: "Faixa", line: "Premium", price: 259, stock: 12, searches30d: 980 },
  { id: "p1", name: "Patch Ponteira Autismo (Solidário)", category: "Patch/Backnumber", line: "Especial", price: 39, stock: 500, searches30d: 2130 },
  { id: "p2", name: "Backnumber Bordado Personalizado", category: "Patch/Backnumber", line: "Pro", price: 69, stock: 220, searches30d: 1740 },
  { id: "p3", name: "Patch Bandeira Brasil Bordado", category: "Patch/Backnumber", line: "Training", price: 29, stock: 640, searches30d: 890 },
];

export const REVENUE_SERIES = Array.from({ length: 30 }, (_, i) => {
  const base = 8500 + Math.sin(i / 3) * 2100 + i * 210;
  return {
    day: `${String(i + 1).padStart(2, "0")}/11`,
    revenue: Math.round(base + Math.random() * 1400),
    ads: Math.round(1200 + Math.random() * 800 + i * 30),
  };
});

export const FUNNEL = [
  { stage: "Visitantes (Alunos + Academias)", value: 48210 },
  { stage: "Interesse em Kimonos/Faixas", value: 12480 },
  { stage: "Adicionaram ao carrinho", value: 4210 },
  { stage: "Iniciaram checkout", value: 1890 },
  { stage: "Compra concluída", value: 1128 },
];

export const EMAIL_FLOWS = [
  {
    id: "ef1",
    name: "Oferta Atacado Faixas — Graduação Fim de Ano",
    audience: "Academias BJJ",
    status: "Ativa",
    emails: 4,
    openRate: 42.6,
    ctr: 11.2,
    revenue: 38420,
  },
  {
    id: "ef2",
    name: "Reposição de Kimono Pro — Alunos Faixa Azul+",
    audience: "Alunos B2C",
    status: "Ativa",
    emails: 3,
    openRate: 37.1,
    ctr: 8.9,
    revenue: 19870,
  },
  {
    id: "ef3",
    name: "Kit Judô para Escolas e Projetos Sociais",
    audience: "Escolas/ONGs",
    status: "Rascunho",
    emails: 5,
    openRate: 0,
    ctr: 0,
    revenue: 0,
  },
  {
    id: "ef4",
    name: "Lançamento Kimono Premium Gold Weave",
    audience: "Compradores Recorrentes",
    status: "Pausada",
    emails: 6,
    openRate: 51.3,
    ctr: 14.7,
    revenue: 52310,
  },
];
