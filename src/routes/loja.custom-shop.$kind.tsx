import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories } from "@/lib/store/store.functions";
import { getCustomTemplate, checkIsAdmin, updateCustomLayout } from "@/lib/customshop.functions";
import { formatBRL, useCart, type CustomConfig } from "@/lib/store/cart-store";
import { capturePreview } from "@/lib/store/preview-capture";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Plus, Trash2, ShoppingBag, Upload, X, Settings, Save, RotateCcw, ChevronDown } from "lucide-react";
import kimonoBase from "@/assets/customshop-kimono.jpg";
import rashguardBase from "@/assets/customshop-rashguard.jpg";
import faixaBase from "@/assets/customshop-faixa.jpg";
import faixaJudoBase from "@/assets/customshop-faixa-judo.png";

const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

const templateQuery = (kind: string) =>
  queryOptions({
    queryKey: ["custom-shop", "template", kind],
    queryFn: () => getCustomTemplate({ data: { kind } }),
  });

export const Route = createFileRoute("/loja/custom-shop/$kind")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(templateQuery(params.kind)),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  head: ({ params }) => ({
    meta: [
      { title: `Customizar ${params.kind} — Custom Shop AMT` },
      { name: "description", content: "Monte seu produto AMT sob medida: cores, patches, bordado e tecido." },
      { property: "og:title", content: `Customizar ${params.kind} — AMT Fight Wear` },
    ],
  }),
  component: BuilderPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Modelo não encontrado</div>,
});

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between gap-2 rounded text-left text-sm font-bold uppercase tracking-widest text-primary hover:opacity-80"
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}


const PALETTE = [
  "#0a0a0a", "#ffffff", "#e11d48", "#1d4ed8", "#059669", "#f59e0b",
  "#7c3aed", "#0891b2", "#374151", "#a16207", "#be123c", "#1e293b",
];

// Judô: presets oficiais linkados às faixas da Linha Training (imagem real do produto).
// Se houver "ponta", primeira cor = corpo, segunda = ponta.
const JUDO_PRESETS: { label: string; body: string; tip: string; image: string }[] = [
  { label: "Branca ponta bordô",                 body: "#ffffff", tip: "#6b1220", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/69120caf-af88-4dc6-874e-b525ad2b3d9b/a014c15e-9d3a-472b-a063-58d54a7f9a72.jpg" },
  { label: "Branca ponta cinza",                 body: "#ffffff", tip: "#6b7280", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/68cb5728-2763-4079-b554-4a0b1067b732/769d1856-5c89-4658-9f1d-f8ab74f3cdb2.jpg" },
  { label: "Bordô",                              body: "#6b1220", tip: "#6b1220", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/b3be3a98-13b4-489b-badd-5d024c93a9f7/e43fa4a5-63bb-4dd9-af11-8b2e7c1cb76c.jpg" },
  { label: "Bordô ponta cinza",                  body: "#6b1220", tip: "#6b7280", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/874e4b22-3eb3-4822-b719-ebc23bff1ba5/420c7673-635d-4fe5-ba7b-6c1909a97629.jpg" },
  { label: "Cinza",                              body: "#6b7280", tip: "#6b7280", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/eb397c55-2661-4598-add9-90cc088cea66/0784eee2-459d-45e3-ae8f-16f2261e4026.jpg" },
  { label: "Cinza ponta azul turquesa",          body: "#6b7280", tip: "#14b8a6", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/5c5cfe7f-0f71-4d16-93c0-0664c7f8d7d1/b983e72a-1172-4fb2-82f7-0e3cda46f835.jpg" },
  { label: "Cinza ponta azul royal",             body: "#6b7280", tip: "#1e3a8a", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/a9e419d9-f2ec-4015-9b5e-94fd72a1f99b/7f1124d5-5a81-404e-b4df-c63c7ce9763a.jpg" },
  { label: "Azul turquesa",                      body: "#14b8a6", tip: "#14b8a6", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/09d6b4cc-f6f2-41bb-a7e2-17f6b6cb717f/6d8c0804-549a-4043-be17-98999418411c.jpg" },
  { label: "Azul turquesa ponta azul royal",     body: "#14b8a6", tip: "#1e3a8a", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/07a76ee3-7886-4811-bae0-5f9fe37e1aec/2fa3b6f0-04da-4dc0-b1ee-8be8d9262dd2.jpg" },
  { label: "Azul royal",                         body: "#1e3a8a", tip: "#1e3a8a", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/7cf5db4c-a018-48e9-bab7-84b0f9a3352a/88c7a0f7-428b-4ea2-8130-ec0fa379ed7e.jpg" },
  { label: "Azul royal ponta amarela",           body: "#1e3a8a", tip: "#eab308", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/1de6e6f0-77d8-45f9-8e9c-38a1627b26b5/ade10647-e612-4e89-8079-358a896e553f.jpg" },
  { label: "Amarela",                            body: "#eab308", tip: "#eab308", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/2f843823-91f4-4b06-933f-f4185448765d/511d3a5c-eb26-432e-a88d-2c1aa1ce32b4.jpg" },
  { label: "Amarela ponta laranja",              body: "#eab308", tip: "#f97316", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/ccdf237d-b77e-486c-b18a-0f9dfc35a7c4/7406963c-208c-4e5b-8629-25c4ad7bc094.jpg" },
  { label: "Laranja",                            body: "#f97316", tip: "#f97316", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/924cbef0-bf5f-4028-bfb8-b38a6e7e9ca1/59219d30-1a69-4013-8072-b15629bd4963.jpg" },
  { label: "Verde",                              body: "#16a34a", tip: "#16a34a", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/0f74cd2e-719a-454a-b3cc-27e74abf4fe5/17fad3df-16ef-428d-a69d-e40c1517a262.jpg" },
  { label: "Roxa",                               body: "#7c3aed", tip: "#7c3aed", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/fe7ec2be-2f17-4bb1-ba67-4662921cfce2/63b7f4bb-40d7-43d7-812d-2fd51c9ba163.jpg" },
  { label: "Marrom",                             body: "#78350f", tip: "#78350f", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/be47182f-1cad-42a6-b09f-73503913aefc/5849e0a0-a4d0-44ac-84f5-97a1e9f31af6.jpg" },
];

// Jiu-Jitsu: presets oficiais linkados às Faixas Padrão - BJJ Linha Premium (imagem real do produto).
const JIU_PRESETS: { label: string; body: string; tip: string; image: string }[] = [
  { label: "Amarela",         body: "#eab308", tip: "#eab308", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/0779baab-98a3-4977-954e-d1e075a75114/d0b5f90b-3a8e-4737-b641-7aaad2a4336b.jpg" },
  { label: "Amarela e Branca",body: "#eab308", tip: "#ffffff", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/fe4e2482-e736-4140-ad28-56164166953f/69941fdd-3776-4ff8-8112-958312306d28.jpg" },
  { label: "Amarela e Preta", body: "#eab308", tip: "#111827", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/de5dc34b-25c2-4fa2-ad9c-3711c450d874/fcf346e7-b4fb-42b9-96ee-f4b5655c9425.jpg" },
  { label: "Azul",            body: "#1e3a8a", tip: "#1e3a8a", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/f90f38ce-5b65-4eb5-984a-0236d8896781/45d841b0-0ab5-4d0b-8158-35691b80b820.jpg" },
  { label: "Cinza",           body: "#6b7280", tip: "#6b7280", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/d4530b24-1c00-45c0-a48a-0a57b17f5e5e/80045b9a-9ec5-4b87-96d5-6c778af8e91b.jpg" },
  { label: "Cinza e Branca",  body: "#6b7280", tip: "#ffffff", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/1c99ce99-a0e9-4861-a39c-8895799c50d2/ecb3f919-7a80-4b4d-81c7-dce3c0441084.jpg" },
  { label: "Cinza e Preta",   body: "#6b7280", tip: "#111827", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/517eb620-9f12-4c66-ae5c-81666062ce78/9c8d55f0-f07d-4bb6-9271-9e20482c0090.jpg" },
  { label: "Laranja",         body: "#f97316", tip: "#f97316", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/c7c474c9-ed8c-4eb1-8d7b-e2cbcfd50adc/d45a45e1-97d4-4e2b-aced-d29e7c56ec66.jpg" },
  { label: "Laranja e Branca",body: "#f97316", tip: "#ffffff", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/d8b5e9a1-4ea5-4a63-bf9f-020d94d73dfc/fb51de72-d22b-4cc5-bf3e-681e327c53a7.jpg" },
  { label: "Laranja e Preta", body: "#f97316", tip: "#111827", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/f29c741d-c70d-4c62-9211-31e8e56ce19a/1731ce32-f5d9-42f9-9598-ed953819e42e.jpg" },
  { label: "Verde",           body: "#16a34a", tip: "#16a34a", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/8c88e8ed-387c-40ed-ae45-6a58533c6ef4/31fc5ac5-2abc-49c8-82be-c54c87e255b8.jpg" },
  { label: "Verde e Branca",  body: "#16a34a", tip: "#ffffff", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/15d15d8a-a75d-4cec-8b70-c0489500204e/432b0225-fa33-4d9e-b532-5f79e6724b11.jpg" },
  { label: "Verde e Preta",   body: "#16a34a", tip: "#111827", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/3230f18f-42e9-4e6a-8af5-e8ba3f097c43/ad30ee54-883a-48bc-bf68-801e7309219f.jpg" },
  { label: "Roxa",            body: "#7c3aed", tip: "#7c3aed", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/bca02de5-9157-467a-92f2-78e0cb28bc56/48376f58-de83-4f4c-838c-feb5588edcf6.jpg" },
  { label: "Marrom",          body: "#78350f", tip: "#78350f", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/0811991b-e261-4699-b152-dbea7f658c9a/aa8d66f3-903e-4d2c-a5f0-cd3a7d6d54c7.jpg" },
  { label: "Preta e Branca",  body: "#111827", tip: "#ffffff", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/e4c50dc5-ac80-404b-bdba-ddf4185e053f/9b5430d1-e6cc-4139-ae00-baa17b832f57.jpg" },
  { label: "Preta e Vermelha",body: "#111827", tip: "#dc2626", image: "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/883cbb7f-d416-4854-bdba-36d3251d34be/fb86beac-6270-4843-80b0-c6fcd272317e.jpg" },
];

const BELT_PRESETS: Record<string, typeof JUDO_PRESETS> = {
  judo: JUDO_PRESETS,
  default: JIU_PRESETS,
};

// Kimono BJJ: presets oficiais com foto real do produto da categoria
// "Kimonos de Jiu-Jitsu · Trançado Premium".
const KIMONO_PRESETS: { label: string; body: string; image: string }[] = [
  { label: "Branco",     body: "#f4f4f5", image: "/__l5e/assets-v1/87695910-4b4d-4fdd-ad41-06347bb5177b/kimono-branco-frente-costas.jpg" },
  { label: "Azul Royal", body: "#1e3a8a", image: "/__l5e/assets-v1/8d282439-7195-411a-90e9-f53ce2cf855a/kimono-azul-frente-costas.jpg" },
  { label: "Preto",      body: "#111827", image: "/__l5e/assets-v1/caec5811-76a0-4dfa-9b44-54689ffcd8bb/kimono-preto-frente-costas.jpg" },
];

// Coloração (revestimento externo) — opções fixas para faixa
const COLORING_OPTIONS: { name: string; price_delta: number }[] = [
  { name: "Oxford 100% poliéster", price_delta: 0 },
  { name: "Brim 100% algodão", price_delta: 25 },
];

// Preços da faixa
const FAIXA_BORDADO_FEE = 10; // por bordado
const FAIXA_ETIQUETA_CUSTOM_FEE = 2; // etiqueta com imagem enviada

// Kimono: técnicas de aplicação do patch. O preço final depende do slot + tamanho
// (ver KIMONO_PATCH_PRICES). O campo `price` aqui é apenas fallback.
const KIMONO_TECHNIQUES: { id: "bordado" | "sublimado" | "dtf"; label: string; hint: string; price: number }[] = [
  { id: "bordado",   label: "Bordado",         hint: "Fio bordado sobre o tecido",  price: 0 },
  { id: "sublimado", label: "Patch reforçado", hint: "Patch reforçado costurado",   price: 0 },
  { id: "dtf",       label: "DTF",             hint: "Transfer DTF prensado",       price: 0 },
];
const KIMONO_BORDADO_NOME_FEE = 10;

// Tamanhos disponíveis por slot de patch do kimono.
// Frente e calça: tamanho único (preço plano por técnica). Costas: 19x19, 15x15 ou personalizado (máx 30x20cm).
const KIMONO_PATCH_SIZES: Record<string, { presets: string[]; allowCustom: boolean; default: string }> = {
  patch_frente: { presets: [], allowCustom: false, default: "único" },
  patch_costas: { presets: ["19x19", "15x15"], allowCustom: true, default: "19x19" },
  patch_calca:  { presets: [], allowCustom: false, default: "único" },
};

// Tabela de preços do patch por slot × técnica × tamanho.
// Costas: preço varia por tamanho; personalizado usa o preço "custom" (máx 30x20cm).
// Frente/calça: preço plano por técnica.
const KIMONO_PATCH_PRICES: Record<string, Record<"bordado" | "sublimado" | "dtf", { "19x19"?: number; "15x15"?: number; custom?: number; flat?: number }>> = {
  patch_costas: {
    bordado:   { "19x19": 25, "15x15": 20, custom: 25 },
    sublimado: { "19x19": 15, "15x15": 12, custom: 15 },
    dtf:       { "19x19": 25, "15x15": 20, custom: 25 },
  },
  patch_frente: {
    bordado:   { flat: 12 },
    sublimado: { flat: 8 },
    dtf:       { flat: 12 },
  },
  patch_calca: {
    bordado:   { flat: 12 },
    sublimado: { flat: 8 },
    dtf:       { flat: 12 },
  },
};

function kimonoPatchPrice(slotKey: string, technique: "bordado" | "sublimado" | "dtf", size: string | null | undefined): number {
  const bySlot = KIMONO_PATCH_PRICES[slotKey];
  if (!bySlot) return 0;
  const byTech = bySlot[technique];
  if (!byTech) return 0;
  if (typeof byTech.flat === "number") return byTech.flat;
  if (size === "19x19" && byTech["19x19"] != null) return byTech["19x19"]!;
  if (size === "15x15" && byTech["15x15"] != null) return byTech["15x15"]!;
  return byTech.custom ?? 0;
}



// Fontes de bordado disponíveis para o cliente escolher
const EMBROIDERY_FONTS: { id: string; label: string; family: string; weight: number; style: "normal" | "italic" }[] = [
  { id: "classica", label: "Clássica", family: "Georgia, 'Times New Roman', serif", weight: 700, style: "italic" },
  { id: "moderna", label: "Moderna", family: "'Arial Black', 'Helvetica Neue', sans-serif", weight: 900, style: "normal" },
  { id: "manuscrita", label: "Manuscrita", family: "'Brush Script MT', 'Lucida Handwriting', cursive", weight: 400, style: "italic" },
  { id: "tecnica", label: "Técnica", family: "'Courier New', ui-monospace, monospace", weight: 700, style: "normal" },
  { id: "elegante", label: "Elegante", family: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", weight: 700, style: "normal" },
];
const DEFAULT_EMB_FONT = EMBROIDERY_FONTS[0].id;

function splitTwoLines(text: string): [string, string] {
  const t = text.trim();
  if (!t) return ["", ""];
  const mid = Math.floor(t.length / 2);
  // procura o espaço mais próximo do meio
  let idx = -1;
  for (let d = 0; d < t.length; d++) {
    if (t[mid + d] === " ") { idx = mid + d; break; }
    if (t[mid - d] === " ") { idx = mid - d; break; }
  }
  if (idx <= 0) return [t, ""];
  return [t.slice(0, idx).trim(), t.slice(idx + 1).trim()];
}

// Detecta a cor de fundo de uma imagem amostrando os 4 cantos e retornando a média.
async function detectImageBgColor(dataUrl: string): Promise<string> {
  if (typeof window === "undefined") return "#ffffff";
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("#ffffff");
        ctx.drawImage(img, 0, 0);
        const pts: [number, number][] = [
          [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
          [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1],
          [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)],
        ];
        let r = 0, g = 0, b = 0, n = 0;
        for (const [px, py] of pts) {
          const d = ctx.getImageData(px, py, 1, 1).data;
          if (d[3] < 16) continue; // pula pixels transparentes
          r += d[0]; g += d[1]; b += d[2]; n++;
        }
        if (n === 0) return resolve("#ffffff");
        const toHex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
        resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
      } catch {
        resolve("#ffffff");
      }
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}

type Zone = {
  key: string;
  label: string;
  default_hex: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  solid: boolean;
  rotation_deg: number;
};
type SlotRow = {
  key: string;
  label: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  rotation_deg: number;
};

function BuilderPage() {
  const { kind } = Route.useParams();
  const { data } = useSuspenseQuery(templateQuery(kind));
  const { data: categories } = useSuspenseQuery(catsQuery);
  const navigate = useNavigate();
  const addToCart = useCart((s) => s.add);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  // Admin detection
  const checkIsAdminFn = useServerFn(checkIsAdmin);
  const adminQ = useQuery({
    queryKey: ["admin", "is-admin"],
    queryFn: () => checkIsAdminFn(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const isAdmin = adminQ.data?.isAdmin === true;

  if (!data) {
    return (
      <StoreShell categories={categories}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Modelo não encontrado</h1>
          <Link to="/loja/custom-shop" className="mt-4 inline-block text-primary hover:underline">← Voltar ao Custom Shop</Link>
        </div>
      </StoreShell>
    );
  }

  const { template, variants: allVariants, zones: allZones, slots: allSlots, fabrics, patches } = data;
  const variants = allVariants.length > 0 ? allVariants : [{ id: "", template_id: template.id, key: "default", label: template.name, base_image_url: null, sort_order: 0, created_at: "" }];

  const [variantKey, setVariantKey] = useState<string>(variants[0].key);
  const activeVariant = variants.find((v) => v.key === variantKey) ?? variants[0];

  const zones: Zone[] = useMemo(
    () =>
      (allZones as any[])
        .filter((z) => z.variant_key === variantKey)
        .map((z) => ({
          key: z.key,
          label: z.label,
          default_hex: z.default_hex,
          x_pct: Number(z.x_pct),
          y_pct: Number(z.y_pct),
          w_pct: Number(z.w_pct),
          h_pct: Number(z.h_pct),
          solid: Boolean(z.solid),
          rotation_deg: Number(z.rotation_deg ?? 0),
        })),
    [allZones, variantKey],
  );
  const slots: SlotRow[] = useMemo(
    () =>
      (allSlots as any[])
        .filter((s) => s.variant_key === variantKey)
        .map((s) => ({
          key: s.key,
          label: s.label,
          x_pct: Number(s.x_pct),
          y_pct: Number(s.y_pct),
          w_pct: Number(s.w_pct),
          h_pct: Number(s.h_pct ?? s.w_pct),
          rotation_deg: Number(s.rotation_deg ?? 0),
        })),
    [allSlots, variantKey],
  );

  const [zoneColors, setZoneColors] = useState<Record<string, string>>({});
  const [slotPatches, setSlotPatches] = useState<Record<string, string>>({});
  const [fabricId, setFabricId] = useState<string | null>(fabrics[0]?.id ?? null);
  const [embroideries, setEmbroideries] = useState<Record<string, {
    mode: "text" | "logo";
    text: string;
    font: string;
    lines: 1 | 2;
    color: string;
    image: { data_url: string; filename: string; bg_color?: string } | null;
    position: { x: number; y: number } | null;
    scale: number;
    rotation: number;
    technique?: "bordado" | "sublimado" | "dtf" | null;
    size?: string | null;
    format?: "redondo" | "quadrado" | "transparente" | null;


  }>>({});

  const [activeZone, setActiveZone] = useState<string>(zones[0]?.key ?? "");
  const isFaixa = template.kind === "faixa";
  const [logoImage, setLogoImage] = useState<{ data_url: string; filename: string } | null>(null);
  const [labelImage, setLabelImage] = useState<{ data_url: string; filename: string; bg_color?: string } | null>(null);
  const [labelChoice, setLabelChoice] = useState<"padrao" | "custom" | null>(null);
  const [coloring, setColoring] = useState<string>(COLORING_OPTIONS[0].name);

  const isKimono = template.kind === "kimono";
  const KIMONO_SIZES = ["M0","M1","M2","M3","M4","A0","A1","A2","A3","A4","A5"];
  const FAIXA_SIZES = [
    "M0 · 200cm","M1 · 215cm","M2 · 225cm","M3 · 240cm","M4 · 245cm",
    "A0 · 255cm","A1 · 270cm","A2 · 280cm","A3 · 290cm","A4 · 310cm","A5 · 330cm",
  ];
  const isFaixaKind = template.kind === "faixa";
  const [kimonoSize, setKimonoSize] = useState<string>(isFaixaKind ? "A2 · 280cm" : "A2");
  const showSize = isKimono || isFaixaKind;
  const sizeOptions = isFaixaKind ? FAIXA_SIZES : KIMONO_SIZES;

  useEffect(() => {
    // Faixa: seleciona o primeiro preset por padrão para já exibir a imagem real do produto.
    const presets = isFaixa ? BELT_PRESETS[variantKey] : null;
    if (presets && presets.length > 0) {
      const p = presets[0];
      setZoneColors({
        corpo_sup: p.body,
        corpo_inf: p.body,
        ponta_sup: p.tip,
        ponta_inf: p.tip,
      });
    } else if (isKimono && KIMONO_PRESETS.length > 0) {
      // Kimono: seleciona o primeiro preset (Branco) por padrão.
      const p = KIMONO_PRESETS[0];
      setZoneColors({ jaqueta: p.body, calca: p.body });
    } else {
      setZoneColors({});
    }
    setActiveZone(zones[0]?.key ?? "");
  }, [variantKey, isKimono, isFaixa]); // eslint-disable-line react-hooks/exhaustive-deps



  // Admin layout edit mode
  const [editMode, setEditMode] = useState(false);
  const [draftZones, setDraftZones] = useState<Zone[]>(zones);
  const [draftSlots, setDraftSlots] = useState<SlotRow[]>(slots);
  useEffect(() => {
    setDraftZones(zones);
    setDraftSlots(slots);
  }, [variantKey, allZones, allSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateLayoutFn = useServerFn(updateCustomLayout);
  const saveMutation = useMutation({
    mutationFn: async () =>
      updateLayoutFn({
        data: {
          template_id: template.id,
          variant_key: variantKey,
          zones: draftZones.map((z) => ({ key: z.key, x_pct: z.x_pct, y_pct: z.y_pct, w_pct: z.w_pct, h_pct: z.h_pct, solid: z.solid, rotation_deg: z.rotation_deg })),
          slots: draftSlots.map((s) => ({ key: s.key, x_pct: s.x_pct, y_pct: s.y_pct, w_pct: s.w_pct, h_pct: s.h_pct, rotation_deg: s.rotation_deg })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-shop", "template", kind] });
      setEditMode(false);
    },
  });

  const selectedFabric = fabrics.find((f) => f.id === fabricId) ?? null;

  const beltPreset = useMemo(() => {
    if (!isFaixa) return null;
    const presets = BELT_PRESETS[variantKey];
    if (!presets) return null;
    return (
      presets.find(
        (p) =>
          zoneColors.corpo_sup === p.body &&
          zoneColors.corpo_inf === p.body &&
          zoneColors.ponta_sup === p.tip &&
          zoneColors.ponta_inf === p.tip,
      ) ?? null
    );
  }, [isFaixa, variantKey, zoneColors]);


  const kimonoPreset = useMemo(() => {
    if (!isKimono) return null;
    return (
      KIMONO_PRESETS.find(
        (p) => zoneColors.jaqueta === p.body && zoneColors.calca === p.body,
      ) ?? null
    );
  }, [isKimono, zoneColors]);

  const patchesTotal = useMemo(() => {
    let total = 0;
    for (const [, patchId] of Object.entries(slotPatches)) {
      const p = patches.find((pp) => pp.id === patchId);
      if (p) total += Number(p.price);
    }
    return total;
  }, [slotPatches, patches]);

  const embroiderySlots = useMemo(() => {
    if (isKimono) {
      // Kimono: apenas os 3 patches (upload de imagem + técnica). Sem bordado de nome.
      return slots.filter((s) => s.key.startsWith("patch_"));
    }
    const bordado = slots.filter((s) => s.key.startsWith("bordado"));
    return bordado.length > 0 ? bordado : slots;
  }, [slots, isKimono]);

  // Helpers p/ kimono: distingue slot de patch vs. slot de bordado de nome
  const isKimonoPatchSlot = (key: string) => isKimono && key.startsWith("patch_");
  const isKimonoNameSlot = (key: string) => isKimono && key === "bordado_nome";

  const activeEmbroideries = useMemo(
    () =>
      embroiderySlots
        .map((s) => ({ slot: s, e: embroideries[s.key] }))
        .filter(({ e }) => e && ((e.mode === "text" && e.text.trim()) || (e.mode === "logo" && e.image)))
        .map(({ slot, e }) => ({
          slot_key: slot.key,
          mode: e!.mode,
          text: e!.mode === "text" ? e!.text.trim() || null : null,
          font: e!.mode === "text" ? e!.font : null,
          lines: e!.mode === "text" ? e!.lines : null,
          image: e!.mode === "logo" ? e!.image : null,
          position: e!.position,
          scale: e!.scale,
          rotation: e!.rotation,
          color: e!.color,
          technique: isKimonoPatchSlot(slot.key) ? (e!.technique ?? "bordado") : null,
          size: isKimonoPatchSlot(slot.key) ? (e!.size ?? KIMONO_PATCH_SIZES[slot.key]?.default ?? null) : null,
          format: isKimonoPatchSlot(slot.key)
            ? (e!.format ?? ((e!.technique ?? "bordado") === "sublimado" ? "quadrado" : "transparente"))
            : null,


        })),
    [embroiderySlots, embroideries, isKimono], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const embroideryFee = useMemo(() => {
    if (isFaixa) return activeEmbroideries.length * FAIXA_BORDADO_FEE;
    if (isKimono) {
      let total = 0;
      for (const e of activeEmbroideries) {
        if (e.slot_key === "bordado_nome") total += KIMONO_BORDADO_NOME_FEE;
        else if (e.slot_key.startsWith("patch_")) {
          total += kimonoPatchPrice(e.slot_key, (e.technique ?? "bordado") as "bordado" | "sublimado" | "dtf", e.size);
        }
      }
      return total;
    }
    return activeEmbroideries.length * 39;
  }, [activeEmbroideries, isFaixa, isKimono]);

  const fabricDelta = selectedFabric ? Number(selectedFabric.price_delta) : 0;
  const coloringDelta = isFaixa ? (COLORING_OPTIONS.find((c) => c.name === coloring)?.price_delta ?? 0) : 0;
  const labelFee = isFaixa && labelChoice === "custom" && labelImage ? FAIXA_ETIQUETA_CUSTOM_FEE : 0;
  const unitPrice = Number(template.base_price) + fabricDelta + coloringDelta + patchesTotal + embroideryFee + labelFee;

  function togglePatch(slotKey: string, patchId: string) {
    setSlotPatches((prev) => {
      const next = { ...prev };
      if (next[slotKey] === patchId) delete next[slotKey];
      else next[slotKey] = patchId;
      return next;
    });
  }

  async function handleAddToCart() {
    const preview_image = await capturePreview(previewRef.current, 1000);
    const config: CustomConfig = {
      template_id: template.id,
      template_kind: template.kind,
      template_name: template.name,
      zones: zoneColors,
      patches: [],
      embroidery: null,
      embroideries: activeEmbroideries.length > 0 ? activeEmbroideries : null,
      fabric: selectedFabric
        ? { id: selectedFabric.id, name: selectedFabric.name, price_delta: Number(selectedFabric.price_delta) }
        : null,
      coloring: isFaixa ? (COLORING_OPTIONS.find((c) => c.name === coloring) ?? null) : null,
      modality: isFaixa ? activeVariant.label : null,
      logo_image: isFaixa ? logoImage : null,
      label_image: isFaixa && labelChoice === "custom" ? labelImage : null,
      label_choice: isFaixa ? labelChoice : null,
      size: showSize ? kimonoSize : null,
      preview_image,
    };
    addToCart({
      product_id: crypto.randomUUID(),
      variant_id: null,
      name: `${template.name} — Personalizado${variants.length > 1 ? ` · ${activeVariant.label}` : ""}${showSize ? ` · ${kimonoSize}` : ""}`,
      variant_label: `Custom · ${selectedFabric?.name ?? "Padrão"}${showSize ? ` · Tamanho ${kimonoSize}` : ""}`,
      slug: `custom-${template.kind}`,
      image_url: preview_image ?? template.base_image_url ?? null,
      unit_price: unitPrice,
      quantity: 1,
      type: "custom",
      custom_config: config,
      production_days: template.production_days,
    });
    useCart.getState().open();
  }

  const shownZones = editMode ? draftZones : zones;
  const shownSlots = editMode ? draftSlots : slots;

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 text-xs text-muted-foreground">
          <Link to="/loja/custom-shop" className="hover:text-primary">Custom Shop</Link> / <span className="text-foreground">{template.name}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Preview (right column on desktop, first on mobile) */}
          <div className="order-1 rounded-xl border bg-card p-4 lg:order-2 lg:sticky lg:top-4 lg:self-start">
            <div ref={previewRef} className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-lg bg-muted">
              <BuilderPreview
                kind={template.kind}
                variantKey={variantKey}
                zones={shownZones}
                zoneColors={zoneColors}
                slots={shownSlots}
                slotPatches={slotPatches}
                patches={patches}
                embroideries={activeEmbroideries}
                labelImage={isFaixa ? labelImage : null}
                beltPresetImage={beltPreset?.image ?? kimonoPreset?.image ?? null}
                onEmbroideryChange={(slotKey, patch) =>
                  setEmbroideries((prev) => {
                    const cur = prev[slotKey];
                    if (!cur) return prev;
                    return { ...prev, [slotKey]: { ...cur, ...patch } };
                  })
                }
              />
              {editMode && (
                <LayoutEditorOverlay
                  zones={draftZones}
                  slots={draftSlots}
                  onZonesChange={setDraftZones}
                  onSlotsChange={setDraftSlots}
                />
              )}
              {isAdmin && !editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-semibold shadow hover:bg-background"
                  title="Editar layout do pré-visualizador"
                >
                  <Settings className="h-3.5 w-3.5" /> Editar layout
                </button>
              )}
            </div>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Pré-visualização ilustrativa 2D. Produto final pode variar em tonalidade.
            </div>

            {editMode && (
              <AdminLayoutPanel
                variants={variants}
                variantKey={variantKey}
                onVariantChange={setVariantKey}
                zones={draftZones}
                slots={draftSlots}
                onZonesChange={setDraftZones}
                onSlotsChange={setDraftSlots}
                onReset={() => {
                  setDraftZones(zones);
                  setDraftSlots(slots);
                }}
                onCancel={() => {
                  setDraftZones(zones);
                  setDraftSlots(slots);
                  setEditMode(false);
                }}
                onSave={() => saveMutation.mutate()}
                saving={saveMutation.isPending}
                error={saveMutation.error ? String((saveMutation.error as Error).message ?? saveMutation.error) : null}
              />
            )}
          </div>

          {/* Controls (left column on desktop) */}
          <div className="order-2 space-y-6 lg:order-1">
            <div>
              <h1 className="text-3xl font-black">{template.name}</h1>
              {template.description && (
                <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
              )}
              <div className="mt-3 flex items-baseline gap-3">
                <div className="text-3xl font-black">{formatBRL(unitPrice)}</div>
                <div className="text-sm text-muted-foreground">10x de {formatBRL(unitPrice / 10)}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Produção sob encomenda · {template.production_days} dias úteis</div>
            </div>

            {/* Variant selector (Modalidade for faixa, generic for others with >1 variant) */}
            {variants.length > 1 && (
              <CollapsibleSection title={isFaixa ? "Modalidade" : "Variante"}>
                <div className="grid grid-cols-2 gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setVariantKey(v.key)}
                      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        variantKey === v.key ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Fabric / Alma */}
            {fabrics.length > 0 && (
              <CollapsibleSection title={isFaixa ? "Alma (núcleo)" : "Tecido / gramatura"}>
                <div className="grid gap-2">
                  {fabrics.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFabricId(f.id)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                        fabricId === f.id ? "border-primary bg-primary/5" : "hover:border-foreground/40"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{f.name}</div>
                        {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                      </div>
                      <div className="text-xs font-semibold">
                        {Number(f.price_delta) === 0 ? "Incluso" : `+ ${formatBRL(Number(f.price_delta))}`}
                      </div>
                    </button>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Tamanho — kimono e faixa (padrão jiu-jitsu do sistema) */}
            {showSize && (
              <CollapsibleSection title="Tamanho">
                <div className="mb-2 text-xs text-muted-foreground">
                  {isFaixaKind ? "Infantil: M0–M4 · Adulto: A0–A5 (comprimento em cm)" : "Infantil: M0–M4 · Adulto: A0–A5"}
                </div>
                <div className={`grid gap-2 ${isFaixaKind ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-5 sm:grid-cols-6"}`}>
                  {sizeOptions.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setKimonoSize(sz)}
                      className={`rounded-md border px-2 py-2 text-sm font-semibold transition ${
                        kimonoSize === sz ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                {kimonoSize && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Adicionar ao carrinho <ShoppingBag className="h-4 w-4" />
                  </button>
                )}
              </CollapsibleSection>
            )}


            {/* Coloração (revestimento) — só para faixa */}
            {isFaixa && (
              <CollapsibleSection title="Coloração (revestimento)">
                <div className="grid gap-2">
                  {COLORING_OPTIONS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColoring(c.name)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                        coloring === c.name ? "border-primary bg-primary/5" : "hover:border-foreground/40"
                      }`}
                    >
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs font-semibold">
                        {c.price_delta === 0 ? "Incluso" : `+ ${formatBRL(c.price_delta)}`}
                      </div>
                    </button>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Faixa: presets oficiais de cor (corpo + ponta) — Judô e Jiu-Jitsu */}
            {isFaixa && BELT_PRESETS[variantKey] && (
              <CollapsibleSection title="Cores da faixa">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {BELT_PRESETS[variantKey].map((p) => {
                    const active =
                      zoneColors.corpo_sup === p.body &&
                      zoneColors.corpo_inf === p.body &&
                      zoneColors.ponta_sup === p.tip &&
                      zoneColors.ponta_inf === p.tip;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          setZoneColors((prev) => ({
                            ...prev,
                            corpo_sup: p.body,
                            corpo_inf: p.body,
                            ponta_sup: p.tip,
                            ponta_inf: p.tip,
                          }))
                        }
                        className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-[11px] font-semibold transition ${
                          active ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                        }`}
                      >
                        <span className="flex h-6 w-10 shrink-0 overflow-hidden rounded border border-foreground/20">
                          <span className="h-full flex-1" style={{ background: p.body }} />
                          <span className="h-full w-3" style={{ background: p.tip }} />
                        </span>
                        <span className="leading-tight">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Kimono BJJ: presets oficiais com foto real do produto */}
            {isKimono && (
              <CollapsibleSection title="Cor do kimono">
                <div className="grid grid-cols-3 gap-2">
                  {KIMONO_PRESETS.map((p) => {
                    const active = zoneColors.jaqueta === p.body && zoneColors.calca === p.body;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          setZoneColors((prev) => ({ ...prev, jaqueta: p.body, calca: p.body }))
                        }
                        className={`group flex flex-col overflow-hidden rounded-md border text-left transition ${
                          active ? "border-primary ring-2 ring-primary/30" : "hover:border-foreground/40"
                        }`}
                      >
                        <div className="relative aspect-square bg-muted">
                          <img
                            src={p.image}
                            alt={p.label}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold">
                          <span
                            className="inline-block h-3 w-3 shrink-0 rounded-full border border-foreground/20"
                            style={{ background: p.body }}
                          />
                          <span className="truncate">{p.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Fotos reais da linha Trançado Premium — a cor selecionada é aplicada em jaqueta e calça.
                </p>
              </CollapsibleSection>
            )}

            {/* Zone colors (fallback quando não há preset) */}
            {!(isFaixa && BELT_PRESETS[variantKey]) && !isKimono && zones.length > 0 && (
              <CollapsibleSection title="Cores">
                <div className="flex flex-wrap gap-2">
                  {zones.map((z) => (
                    <button
                      key={z.key}
                      type="button"
                      onClick={() => setActiveZone(z.key)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                        activeZone === z.key ? "border-primary bg-primary/5" : "hover:border-foreground/40"
                      }`}
                    >
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-foreground/20"
                        style={
                          zoneColors[z.key]
                            ? { background: zoneColors[z.key] }
                            : {
                                backgroundImage:
                                  "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                                backgroundSize: "6px 6px",
                                backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0",
                              }
                        }
                      />
                      {z.label}
                    </button>
                  ))}
                </div>
                {activeZone && (
                  <div className="mt-3 rounded-md border bg-muted/30 p-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Cor de <strong className="text-foreground">{zones.find((z) => z.key === activeZone)?.label}</strong>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-label="Sem cor (transparente)"
                        title="Sem cor"
                        onClick={() =>
                          setZoneColors((prev) => {
                            const n = { ...prev };
                            delete n[activeZone];
                            return n;
                          })
                        }
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                          !zoneColors[activeZone] ? "border-primary scale-110" : "border-foreground/20"
                        }`}
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                          backgroundSize: "8px 8px",
                          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
                        }}
                      >
                        <X className="h-3 w-3 text-foreground/70" />
                      </button>
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={c}
                          onClick={() => setZoneColors((prev) => ({ ...prev, [activeZone]: c }))}
                          className={`h-7 w-7 rounded-full border-2 transition ${
                            zoneColors[activeZone] === c ? "border-primary scale-110" : "border-foreground/20"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                      <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-foreground/20 text-[10px]">
                        <input
                          type="color"
                          value={zoneColors[activeZone] ?? "#000000"}
                          onChange={(e) => setZoneColors((prev) => ({ ...prev, [activeZone]: e.target.value }))}
                          className="h-0 w-0 opacity-0"
                        />
                        +
                      </label>
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Patches / logos: removidos do fluxo */}

            {/* Embroidery — one entry per bordado slot (text or image) */}
            {embroiderySlots.length > 0 && (
              <CollapsibleSection title={isKimono ? "Personalização" : embroiderySlots.length > 1 ? "Bordados" : "Bordado de texto ou logo"}>
                <div className="space-y-3">
                  {embroiderySlots.map((s, idx) => {
                    const kPatch = isKimonoPatchSlot(s.key);
                    const kName = isKimonoNameSlot(s.key);
                    const defaults = {
                      mode: (kPatch ? "logo" : "text") as "text" | "logo",
                      text: "",
                      font: DEFAULT_EMB_FONT,
                      lines: 1 as 1 | 2,
                      color: "#ffffff",
                      image: null as { data_url: string; filename: string; bg_color?: string } | null,
                      position: null as { x: number; y: number } | null,
                      scale: 1,
                      rotation: 0,
                      technique: (kPatch ? "bordado" : null) as "bordado" | "sublimado" | "dtf" | null,
                      size: (kPatch ? (KIMONO_PATCH_SIZES[s.key]?.default ?? null) : null) as string | null,
                      format: (kPatch ? "transparente" : null) as "redondo" | "quadrado" | "transparente" | null,


                    };
                    const entry = embroideries[s.key] ?? defaults;
                    const setEntry = (patch: Partial<typeof entry>) =>
                      setEmbroideries((prev) => ({ ...prev, [s.key]: { ...(prev[s.key] ?? defaults), ...patch } }));
                    const active =
                      (entry.mode === "text" && entry.text.trim()) || (entry.mode === "logo" && entry.image);
                    const pos = entry.position ?? { x: s.x_pct, y: s.y_pct };
                    const selectedFont = EMBROIDERY_FONTS.find((f) => f.id === entry.font) ?? EMBROIDERY_FONTS[0];
                    const slotHeader = isKimono ? s.label : `Bordado ${idx + 1}`;
                    return (
                      <div key={s.key} className="rounded-md border p-3 space-y-3">
                        <div className="text-xs font-bold uppercase text-muted-foreground">{slotHeader}</div>

                        {/* Técnica (apenas patches do kimono) */}
                        {kPatch && (
                          <div>
                            <div className="mb-1 text-xs font-semibold text-muted-foreground">Técnica de aplicação</div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              {KIMONO_TECHNIQUES.map((t) => {
                                const activeT = (entry.technique ?? "bordado") === t.id;
                                const tPrice = kimonoPatchPrice(s.key, t.id, entry.size);
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      const nextFormat: "redondo" | "quadrado" | "transparente" =
                                        t.id === "sublimado"
                                          ? ((entry.format === "redondo" || entry.format === "quadrado") ? entry.format : "quadrado")
                                          : "transparente";
                                      setEntry({ technique: t.id, format: nextFormat });
                                    }}
                                    className={`rounded-md border px-2 py-2 text-left text-xs font-semibold transition ${
                                      activeT ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span>{t.label}</span>
                                      {tPrice > 0 && <span className="text-[11px] font-bold text-primary">+ {formatBRL(tPrice)}</span>}
                                    </div>
                                    <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">{t.hint}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Tamanho do patch (apenas kimono) */}
                        {kPatch && (() => {
                          const cfg = KIMONO_PATCH_SIZES[s.key];
                          if (!cfg) return null;
                          if (cfg.presets.length === 0 && !cfg.allowCustom) return null;
                          const current = entry.size ?? cfg.default;
                          const isCustom = !cfg.presets.includes(current);
                          const tech = (entry.technique ?? "bordado") as "bordado" | "sublimado" | "dtf";
                          return (
                            <div>
                              <div className="mb-1 text-xs font-semibold text-muted-foreground">Tamanho (cm)</div>
                              <div className="flex flex-wrap gap-2">
                                {cfg.presets.map((sz) => {
                                  const p = kimonoPatchPrice(s.key, tech, sz);
                                  return (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => setEntry({ size: sz })}
                                      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                                        current === sz ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                                      }`}
                                    >
                                      {sz} cm{p > 0 && <span className="ml-1 text-primary">+ {formatBRL(p)}</span>}
                                    </button>
                                  );
                                })}
                                {cfg.allowCustom && (() => {
                                  const p = kimonoPatchPrice(s.key, tech, "custom");
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => setEntry({ size: isCustom ? current : "" })}
                                      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                                        isCustom ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                                      }`}
                                    >
                                      Personalizado{p > 0 && <span className="ml-1 text-primary">+ {formatBRL(p)}</span>}
                                    </button>
                                  );
                                })()}
                              </div>
                              {cfg.allowCustom && isCustom && (
                                <input
                                  type="text"
                                  value={current}
                                  onChange={(e) => setEntry({ size: e.target.value })}
                                  placeholder="ex.: 12x18"
                                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                              )}
                              {!cfg.allowCustom && (
                                <div className="mt-1 text-[10px] text-muted-foreground">Tamanho fixo para este patch.</div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Formato do patch (apenas kimono) */}
                        {kPatch && (() => {
                          const tech = entry.technique ?? "bordado";
                          // Bordado / DTF → fundo removido automaticamente (transparente).
                          if (tech !== "sublimado") {
                            return (
                              <div>
                                <div className="mb-1 text-xs font-semibold text-muted-foreground">Formato</div>
                                <div className="rounded-md border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
                                  Fundo removido automaticamente — o patch fica com recorte no contorno da arte.
                                </div>
                              </div>
                            );
                          }
                          // Sublimado → cliente escolhe quadrado ou redondo; fundo preenchido com a cor da imagem enviada.
                          const currentFormat: "redondo" | "quadrado" =
                            entry.format === "redondo" ? "redondo" : "quadrado";
                          const options: { id: "redondo" | "quadrado"; label: string; hint: string }[] = [
                            { id: "quadrado", label: "Quadrado", hint: "Fundo preenchido com a cor da imagem" },
                            { id: "redondo",  label: "Redondo",  hint: "Fundo preenchido com a cor da imagem" },
                          ];
                          return (
                            <div>
                              <div className="mb-1 text-xs font-semibold text-muted-foreground">Formato</div>
                              <div className="grid grid-cols-2 gap-2">
                                {options.map((o) => {
                                  const activeO = currentFormat === o.id;
                                  return (
                                    <button
                                      key={o.id}
                                      type="button"
                                      onClick={() => setEntry({ format: o.id })}
                                      className={`rounded-md border px-2 py-2 text-center text-[11px] font-semibold transition ${
                                        activeO ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                                      }`}
                                    >
                                      {o.label}
                                      <div className="mt-0.5 text-[9px] font-normal text-muted-foreground">{o.hint}</div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}





                        {/* Mode selector — só quando NÃO é kimono (kimono força o modo por slot) */}
                        {!isKimono && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEntry({ mode: "text", image: null })}
                            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                              entry.mode === "text" ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                            }`}
                          >
                            Bordado de nome
                            <div className="mt-1 text-[10px] font-normal text-muted-foreground">Texto com fonte</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEntry({ mode: "logo", text: "" })}
                            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                              entry.mode === "logo" ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                            }`}
                          >
                            Logotipo
                            <div className="mt-1 text-[10px] font-normal text-muted-foreground">Upload de imagem</div>
                          </button>

                        </div>
                        )}



                        {entry.mode === "text" ? (
                          <>
                            <input
                              type="text"
                              maxLength={entry.lines === 2 ? 40 : 20}
                              value={entry.text}
                              onChange={(e) => setEntry({ text: e.target.value })}
                              placeholder={entry.lines === 2 ? "Texto (use espaço para quebrar em 2 linhas)" : "Texto do bordado (até 20 caracteres)"}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                            />

                            <div>
                              <div className="mb-1 text-xs font-semibold text-muted-foreground">Fonte</div>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {EMBROIDERY_FONTS.map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setEntry({ font: f.id })}
                                    className={`rounded-md border px-2 py-2 text-center text-sm transition ${
                                      entry.font === f.id ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                                    }`}
                                    style={{ fontFamily: f.family, fontWeight: f.weight, fontStyle: f.style }}
                                  >
                                    {f.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="mb-1 text-xs font-semibold text-muted-foreground">Linhas</div>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEntry({ lines: 1 })}
                                  className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                                    entry.lines === 1 ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                                  }`}
                                >
                                  1 linha
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEntry({ lines: 2 })}
                                  className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                                    entry.lines === 2 ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                                  }`}
                                >
                                  2 linhas
                                </button>
                              </div>
                              {entry.lines === 2 && (
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                  A quebra ocorre no primeiro espaço após o meio do texto.
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <ImageUploader
                            value={entry.image}
                            onChange={async (img) => {
                              if (!img) { setEntry({ image: null }); return; }
                              // Sempre detecta a cor de fundo — usada quando técnica sublimado é aplicada.
                              const bg = await detectImageBgColor(img.data_url).catch(() => "#ffffff");
                              setEntry({ image: { ...img, bg_color: bg } });
                            }}
                            hint="Envie um logotipo (PNG/JPG, até 4MB) — será simulado como bordado."
                          />
                        )}

                        {active && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">Posição, tamanho e rotação</div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="w-10 text-muted-foreground">X</span>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={pos.x}
                                onChange={(e) => setEntry({ position: { x: Number(e.target.value), y: pos.y } })}
                                className="flex-1"
                              />
                              <span className="w-10 text-right tabular-nums">{Math.round(pos.x)}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="w-10 text-muted-foreground">Y</span>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={pos.y}
                                onChange={(e) => setEntry({ position: { x: pos.x, y: Number(e.target.value) } })}
                                className="flex-1"
                              />
                              <span className="w-10 text-right tabular-nums">{Math.round(pos.y)}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="w-10 text-muted-foreground">Tam.</span>
                              <input
                                type="range"
                                min={0.3}
                                max={3}
                                step={0.05}
                                value={entry.scale}
                                onChange={(e) => setEntry({ scale: Number(e.target.value) })}
                                className="flex-1"
                              />
                              <span className="w-10 text-right tabular-nums">{Math.round(entry.scale * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="w-10 text-muted-foreground">Rot.</span>
                              <input
                                type="range"
                                min={-180}
                                max={180}
                                step={1}
                                value={entry.rotation}
                                onChange={(e) => setEntry({ rotation: Number(e.target.value) })}
                                className="flex-1"
                              />
                              <span className="w-10 text-right tabular-nums">{Math.round(entry.rotation)}°</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEntry({ position: null, scale: 1, rotation: 0 })}
                              className="text-[10px] text-muted-foreground underline hover:text-primary"
                            >
                              Restaurar padrão
                            </button>
                          </div>
                        )}


                        {active && (
                          <>
                            {/* Cor do bordado — não se aplica a patches sublimado/DTF do kimono */}
                            {!(kPatch && entry.technique && entry.technique !== "bordado") && (
                              <div>
                                <div className="mb-1 text-xs font-semibold text-muted-foreground">Cor do bordado</div>
                                <div className="flex flex-wrap gap-2">
                                  {PALETTE.map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setEntry({ color: c })}
                                      className={`h-6 w-6 rounded-full border-2 ${
                                        entry.color === c ? "border-primary scale-110" : "border-foreground/20"
                                      }`}
                                      style={{ background: c }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            {isKimono ? (
                              kName ? (
                                <div className="text-xs font-bold text-primary">Bordado de nome: + {formatBRL(KIMONO_BORDADO_NOME_FEE)}</div>
                              ) : (
                                (() => {
                                  const t = KIMONO_TECHNIQUES.find((x) => x.id === (entry.technique ?? "bordado"))!;
                                  const price = kimonoPatchPrice(s.key, t.id, entry.size);
                                  return (
                                    <div className="text-xs font-bold text-primary">
                                      Adicional ({t.label}): {price > 0 ? `+ ${formatBRL(price)}` : "a definir"}
                                    </div>
                                  );
                                })()
                              )
                            ) : (
                              <div className="text-xs font-bold text-primary">Taxa de bordado: + {formatBRL(isFaixa ? FAIXA_BORDADO_FEE : 39)}</div>
                            )}
                          </>
                        )}

                        {/* Preview inline da fonte selecionada */}
                        {entry.mode === "text" && entry.text.trim() && (
                          <div
                            className="rounded-md border bg-muted/30 px-3 py-2 text-center text-lg"
                            style={{
                              fontFamily: selectedFont.family,
                              fontWeight: selectedFont.weight,
                              fontStyle: selectedFont.style,
                              color: entry.color,
                            }}
                          >
                            {entry.lines === 2 ? splitTwoLines(entry.text).map((ln, i) => <div key={i}>{ln}</div>) : entry.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Faixa: Logo upload — removido (usar bordado abaixo) */}

            {/* Faixa: Etiqueta — AMT Padrão OU imagem personalizada */}
            {isFaixa && (
              <CollapsibleSection title="Etiqueta (opcional)">
                <div className="rounded-md border p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLabelChoice(labelChoice === "padrao" ? null : "padrao");
                        setLabelImage(null);
                      }}
                      className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                        labelChoice === "padrao" ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                      }`}
                    >
                      Etiqueta AMT Padrão
                      <div className="mt-1 text-[10px] font-normal text-muted-foreground">Modelo oficial (em breve)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabelChoice(labelChoice === "custom" ? null : "custom")}
                      className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                        labelChoice === "custom" ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                      }`}
                    >
                      Personalizada <span className="text-primary">+ {formatBRL(FAIXA_ETIQUETA_CUSTOM_FEE)}</span>
                      <div className="mt-1 text-[10px] font-normal text-muted-foreground">Envie sua imagem</div>
                    </button>
                  </div>
                  {labelChoice === "custom" && (
                    <ImageUploader
                      value={labelImage}
                      onChange={async (v) => {
                        if (!v) { setLabelImage(null); return; }
                        const bg = await detectImageBgColor(v.data_url).catch(() => "#ffffff");
                        setLabelImage({ ...v, bg_color: bg });
                      }}
                      hint="PNG/JPG, até 4MB — mantém o tamanho da etiqueta e preenche o fundo com a cor da imagem."
                    />
                  )}
                  {labelChoice === "padrao" && (
                    <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      Etiqueta AMT Padrão selecionada. A arte oficial será aplicada na produção.
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Summary + CTA */}
            <div className="rounded-lg border bg-card p-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Base ({template.name})</span><span>{formatBRL(Number(template.base_price))}</span></div>
                {fabricDelta > 0 && <div className="flex justify-between"><span>{selectedFabric?.name}</span><span>+ {formatBRL(fabricDelta)}</span></div>}
                {isFaixa && (
                  <div className="flex justify-between">
                    <span>Coloração ({coloring})</span>
                    <span>{coloringDelta === 0 ? "Incluso" : `+ ${formatBRL(coloringDelta)}`}</span>
                  </div>
                )}
                {embroideryFee > 0 && <div className="flex justify-between"><span>Bordado ({activeEmbroideries.length}×)</span><span>+ {formatBRL(embroideryFee)}</span></div>}
                {labelFee > 0 && <div className="flex justify-between"><span>Etiqueta personalizada</span><span>+ {formatBRL(labelFee)}</span></div>}
              </div>
              <div className="mt-3 flex justify-between border-t pt-3 text-base font-black">
                <span>Total</span><span>{formatBRL(unitPrice)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Produção sob encomenda em {template.production_days} dias úteis</div>
              <button
                type="button"
                onClick={handleAddToCart}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Adicionar ao carrinho <ShoppingBag className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </StoreShell>
  );
}

// ============ 2D LAYERED PREVIEW ============

const BASE_IMAGES: Record<string, string> = {
  kimono: kimonoBase,
  rashguard: rashguardBase,
  faixa: faixaBase,
};

type Patch = { id: string; name: string; image_url: string };

function BuilderPreview({
  kind,
  variantKey,
  zones,
  zoneColors,
  slots,
  slotPatches,
  patches,
  embroideries,
  labelImage,
  beltPresetImage,
  onEmbroideryChange,
}: {
  kind: string;
  variantKey: string;
  zones: Zone[];
  zoneColors: Record<string, string>;
  slots: SlotRow[];
  slotPatches: Record<string, string>;
  patches: Patch[];
  embroideries: Array<{
    slot_key: string;
    mode: "text" | "logo";
    text: string | null;
    font: string | null;
    lines: 1 | 2 | null;
    image: { data_url: string; filename: string; bg_color?: string } | null;
    position: { x: number; y: number } | null;
    scale?: number | null;
    rotation?: number | null;
    color: string;
    format?: "redondo" | "quadrado" | "transparente" | null;
    technique?: "bordado" | "sublimado" | "dtf" | null;
  }>;
  labelImage?: { data_url: string; filename: string; bg_color?: string } | null;
  beltPresetImage?: string | null;
  onEmbroideryChange?: (
    slotKey: string,
    patch: { position?: { x: number; y: number }; scale?: number; rotation?: number },
  ) => void;
}) {
  const isJudo = kind === "faixa" && variantKey === "judo";
  const baseImg = beltPresetImage || (isJudo ? faixaJudoBase : BASE_IMAGES[kind]);
  // Quando temos a foto real do produto (preset selecionado), não tinta zonas.
  const useProductPhoto = Boolean(beltPresetImage);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [firstLoaded, setFirstLoaded] = useState(false);

  const [embDrag, setEmbDrag] = useState<
    | { kind: "move"; slotKey: string; startX: number; startY: number; origX: number; origY: number }
    | { kind: "resize"; slotKey: string; startDist: number; origScale: number; cx: number; cy: number }
    | { kind: "rotate"; slotKey: string; cx: number; cy: number; startAngle: number; origRotation: number }
    | null
  >(null);

  function svgPoint(e: PointerEvent | React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  useEffect(() => {
    if (!embDrag || !onEmbroideryChange) return;
    const onMove = (e: PointerEvent) => {
      const p = svgPoint(e);
      if (embDrag.kind === "move") {
        const dx = p.x - embDrag.startX;
        const dy = p.y - embDrag.startY;
        const nx = Math.min(100, Math.max(0, embDrag.origX + dx));
        const ny = Math.min(100, Math.max(0, embDrag.origY + dy));
        onEmbroideryChange(embDrag.slotKey, { position: { x: nx, y: ny } });
      } else if (embDrag.kind === "resize") {
        const dist = Math.hypot(p.x - embDrag.cx, p.y - embDrag.cy);
        const ratio = embDrag.startDist > 0 ? dist / embDrag.startDist : 1;
        const nextScale = Math.min(3, Math.max(0.3, embDrag.origScale * ratio));
        onEmbroideryChange(embDrag.slotKey, { scale: nextScale });
      } else if (embDrag.kind === "rotate") {
        const angle = Math.atan2(p.y - embDrag.cy, p.x - embDrag.cx) * (180 / Math.PI);
        let next = embDrag.origRotation + (angle - embDrag.startAngle);
        // Normalize to [-180, 180]
        while (next > 180) next -= 360;
        while (next < -180) next += 360;
        onEmbroideryChange(embDrag.slotKey, { rotation: next });
      }
    };
    const onUp = () => setEmbDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [embDrag, onEmbroideryChange]);


  return (
    <div className="relative h-full w-full overflow-hidden">
      {baseImg && (
        <img
          src={baseImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          onLoad={() => setFirstLoaded(true)}
          onError={() => setFirstLoaded(true)}
        />
      )}
      {baseImg && !firstLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/40">
          <div className="h-1.5 w-2/3 max-w-[220px] overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-[loading-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Carregando pré-visualização…
          </div>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Embroidery filter — matches product photos: solid satin fill, subtle
            perpendicular stitch grain, darker inner edge, soft puff shadow */}
        <defs>
          <filter id="emb-texture" x="-15%" y="-15%" width="130%" height="130%">
            {/* 1) Very light edge irregularity (thread doesn't cut perfectly straight) */}
            <feTurbulence type="fractalNoise" baseFrequency="4" numOctaves="1" seed="7" result="edgeNoise" />
            <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="0.12" result="base" />

            {/* 2) Fine satin-stitch streaks running mostly vertical (perpendicular to a
                   horizontal-text baseline — same as SEU NOME on the belt photo). Very subtle. */}
            <feTurbulence type="fractalNoise" baseFrequency="4 0.7" numOctaves="1" seed="4" result="stitch" />
            <feColorMatrix in="stitch" type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.22 -0.08" result="stitchAlpha" />
            <feComposite in="stitchAlpha" in2="base" operator="in" result="stitchInside" />

            {/* 3) Darker inner edge to sell the satin outline (erode + subtract) */}
            <feMorphology in="base" operator="erode" radius="0.18" result="eroded" />
            <feComposite in="base" in2="eroded" operator="out" result="edgeBand" />
            <feColorMatrix in="edgeBand" type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.45 0" result="edgeDark" />

            {/* 4) Soft top-left highlight for puff volume */}
            <feGaussianBlur in="base" stdDeviation="0.25" result="bump" />
            <feSpecularLighting in="bump" surfaceScale="1.4" specularConstant="0.9" specularExponent="28" lightingColor="#ffffff" result="spec">
              <feDistantLight azimuth="135" elevation="65" />
            </feSpecularLighting>
            <feComposite in="spec" in2="base" operator="in" result="specMasked" />

            {/* 5) Drop shadow — main cue that the letter is raised */}
            <feGaussianBlur in="base" stdDeviation="0.3" result="shBlur" />
            <feOffset in="shBlur" dx="0.25" dy="0.45" result="shOff" />
            <feColorMatrix in="shOff" type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.7 0" result="shadow" />

            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="base" />
              <feMergeNode in="stitchInside" />
              <feMergeNode in="edgeDark" />
              <feMergeNode in="specMasked" />
            </feMerge>
          </filter>
        </defs>



        {/* Zones (skip when using real product photo) */}
        {!useProductPhoto && zones.map((z) => {
          const color = zoneColors[z.key];
          if (!color) return null; // transparent by default
          const cx = z.x_pct + z.w_pct / 2;
          const cy = z.y_pct + z.h_pct / 2;
          return (
            <g key={z.key} transform={z.rotation_deg ? `rotate(${z.rotation_deg} ${cx} ${cy})` : undefined}>
              <rect
                x={z.x_pct}
                y={z.y_pct}
                width={z.w_pct}
                height={z.h_pct}
                fill={color}
                style={z.solid ? undefined : { mixBlendMode: "multiply" }}
              />
            </g>
          );
        })}

        {/* Contrast pass (only for tinted mockup) */}
        {baseImg && !useProductPhoto && (
          <image
            href={baseImg}
            x={0}
            y={0}
            width={100}
            height={100}
            preserveAspectRatio="xMidYMid slice"
            opacity={0.35}
            style={{ mixBlendMode: "multiply" }}
          />
        )}

        {/* Patches */}
        {slots.map((s) => {
          const patchId = slotPatches[s.key];
          if (!patchId) return null;
          const p = patches.find((pp) => pp.id === patchId);
          if (!p) return null;
          const w = s.w_pct;
          const h = s.h_pct;
          const x = s.x_pct - w / 2;
          const y = s.y_pct - h / 2;
          return (
            <g
              key={s.key}
              transform={s.rotation_deg ? `rotate(${s.rotation_deg} ${s.x_pct} ${s.y_pct})` : undefined}
              style={{ filter: "drop-shadow(0 0.4px 0.6px rgba(0,0,0,0.35))" }}
            >
              <image href={p.image_url} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
            </g>
          );
        })}

        {/* Label image on etiqueta / ponta */}
        {labelImage && (() => {
          const target = slots.find((s) => s.key === "etiqueta") ?? slots.find((s) => s.key === "ponta") ?? slots[0];
          if (!target) return null;
          const w = target.w_pct;
          const h = target.h_pct;
          return (
            <g
              transform={target.rotation_deg ? `rotate(${target.rotation_deg} ${target.x_pct} ${target.y_pct})` : undefined}
              style={{ filter: "drop-shadow(0 0.4px 0.6px rgba(0,0,0,0.35))" }}
            >
              {labelImage.bg_color && (
                <rect
                  x={target.x_pct - w / 2}
                  y={target.y_pct - h / 2}
                  width={w}
                  height={h}
                  fill={labelImage.bg_color}
                />
              )}
              <image
                href={labelImage.data_url}
                x={target.x_pct - w / 2}
                y={target.y_pct - h / 2}
                width={w}
                height={h}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          );
        })()}

        {/* Embroideries — text (with font/lines) OR logo (with custom position/size/rotation) per bordado slot */}
        {embroideries.map((emb) => {
          const slot = slots.find((s) => s.key === emb.slot_key);
          if (!slot) return null;
          const w = slot.w_pct;
          const h = slot.h_pct;
          const cx = emb.position?.x ?? slot.x_pct;
          const cy = emb.position?.y ?? slot.y_pct;
          const slotRot = slot.rotation_deg || 0;
          const userRot = emb.rotation ?? 0;
          const scale = emb.scale ?? 1;
          const totalRot = slotRot + userRot;
          const transform = `translate(${cx} ${cy}) rotate(${totalRot}) scale(${scale})`;
          return (
            <g key={emb.slot_key} transform={transform}>
              {emb.mode === "logo" && emb.image && (() => {
                // Sublimado: aplica o formato escolhido (quadrado/redondo) com fundo preenchido pela cor da imagem.
                // Bordado/DTF (transparente): renderiza a arte sem fundo, apenas com o PNG do upload.
                const fmt = emb.format ?? "transparente";
                const bg = emb.image.bg_color ?? "#ffffff";
                const isRound = fmt === "redondo";
                const isSquare = fmt === "quadrado";
                const clipId = `emb-clip-${emb.slot_key}`;
                return (
                  <g style={{ filter: "drop-shadow(0 0.15px 0.2px rgba(0,0,0,0.45))" }}>
                    {(isRound || isSquare) && (
                      <>
                        <defs>
                          {isRound && (
                            <clipPath id={clipId}>
                              <circle cx={0} cy={0} r={Math.min(w, h) / 2} />
                            </clipPath>
                          )}
                        </defs>
                        {isRound ? (
                          <circle cx={0} cy={0} r={Math.min(w, h) / 2} fill={bg} />
                        ) : (
                          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={bg} />
                        )}
                      </>
                    )}
                    <image
                      href={emb.image.data_url}
                      x={-w / 2}
                      y={-h / 2}
                      width={w}
                      height={h}
                      preserveAspectRatio="xMidYMid meet"
                      opacity={0.95}
                      clipPath={isRound ? `url(#${clipId})` : undefined}
                    />
                  </g>
                );
              })()}
              {emb.mode === "text" && emb.text && (() => {
                const font = EMBROIDERY_FONTS.find((f) => f.id === emb.font) ?? EMBROIDERY_FONTS[0];
                const twoLines = emb.lines === 2;
                const parts = twoLines ? splitTwoLines(emb.text) : [emb.text, ""];
                const fontSize = Math.max(2.4, w * (twoLines ? 0.28 : 0.35));
                const lineGap = fontSize * 1.05;
                const yBase = fontSize * 0.35;
                return (
                  <text
                    x={0}
                    y={twoLines ? yBase - lineGap / 2 : yBase}
                    textAnchor="middle"
                    fontFamily={font.family}
                    fontWeight={font.weight}
                    fontStyle={font.style}
                    fontSize={fontSize}
                    fill={emb.color}
                    stroke={emb.color}
                    strokeWidth={fontSize * 0.02}
                    strokeLinejoin="round"
                    paintOrder="stroke fill"


                    filter="url(#emb-texture)"
                    style={{ pointerEvents: "none" }}

                  >
                    {twoLines ? (
                      <>
                        <tspan x={0} dy={0}>{parts[0]}</tspan>
                        <tspan x={0} dy={lineGap}>{parts[1]}</tspan>
                      </>
                    ) : (
                      emb.text
                    )}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* Interactive handles for embroideries — drag to move, corner to resize */}
        {onEmbroideryChange && embroideries.map((emb) => {
          const slot = slots.find((s) => s.key === emb.slot_key);
          if (!slot) return null;
          const scale = emb.scale ?? 1;
          const w = slot.w_pct * scale;
          const h = slot.h_pct * scale;
          const cx = emb.position?.x ?? slot.x_pct;
          const cy = emb.position?.y ?? slot.y_pct;
          const rot = (slot.rotation_deg || 0) + (emb.rotation ?? 0);
          const half = Math.max(w, h) / 2;
          return (
            <g key={`handle-${emb.slot_key}`} transform={`rotate(${rot} ${cx} ${cy})`}>
              {/* Move area */}
              <rect
                x={cx - w / 2}
                y={cy - h / 2}
                width={w}
                height={h}
                fill="transparent"
                stroke="rgba(59,130,246,0.9)"
                strokeWidth={0.25}
                strokeDasharray="0.8 0.6"
                style={{ cursor: "move", pointerEvents: "auto", touchAction: "none" }}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const p = svgPoint(e);
                  setEmbDrag({
                    kind: "move",
                    slotKey: emb.slot_key,
                    startX: p.x,
                    startY: p.y,
                    origX: cx,
                    origY: cy,
                  });
                }}
              />
              {/* Resize handle (bottom-right corner) */}
              <circle
                cx={cx + half}
                cy={cy + half}
                r={1.2}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={0.25}
                style={{ cursor: "nwse-resize", pointerEvents: "auto", touchAction: "none" }}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const p = svgPoint(e);
                  const startDist = Math.hypot(p.x - cx, p.y - cy);
                  setEmbDrag({
                    kind: "resize",
                    slotKey: emb.slot_key,
                    startDist,
                    origScale: scale,
                    cx,
                    cy,
                  });
                }}
              />
              {/* Rotate handle (above top-center) */}
              <line
                x1={cx}
                y1={cy - half}
                x2={cx}
                y2={cy - half - 2.2}
                stroke="rgba(59,130,246,0.9)"
                strokeWidth={0.2}
                style={{ pointerEvents: "none" }}
              />
              <circle
                cx={cx}
                cy={cy - half - 2.6}
                r={1.2}
                fill="#10b981"
                stroke="#fff"
                strokeWidth={0.25}
                style={{ cursor: "grab", pointerEvents: "auto", touchAction: "none" }}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const p = svgPoint(e);
                  const startAngle = Math.atan2(p.y - cy, p.x - cx) * (180 / Math.PI);
                  setEmbDrag({
                    kind: "rotate",
                    slotKey: emb.slot_key,
                    cx,
                    cy,
                    startAngle,
                    origRotation: emb.rotation ?? 0,
                  });
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============ ADMIN LAYOUT EDITOR OVERLAY ============

type DragState =
  | { kind: "zone-move"; index: number; startX: number; startY: number; origX: number; origY: number }
  | { kind: "zone-resize"; index: number; startX: number; startY: number; origW: number; origH: number }
  | { kind: "zone-rotate"; index: number; cx: number; cy: number; startAngle: number; origRot: number }
  | { kind: "slot-move"; index: number; startX: number; startY: number; origX: number; origY: number }
  | { kind: "slot-resize"; index: number; startX: number; startY: number; origW: number; origH: number }
  | { kind: "slot-rotate"; index: number; cx: number; cy: number; startAngle: number; origRot: number }
  | null;

function LayoutEditorOverlay({
  zones,
  slots,
  onZonesChange,
  onSlotsChange,
}: {
  zones: Zone[];
  slots: SlotRow[];
  onZonesChange: (z: Zone[]) => void;
  onSlotsChange: (s: SlotRow[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>(null);

  function toPct(e: React.PointerEvent | PointerEvent) {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  useEffect(() => {
    if (!drag) return;
    function onMove(e: PointerEvent) {
      const p = toPct(e);
      if (!drag) return;
      if (drag.kind === "zone-move") {
        const dx = p.x - drag.startX;
        const dy = p.y - drag.startY;
        const next = zones.slice();
        next[drag.index] = { ...next[drag.index], x_pct: clamp(drag.origX + dx, -50, 150), y_pct: clamp(drag.origY + dy, -50, 150) };
        onZonesChange(next);
      } else if (drag.kind === "zone-resize") {
        const dx = p.x - drag.startX;
        const dy = p.y - drag.startY;
        const next = zones.slice();
        next[drag.index] = { ...next[drag.index], w_pct: clamp(drag.origW + dx, 1, 200), h_pct: clamp(drag.origH + dy, 1, 200) };
        onZonesChange(next);
      } else if (drag.kind === "zone-rotate") {
        const ang = (Math.atan2(p.y - drag.cy, p.x - drag.cx) * 180) / Math.PI;
        const delta = ang - drag.startAngle;
        const next = zones.slice();
        next[drag.index] = { ...next[drag.index], rotation_deg: normDeg(drag.origRot + delta) };
        onZonesChange(next);
      } else if (drag.kind === "slot-move") {
        const dx = p.x - drag.startX;
        const dy = p.y - drag.startY;
        const next = slots.slice();
        next[drag.index] = { ...next[drag.index], x_pct: clamp(drag.origX + dx, -50, 150), y_pct: clamp(drag.origY + dy, -50, 150) };
        onSlotsChange(next);
      } else if (drag.kind === "slot-resize") {
        const dx = p.x - drag.startX;
        const dy = p.y - drag.startY;
        const next = slots.slice();
        next[drag.index] = {
          ...next[drag.index],
          w_pct: clamp(drag.origW + dx * 2, 0.5, 400),
          h_pct: clamp(drag.origH + dy * 2, 0.5, 400),
        };
        onSlotsChange(next);
      } else if (drag.kind === "slot-rotate") {
        const ang = (Math.atan2(p.y - drag.cy, p.x - drag.cx) * 180) / Math.PI;
        const delta = ang - drag.startAngle;
        const next = slots.slice();
        next[drag.index] = { ...next[drag.index], rotation_deg: normDeg(drag.origRot + delta) };
        onSlotsChange(next);
      }
    }
    function onUp() { setDrag(null); }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, zones, slots, onZonesChange, onSlotsChange]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {zones.map((z, i) => {
          if (z.key.startsWith("corpo") || z.key.startsWith("ponta")) return null;
          const cx = z.x_pct + z.w_pct / 2;
          const cy = z.y_pct + z.h_pct / 2;
          return (
          <g key={`z-${z.key}`} transform={`rotate(${z.rotation_deg || 0} ${cx} ${cy})`}>
            <rect
              x={z.x_pct}
              y={z.y_pct}
              width={z.w_pct}
              height={z.h_pct}
              fill="rgba(59,130,246,0.15)"
              stroke="#3b82f6"
              strokeWidth={0.3}
              strokeDasharray="1 1"
              style={{ cursor: "move", pointerEvents: "auto" }}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                const p = toPct(e);
                setDrag({ kind: "zone-move", index: i, startX: p.x, startY: p.y, origX: z.x_pct, origY: z.y_pct });
              }}
            />
            <text x={z.x_pct + 0.6} y={z.y_pct + 2.4} fontSize={1.8} fill="#1e3a8a" fontWeight={700} style={{ pointerEvents: "none" }}>
              {z.label}
            </text>
            {/* resize handle */}
            <rect
              x={z.x_pct + z.w_pct - 1.5}
              y={z.y_pct + z.h_pct - 1.5}
              width={1.5}
              height={1.5}
              fill="#3b82f6"
              style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                const p = toPct(e);
                setDrag({ kind: "zone-resize", index: i, startX: p.x, startY: p.y, origW: z.w_pct, origH: z.h_pct });
              }}
            />
            {/* rotation handle */}
            <line x1={cx} y1={z.y_pct} x2={cx} y2={z.y_pct - 3} stroke="#3b82f6" strokeWidth={0.25} />
            <circle
              cx={cx}
              cy={z.y_pct - 3}
              r={1.1}
              fill="#fff"
              stroke="#3b82f6"
              strokeWidth={0.3}
              style={{ cursor: "grab", pointerEvents: "auto" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                const p = toPct(e);
                const startAngle = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI;
                setDrag({ kind: "zone-rotate", index: i, cx, cy, startAngle, origRot: z.rotation_deg || 0 });
              }}
            />
          </g>
          );
        })}
        {slots.map((s, i) => {
          const w = s.w_pct;
          const h = s.h_pct;
          const x = s.x_pct - w / 2;
          const y = s.y_pct - h / 2;
          const cx = s.x_pct;
          const cy = s.y_pct;
          return (
            <g key={`s-${s.key}`} transform={`rotate(${s.rotation_deg || 0} ${cx} ${cy})`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="rgba(244,63,94,0.15)"
                stroke="#f43f5e"
                strokeWidth={0.3}
                strokeDasharray="0.6 0.6"
                style={{ cursor: "move", pointerEvents: "auto" }}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const p = toPct(e);
                  setDrag({ kind: "slot-move", index: i, startX: p.x, startY: p.y, origX: s.x_pct, origY: s.y_pct });
                }}
              />
              <text x={x + 0.4} y={y + 2} fontSize={1.6} fill="#9f1239" fontWeight={700} style={{ pointerEvents: "none" }}>
                {s.label}
              </text>
              <rect
                x={x + w - 1.2}
                y={y + h - 1.2}
                width={1.2}
                height={1.2}
                fill="#f43f5e"
                style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const p = toPct(e);
                  setDrag({ kind: "slot-resize", index: i, startX: p.x, startY: p.y, origW: s.w_pct, origH: s.h_pct });
                }}
              />
              {/* rotation handle */}
              <line x1={cx} y1={y} x2={cx} y2={y - 2.4} stroke="#f43f5e" strokeWidth={0.25} />
              <circle
                cx={cx}
                cy={y - 2.4}
                r={1}
                fill="#fff"
                stroke="#f43f5e"
                strokeWidth={0.3}
                style={{ cursor: "grab", pointerEvents: "auto" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const p = toPct(e);
                  const startAngle = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI;
                  setDrag({ kind: "slot-rotate", index: i, cx, cy, startAngle, origRot: s.rotation_deg || 0 });
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function normDeg(d: number): number {
  let x = d % 360;
  if (x > 180) x -= 360;
  if (x < -180) x += 360;
  return x;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function AdminLayoutPanel({
  variants,
  variantKey,
  onVariantChange,
  zones,
  slots,
  onZonesChange,
  onSlotsChange,
  onReset,
  onCancel,
  onSave,
  saving,
  error,
}: {
  variants: { key: string; label: string }[];
  variantKey: string;
  onVariantChange: (k: string) => void;
  zones: Zone[];
  slots: SlotRow[];
  onZonesChange: (z: Zone[]) => void;
  onSlotsChange: (s: SlotRow[]) => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-4 rounded-md border-2 border-primary/40 bg-primary/5 p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Editor de layout</span>
        {variants.length > 1 && (
          <select
            value={variantKey}
            onChange={(e) => onVariantChange(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-xs"
          >
            {variants.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background">
            <RotateCcw className="h-3 w-3" /> Reverter
          </button>
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background">
            <X className="h-3 w-3" /> Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-3 w-3" /> {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>

      {error && <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">{error}</div>}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Zonas (retângulo)</div>
          <div className="space-y-2">
            {zones.map((z, i) => {
              if (z.key.startsWith("corpo") || z.key.startsWith("ponta")) return null;
              return (
              <div key={z.key} className="rounded border bg-background p-2 text-xs">
                <div className="mb-1 font-semibold">{z.label}</div>
                <div className="grid grid-cols-4 gap-1">
                  {(["x_pct", "y_pct", "w_pct", "h_pct"] as const).map((f) => (
                    <label key={f} className="flex flex-col text-[10px] text-muted-foreground">
                      {f.replace("_pct", "").toUpperCase()}
                      <input
                        type="number"
                        step={0.1}
                        value={z[f]}
                        onChange={(e) => {
                          const next = zones.slice();
                          next[i] = { ...z, [f]: Number(e.target.value) };
                          onZonesChange(next);
                        }}
                        className="w-full rounded border bg-background px-1 py-0.5 text-xs text-foreground"
                      />
                    </label>
                  ))}
                </div>
                <label className="mt-1 flex flex-col text-[10px] text-muted-foreground">
                  ROT°
                  <input
                    type="number"
                    step={1}
                    value={z.rotation_deg}
                    onChange={(e) => {
                      const next = zones.slice();
                      next[i] = { ...z, rotation_deg: Number(e.target.value) };
                      onZonesChange(next);
                    }}
                    className="w-full rounded border bg-background px-1 py-0.5 text-xs text-foreground"
                  />
                </label>
                <label className="mt-1 flex items-center gap-1 text-[10px]">
                  <input
                    type="checkbox"
                    checked={z.solid}
                    onChange={(e) => {
                      const next = zones.slice();
                      next[i] = { ...z, solid: e.target.checked };
                      onZonesChange(next);
                    }}
                  />
                  Sólido (cobre a imagem)
                </label>
              </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Slots (patch/bordado/etiqueta)</div>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={s.key} className="rounded border bg-background p-2 text-xs">
                <div className="mb-1 font-semibold">{s.label}</div>
                <div className="grid grid-cols-3 gap-1">
                  {(["x_pct", "y_pct", "w_pct", "h_pct", "rotation_deg"] as const).map((f) => (
                    <label key={f} className="flex flex-col text-[10px] text-muted-foreground">
                      {f === "rotation_deg" ? "ROT°" : f.replace("_pct", "").toUpperCase()}
                      <input
                        type="number"
                        step={f === "rotation_deg" ? 1 : 0.1}
                        value={s[f]}
                        onChange={(e) => {
                          const next = slots.slice();
                          next[i] = { ...s, [f]: Number(e.target.value) };
                          onSlotsChange(next);
                        }}
                        className="w-full rounded border bg-background px-1 py-0.5 text-xs text-foreground"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ IMAGE UPLOADER ============

function ImageUploader({
  value,
  onChange,
  hint,
}: {
  value: { data_url: string; filename: string } | null;
  onChange: (v: { data_url: string; filename: string } | null) => void;
  hint?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  function fileToDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
      setError("Formato não suportado. Envie PNG, JPG, WEBP ou SVG.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 4MB.");
      return;
    }
    // SVG não precisa remoção de fundo.
    if (file.type === "image/svg+xml") {
      const data_url = await fileToDataUrl(file);
      onChange({ data_url, filename: file.name });
      return;
    }
    setProcessing(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, { output: { format: "image/png" } });
      const data_url = await fileToDataUrl(blob);
      onChange({ data_url, filename: file.name.replace(/\.[^.]+$/, "") + ".png" });
    } catch (err) {
      console.error("Background removal failed, using original:", err);
      const data_url = await fileToDataUrl(file);
      onChange({ data_url, filename: file.name });
      setError("Não foi possível remover o fundo automaticamente. Imagem original mantida.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="rounded-md border p-3">
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value.data_url} alt={value.filename} className="h-16 w-16 rounded border object-contain bg-muted" />
          <div className="flex-1 truncate text-xs">
            <div className="font-semibold truncate">{value.filename}</div>
            <div className="text-muted-foreground">Enviado — fundo removido</div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" /> remover
          </button>
        </div>
      ) : (
        <label
          className={`flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-6 text-sm ${
            processing
              ? "cursor-wait text-muted-foreground opacity-70"
              : "cursor-pointer text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>{processing ? "Removendo fundo..." : "Clique para enviar imagem"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            disabled={processing}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      {hint && <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>}
      {error && <div className="mt-2 text-[11px] font-semibold text-destructive">{error}</div>}
    </div>
  );
}
