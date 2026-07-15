import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories } from "@/lib/store/store.functions";
import { getCustomTemplate, checkIsAdmin, updateCustomLayout } from "@/lib/customshop.functions";
import { formatBRL, useCart, type CustomConfig } from "@/lib/store/cart-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Trash2, ShoppingBag, Upload, X, Settings, Save, RotateCcw } from "lucide-react";
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
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Modelo não encontrado</div>,
});

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

type Zone = {
  key: string;
  label: string;
  default_hex: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  solid: boolean;
};
type SlotRow = {
  key: string;
  label: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
};

function BuilderPage() {
  const { kind } = Route.useParams();
  const { data } = useSuspenseQuery(templateQuery(kind));
  const { data: categories } = useSuspenseQuery(catsQuery);
  const navigate = useNavigate();
  const addToCart = useCart((s) => s.add);
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
        })),
    [allSlots, variantKey],
  );

  const [zoneColors, setZoneColors] = useState<Record<string, string>>({});
  const [slotPatches, setSlotPatches] = useState<Record<string, string>>({});
  const [fabricId, setFabricId] = useState<string | null>(fabrics[0]?.id ?? null);
  const [embroideries, setEmbroideries] = useState<Record<string, { text: string; color: string; image: { data_url: string; filename: string } | null }>>({});
  const [activeZone, setActiveZone] = useState<string>(zones[0]?.key ?? "");
  const isFaixa = template.kind === "faixa";
  const [logoImage, setLogoImage] = useState<{ data_url: string; filename: string } | null>(null);
  const [labelImage, setLabelImage] = useState<{ data_url: string; filename: string } | null>(null);
  const [labelChoice, setLabelChoice] = useState<"padrao" | "custom" | null>(null);

  useEffect(() => {
    // Default: all zones transparent (no color) — user picks colors explicitly
    setZoneColors({});
    setActiveZone(zones[0]?.key ?? "");
  }, [variantKey]); // eslint-disable-line react-hooks/exhaustive-deps


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
          zones: draftZones.map((z) => ({ key: z.key, x_pct: z.x_pct, y_pct: z.y_pct, w_pct: z.w_pct, h_pct: z.h_pct, solid: z.solid })),
          slots: draftSlots.map((s) => ({ key: s.key, x_pct: s.x_pct, y_pct: s.y_pct, w_pct: s.w_pct })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-shop", "template", kind] });
      setEditMode(false);
    },
  });

  const selectedFabric = fabrics.find((f) => f.id === fabricId) ?? null;

  const patchesTotal = useMemo(() => {
    let total = 0;
    for (const [, patchId] of Object.entries(slotPatches)) {
      const p = patches.find((pp) => pp.id === patchId);
      if (p) total += Number(p.price);
    }
    return total;
  }, [slotPatches, patches]);

  const embroiderySlots = useMemo(() => {
    const bordado = slots.filter((s) => s.key.startsWith("bordado"));
    return bordado.length > 0 ? bordado : slots;
  }, [slots]);
  const activeEmbroideries = useMemo(
    () =>
      embroiderySlots
        .map((s) => ({ slot: s, e: embroideries[s.key] }))
        .filter(({ e }) => e && (e.text.trim() || e.image))
        .map(({ slot, e }) => ({ slot_key: slot.key, text: e!.text.trim() || null, image: e!.image, color: e!.color })),
    [embroiderySlots, embroideries],
  );
  const embroideryFee = activeEmbroideries.length * 39;
  const fabricDelta = selectedFabric ? Number(selectedFabric.price_delta) : 0;
  const unitPrice = Number(template.base_price) + fabricDelta + patchesTotal + embroideryFee;

  function togglePatch(slotKey: string, patchId: string) {
    setSlotPatches((prev) => {
      const next = { ...prev };
      if (next[slotKey] === patchId) delete next[slotKey];
      else next[slotKey] = patchId;
      return next;
    });
  }

  function handleAddToCart() {
    const config: CustomConfig = {
      template_id: template.id,
      template_kind: template.kind,
      template_name: template.name,
      zones: zoneColors,
      patches: Object.entries(slotPatches).map(([slot_key, patch_id]) => {
        const p = patches.find((pp) => pp.id === patch_id)!;
        return { slot_key, patch_id, patch_name: p.name, image_url: p.image_url, price: Number(p.price) };
      }),
      embroidery: null,
      embroideries: activeEmbroideries.length > 0 ? activeEmbroideries : null,
      fabric: selectedFabric
        ? { id: selectedFabric.id, name: selectedFabric.name, price_delta: Number(selectedFabric.price_delta) }
        : null,
      modality: isFaixa ? activeVariant.label : null,
      logo_image: isFaixa ? logoImage : null,
      label_image: isFaixa && labelChoice === "custom" ? labelImage : null,
      label_choice: isFaixa ? labelChoice : null,
    };
    addToCart({
      product_id: crypto.randomUUID(),
      variant_id: null,
      name: `${template.name} — Personalizado${variants.length > 1 ? ` · ${activeVariant.label}` : ""}`,
      variant_label: `Custom · ${selectedFabric?.name ?? "Padrão"}`,
      slug: `custom-${template.kind}`,
      image_url: template.base_image_url ?? null,
      unit_price: unitPrice,
      quantity: 1,
      type: "custom",
      custom_config: config,
      production_days: template.production_days,
    });
    navigate({ to: "/loja/carrinho" });
  }

  const shownZones = editMode ? draftZones : zones;
  const shownSlots = editMode ? draftSlots : slots;

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 text-xs text-muted-foreground">
          <Link to="/loja/custom-shop" className="hover:text-primary">Custom Shop</Link> / <span className="text-foreground">{template.name}</span>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {/* Preview */}
          <div className="rounded-xl border bg-card p-4">
            <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-lg bg-muted">
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

          {/* Controls */}
          <div className="space-y-6">
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
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">{isFaixa ? "Modalidade" : "Variante"}</h2>
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
              </section>
            )}

            {/* Fabric / Alma */}
            {fabrics.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">{isFaixa ? "Alma (núcleo)" : "Tecido / gramatura"}</h2>
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
              </section>
            )}

            {/* Judô: presets oficiais de cor (corpo + ponta) */}
            {variantKey === "judo" && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Cores da faixa</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {JUDO_PRESETS.map((p) => {
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
              </section>
            )}

            {/* Zone colors (não-judô) */}
            {variantKey !== "judo" && zones.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Cores</h2>
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
              </section>
            )}

            {/* Patches */}
            {slots.length > 0 && patches.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Patches / logos</h2>
                <div className="space-y-3">
                  {slots.map((s) => {
                    const chosen = slotPatches[s.key];
                    return (
                      <div key={s.key} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{s.label}</div>
                          {chosen && (
                            <button
                              type="button"
                              onClick={() => setSlotPatches((prev) => { const n = { ...prev }; delete n[s.key]; return n; })}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" /> remover
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {patches.map((p) => {
                            const active = chosen === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePatch(s.key, p.id)}
                                className={`relative flex flex-col items-center gap-1 rounded-md border p-2 transition ${
                                  active ? "border-primary bg-primary/5" : "hover:border-foreground/40"
                                }`}
                                title={p.name}
                              >
                                <img src={p.image_url} alt={p.name} className="h-12 w-12 object-contain" />
                                <div className="text-[10px] leading-none">{p.name}</div>
                                <div className="text-[10px] font-bold text-primary">+ {formatBRL(Number(p.price))}</div>
                                {active && (
                                  <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                    <Check className="h-2.5 w-2.5" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Embroidery — one entry per bordado slot (text or image) */}
            {embroiderySlots.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">
                  {embroiderySlots.length > 1 ? "Bordados" : "Bordado de texto ou logo"}
                </h2>
                <div className="space-y-3">
                  {embroiderySlots.map((s) => {
                    const entry = embroideries[s.key] ?? { text: "", color: "#ffffff", image: null };
                    const setEntry = (patch: Partial<typeof entry>) =>
                      setEmbroideries((prev) => ({ ...prev, [s.key]: { ...(prev[s.key] ?? { text: "", color: "#ffffff", image: null }), ...patch } }));
                    const active = entry.text.trim() || entry.image;
                    return (
                      <div key={s.key} className="rounded-md border p-3 space-y-3">
                        <div className="text-xs font-bold uppercase text-muted-foreground">{s.label}</div>
                        <input
                          type="text"
                          maxLength={20}
                          value={entry.text}
                          onChange={(e) => setEntry({ text: e.target.value })}
                          placeholder="Texto do bordado (até 20 caracteres)"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        <ImageUploader
                          value={entry.image}
                          onChange={(img) => setEntry({ image: img })}
                          hint="Ou envie um logo para simular bordado (PNG/JPG, até 4MB)."
                        />
                        {active && (
                          <>
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
                            <div className="text-xs font-bold text-primary">Taxa de bordado: + {formatBRL(39)}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Faixa: Logo upload (hidden when there are per-bordado image uploads) */}
            {isFaixa && variantKey !== "judo" && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Logotipo do bordado (opcional)</h2>
                <ImageUploader
                  value={logoImage}
                  onChange={setLogoImage}
                  hint="Envie o logo que será bordado junto ao nome (PNG/JPG, até 4MB)."
                />
              </section>
            )}

            {/* Faixa: Etiqueta — AMT Padrão OU imagem personalizada */}
            {isFaixa && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Etiqueta (opcional)</h2>
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
                      Personalizada
                      <div className="mt-1 text-[10px] font-normal text-muted-foreground">Envie sua imagem</div>
                    </button>
                  </div>
                  {labelChoice === "custom" && (
                    <ImageUploader
                      value={labelImage}
                      onChange={setLabelImage}
                      hint="PNG/JPG, até 4MB — ficará pré-posicionada na ponta da faixa."
                    />
                  )}
                  {labelChoice === "padrao" && (
                    <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      Etiqueta AMT Padrão selecionada. A arte oficial será aplicada na produção.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Summary + CTA */}
            <div className="rounded-lg border bg-card p-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Base ({template.name})</span><span>{formatBRL(Number(template.base_price))}</span></div>
                {fabricDelta > 0 && <div className="flex justify-between"><span>{selectedFabric?.name}</span><span>+ {formatBRL(fabricDelta)}</span></div>}
                {patchesTotal > 0 && <div className="flex justify-between"><span>Patches</span><span>+ {formatBRL(patchesTotal)}</span></div>}
                {embroideryFee > 0 && <div className="flex justify-between"><span>Bordado</span><span>+ {formatBRL(embroideryFee)}</span></div>}
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
}: {
  kind: string;
  variantKey: string;
  zones: Zone[];
  zoneColors: Record<string, string>;
  slots: SlotRow[];
  slotPatches: Record<string, string>;
  patches: Patch[];
  embroideries: Array<{ slot_key: string; text: string | null; image: { data_url: string; filename: string } | null; color: string }>;
  labelImage?: { data_url: string; filename: string } | null;
}) {
  const isJudo = kind === "faixa" && variantKey === "judo";
  const baseImg = isJudo ? faixaJudoBase : BASE_IMAGES[kind];

  return (
    <div className="relative h-full w-full overflow-hidden">
      {baseImg && (
        <img
          src={baseImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Zones */}
        {zones.map((z) => {
          const color = zoneColors[z.key];
          if (!color) return null; // transparent by default
          return (
            <rect
              key={z.key}
              x={z.x_pct}
              y={z.y_pct}
              width={z.w_pct}
              height={z.h_pct}
              fill={color}
              style={z.solid ? undefined : { mixBlendMode: "multiply" }}
            />
          );
        })}

        {/* Contrast pass */}
        {baseImg && (
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
          const x = s.x_pct - w / 2;
          const y = s.y_pct - w / 2;
          return (
            <g key={s.key} style={{ filter: "drop-shadow(0 0.4px 0.6px rgba(0,0,0,0.35))" }}>
              <image
                href={p.image_url}
                x={x}
                y={y}
                width={w}
                height={w}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          );
        })}

        {/* Label image on etiqueta / ponta */}
        {labelImage && (() => {
          const target = slots.find((s) => s.key === "etiqueta") ?? slots.find((s) => s.key === "ponta") ?? slots[0];
          if (!target) return null;
          const w = target.w_pct;
          return (
            <g style={{ filter: "drop-shadow(0 0.4px 0.6px rgba(0,0,0,0.35))" }}>
              <image
                href={labelImage.data_url}
                x={target.x_pct - w / 2}
                y={target.y_pct - w / 2}
                width={w}
                height={w}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          );
        })()}

        {/* Embroideries — text and/or image per bordado slot */}
        {embroideries.map((emb) => {
          const slot = slots.find((s) => s.key === emb.slot_key);
          if (!slot) return null;
          const w = slot.w_pct;
          return (
            <g key={emb.slot_key}>
              {emb.image && (
                <g style={{ filter: "drop-shadow(0 0.15px 0.2px rgba(0,0,0,0.45))" }}>
                  <image
                    href={emb.image.data_url}
                    x={slot.x_pct - w / 2}
                    y={slot.y_pct - w / 2}
                    width={w}
                    height={w}
                    preserveAspectRatio="xMidYMid meet"
                    opacity={0.95}
                  />
                </g>
              )}
              {emb.text && (() => {
                const fontSize = Math.max(2.6, slot.w_pct * 0.35);
                const yOffset = emb.image ? slot.w_pct * 0.75 : slot.w_pct * 0.55;
                return (
                  <text
                    x={slot.x_pct}
                    y={slot.y_pct + yOffset}
                    textAnchor="middle"
                    fontFamily="Georgia, 'Times New Roman', serif"
                    fontWeight={700}
                    fontStyle="italic"
                    fontSize={fontSize}
                    fill={emb.color}
                    stroke="rgba(0,0,0,0.35)"
                    strokeWidth={0.12}
                    paintOrder="stroke fill"
                    style={{ filter: "drop-shadow(0 0.15px 0.2px rgba(0,0,0,0.45))" }}
                  >
                    {emb.text}
                  </text>
                );
              })()}
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
  | { kind: "slot-move"; index: number; startX: number; startY: number; origX: number; origY: number }
  | { kind: "slot-resize"; index: number; startX: number; startY: number; origW: number }
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
        next[drag.index] = {
          ...next[drag.index],
          x_pct: clamp(drag.origX + dx, -50, 150),
          y_pct: clamp(drag.origY + dy, -50, 150),
        };
        onZonesChange(next);
      } else if (drag.kind === "zone-resize") {
        const dx = p.x - drag.startX;
        const dy = p.y - drag.startY;
        const next = zones.slice();
        next[drag.index] = {
          ...next[drag.index],
          w_pct: clamp(drag.origW + dx, 1, 200),
          h_pct: clamp(drag.origH + dy, 1, 200),
        };
        onZonesChange(next);
      } else if (drag.kind === "slot-move") {
        const dx = p.x - drag.startX;
        const dy = p.y - drag.startY;
        const next = slots.slice();
        next[drag.index] = {
          ...next[drag.index],
          x_pct: clamp(drag.origX + dx, -50, 150),
          y_pct: clamp(drag.origY + dy, -50, 150),
        };
        onSlotsChange(next);
      } else if (drag.kind === "slot-resize") {
        const dx = p.x - drag.startX;
        const next = slots.slice();
        next[drag.index] = {
          ...next[drag.index],
          w_pct: clamp(drag.origW + dx * 2, 1, 100),
        };
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
        {zones.map((z, i) => (
          <g key={`z-${z.key}`}>
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
          </g>
        ))}
        {slots.map((s, i) => {
          const w = s.w_pct;
          const x = s.x_pct - w / 2;
          const y = s.y_pct - w / 2;
          return (
            <g key={`s-${s.key}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={w}
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
                y={y + w - 1.2}
                width={1.2}
                height={1.2}
                fill="#f43f5e"
                style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const p = toPct(e);
                  setDrag({ kind: "slot-resize", index: i, startX: p.x, startY: p.y, origW: s.w_pct });
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
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
            {zones.map((z, i) => (
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
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Slots (patch/bordado/etiqueta)</div>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={s.key} className="rounded border bg-background p-2 text-xs">
                <div className="mb-1 font-semibold">{s.label}</div>
                <div className="grid grid-cols-3 gap-1">
                  {(["x_pct", "y_pct", "w_pct"] as const).map((f) => (
                    <label key={f} className="flex flex-col text-[10px] text-muted-foreground">
                      {f.replace("_pct", "").toUpperCase()}
                      <input
                        type="number"
                        step={0.1}
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

  function handleFile(file: File | null) {
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
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ data_url: String(reader.result), filename: file.name });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-md border p-3">
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value.data_url} alt={value.filename} className="h-16 w-16 rounded border object-contain bg-muted" />
          <div className="flex-1 truncate text-xs">
            <div className="font-semibold truncate">{value.filename}</div>
            <div className="text-muted-foreground">Enviado</div>
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
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" />
          <span>Clique para enviar imagem</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      {hint && <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>}
      {error && <div className="mt-2 text-[11px] font-semibold text-destructive">{error}</div>}
    </div>
  );
}
