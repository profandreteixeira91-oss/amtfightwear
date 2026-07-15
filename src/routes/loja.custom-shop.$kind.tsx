import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories } from "@/lib/store/store.functions";
import { getCustomTemplate } from "@/lib/customshop.functions";
import { formatBRL, useCart, type CustomConfig } from "@/lib/store/cart-store";
import { useMemo, useState } from "react";
import { Check, Plus, Trash2, ShoppingBag, Upload, X } from "lucide-react";
import kimonoBase from "@/assets/customshop-kimono.jpg";
import rashguardBase from "@/assets/customshop-rashguard.jpg";
import faixaBase from "@/assets/customshop-faixa.jpg";


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

function BuilderPage() {
  const { kind } = Route.useParams();
  const { data } = useSuspenseQuery(templateQuery(kind));
  const { data: categories } = useSuspenseQuery(catsQuery);
  const navigate = useNavigate();
  const addToCart = useCart((s) => s.add);

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

  const { template, zones, slots, fabrics, patches } = data;

  const [zoneColors, setZoneColors] = useState<Record<string, string>>(() =>
    Object.fromEntries(zones.map((z) => [z.key, z.default_hex])),
  );
  const [slotPatches, setSlotPatches] = useState<Record<string, string>>({}); // slot_key -> patch_id
  const [fabricId, setFabricId] = useState<string | null>(fabrics[0]?.id ?? null);
  const [embroideryText, setEmbroideryText] = useState("");
  const [embroiderySlot, setEmbroiderySlot] = useState<string | null>(null);
  const [embroideryColor, setEmbroideryColor] = useState("#ffffff");
  const [activeZone, setActiveZone] = useState<string>(zones[0]?.key ?? "");
  const isFaixa = template.kind === "faixa";
  const [modality, setModality] = useState<string>("Jiu-Jitsu");
  const [logoImage, setLogoImage] = useState<{ data_url: string; filename: string } | null>(null);
  const [labelImage, setLabelImage] = useState<{ data_url: string; filename: string } | null>(null);

  const selectedFabric = fabrics.find((f) => f.id === fabricId) ?? null;

  const patchesTotal = useMemo(() => {
    let total = 0;
    for (const [, patchId] of Object.entries(slotPatches)) {
      const p = patches.find((pp) => pp.id === patchId);
      if (p) total += Number(p.price);
    }
    return total;
  }, [slotPatches, patches]);

  const embroideryFee = embroideryText.trim() ? 39 : 0;
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
      embroidery: embroideryText.trim() && embroiderySlot
        ? { text: embroideryText.trim(), slot_key: embroiderySlot, color: embroideryColor }
        : null,
      fabric: selectedFabric
        ? { id: selectedFabric.id, name: selectedFabric.name, price_delta: Number(selectedFabric.price_delta) }
        : null,
      modality: isFaixa ? modality : null,
      logo_image: isFaixa ? logoImage : null,
      label_image: isFaixa ? labelImage : null,
    };
    addToCart({
      product_id: crypto.randomUUID(),
      variant_id: null,
      name: `${template.name} — Personalizado${isFaixa ? ` · ${modality}` : ""}`,
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

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 text-xs text-muted-foreground">
          <Link to="/loja/custom-shop" className="hover:text-primary">Custom Shop</Link> / <span className="text-foreground">{template.name}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* Preview */}
          <div className="sticky top-24 h-fit rounded-xl border bg-card p-4">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
              <BuilderPreview
                kind={template.kind}
                zoneColors={zoneColors}
                slots={slots}
                slotPatches={slotPatches}
                patches={patches}
                embroidery={
                  embroideryText.trim() && embroiderySlot
                    ? { text: embroideryText.trim(), slot_key: embroiderySlot, color: embroideryColor }
                    : null
                }
              />
            </div>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Pré-visualização ilustrativa 2D. Produto final pode variar em tonalidade.
            </div>
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

            {/* Modality (faixa) */}
            {isFaixa && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Modalidade</h2>
                <div className="grid grid-cols-2 gap-2">
                  {["Jiu-Jitsu", "Judô"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModality(m)}
                      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        modality === m ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/40"
                      }`}
                    >
                      {m}
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

            {/* Zone colors */}
            {zones.length > 0 && (
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
                        style={{ background: zoneColors[z.key] }}
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

            {/* Embroidery */}
            {slots.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Bordado de texto</h2>
                <div className="rounded-md border p-3 space-y-3">
                  <input
                    type="text"
                    maxLength={20}
                    value={embroideryText}
                    onChange={(e) => {
                      setEmbroideryText(e.target.value);
                      if (e.target.value && !embroiderySlot) setEmbroiderySlot(slots[0].key);
                    }}
                    placeholder="Seu nome ou apelido (opcional, até 20 caracteres)"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  {embroideryText.trim() && (
                    <>
                      <div>
                        <div className="mb-1 text-xs font-semibold text-muted-foreground">Posição</div>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((s) => (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => setEmbroiderySlot(s.key)}
                              className={`rounded-full border px-3 py-1 text-xs ${
                                embroiderySlot === s.key ? "border-primary bg-primary/5" : "hover:border-foreground/40"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-semibold text-muted-foreground">Cor do bordado</div>
                        <div className="flex flex-wrap gap-2">
                          {PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEmbroideryColor(c)}
                              className={`h-6 w-6 rounded-full border-2 ${
                                embroideryColor === c ? "border-primary scale-110" : "border-foreground/20"
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
              </section>
            )}

            {/* Faixa: Logo upload */}
            {isFaixa && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Logotipo do bordado (opcional)</h2>
                <ImageUploader
                  value={logoImage}
                  onChange={setLogoImage}
                  hint="Envie o logo que será bordado junto ao nome (PNG/JPG, até 4MB)."
                />
              </section>
            )}

            {/* Faixa: Label tip upload */}
            {isFaixa && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Etiqueta da ponta (opcional)</h2>
                <ImageUploader
                  value={labelImage}
                  onChange={setLabelImage}
                  hint="Imagem que ficará pré-posicionada na ponta da faixa (PNG/JPG, até 4MB)."
                />
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

type Slot = { key: string; label: string; x_pct: number; y_pct: number; w_pct: number };
type Patch = { id: string; name: string; image_url: string };
type ZonePath = { key: string; d: string; solid?: boolean };

// Zone paths mapped to the actual product photos (viewBox 0 0 100 100).
// Each path traces the region on the base photo that should be tinted with the
// zone color. Zones marked `solid: true` fully replace the base pixels (used
// for dark defaults like the faixa's ponta, where multiply can't lighten).
const ZONES: Record<string, ZonePath[]> = {
  kimono: [
    // Jaqueta: sleeves band + torso (cuffs will be overlaid on top as punho)
    { key: "jaqueta", d: "M 0 10 L 100 10 L 100 26 L 72 26 L 72 60 L 28 60 L 28 26 L 0 26 Z" },
    // Punho: outer cuff caps at sleeve ends
    { key: "punho", d: "M 0 10 L 8 10 L 8 26 L 0 26 Z M 92 10 L 100 10 L 100 26 L 92 26 Z" },
    // Gola: V-shape lapel down the center of the jacket
    { key: "gola", d: "M 42 8 L 50 60 L 58 8 L 54 8 L 50 48 L 46 8 Z" },
    // Calça: pants block below with a subtle leg-split at the center
    { key: "calca", d: "M 27 62 L 73 62 L 74 96 L 60 96 L 55 70 L 50 96 L 45 96 L 46 70 L 40 96 L 26 96 Z" },
  ],
  rashguard: [
    { key: "base", d: "M 34 22 L 66 22 L 68 87 L 32 87 Z" },
    { key: "manga", d: "M 8 27 L 34 22 L 38 62 L 14 68 Z M 66 22 L 92 27 L 86 68 L 62 62 Z" },
    // Costas: subtle collar band + side seams accent
    { key: "costas", d: "M 44 22 L 56 22 L 56 26 L 44 26 Z M 33 22 L 35 87 L 34 87 L 32 22 Z M 65 22 L 67 22 L 68 87 L 66 87 Z" },
  ],
  faixa: [
    { key: "corpo", d: "M 2 44 L 71 44 L 71 57 L 2 57 Z" },
    { key: "ponta", d: "M 71 44 L 98 44 L 98 57 L 71 57 Z", solid: true },
  ],
};

const BASE_IMAGES: Record<string, string> = {
  kimono: kimonoBase,
  rashguard: rashguardBase,
  faixa: faixaBase,
};

function BuilderPreview({
  kind,
  zoneColors,
  slots,
  slotPatches,
  patches,
  embroidery,
}: {
  kind: string;
  zoneColors: Record<string, string>;
  slots: Slot[];
  slotPatches: Record<string, string>;
  patches: Patch[];
  embroidery: { text: string; slot_key: string; color: string } | null;
}) {
  const zones = ZONES[kind] ?? [];
  const baseImg = BASE_IMAGES[kind];

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
        {/* Tint layers — photo tint via multiply for light-base zones; solid for dark-base zones */}
        {zones.map((z) => {
          const color = zoneColors[z.key];
          if (!color) return null;
          if (z.solid) {
            return (
              <path key={z.key} d={z.d} fill={color}>
                {/* subtle inner shadow via filter would be nice, kept minimal for perf */}
              </path>
            );
          }
          return (
            <path
              key={z.key}
              d={z.d}
              fill={color}
              style={{ mixBlendMode: "multiply" }}
            />
          );
        })}

        {/* Contrast pass: gently re-emphasize fabric shadows on top of the tint.
            Uses the base photo again with 'multiply' at low opacity so folds/creases stay visible. */}
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

        {/* Embroidery */}
        {embroidery && (() => {
          const slot = slots.find((s) => s.key === embroidery.slot_key);
          if (!slot) return null;
          const fontSize = Math.max(2.6, slot.w_pct * 0.35);
          const x = slot.x_pct;
          const y = slot.y_pct + slot.w_pct * 0.55;
          return (
            <text
              x={x}
              y={y}
              textAnchor="middle"
              fontFamily="Georgia, 'Times New Roman', serif"
              fontWeight={700}
              fontStyle="italic"
              fontSize={fontSize}
              fill={embroidery.color}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.12}
              paintOrder="stroke fill"
              style={{ filter: "drop-shadow(0 0.15px 0.2px rgba(0,0,0,0.45))" }}
            >
              {embroidery.text}
            </text>
          );
        })()}
      </svg>
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


