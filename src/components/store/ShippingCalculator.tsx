import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { calculateShipping, type ShippingOption } from "@/lib/store/shipping.functions";
import { formatBRL } from "@/lib/store/cart-store";
import { FREE_SHIPPING_CAP, FREE_SHIPPING_THRESHOLD, freeShippingDiscountFor } from "@/lib/store/pricing";
import { Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type ShippingCalcItem = {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  /** Preço unitário efetivamente pago (após atacado/descontos). Se omitido,
   *  a cotação usará o preço de catálogo do produto. */
  unit_price?: number;
};


type Props = {
  items: ShippingCalcItem[];
  initialZip?: string;
  onSelect?: (option: ShippingOption, zip: string) => void;
  selectedId?: number | null;
  compact?: boolean;
  /** Subtotal dos produtos: quando informado, mostra o preço de cada opção já com o frete grátis. */
  freeShippingSubtotal?: number;
};

export function ShippingCalculator({ items, initialZip, onSelect, selectedId, compact, freeShippingSubtotal }: Props) {
  const freeEligible = freeShippingSubtotal != null && freeShippingSubtotal >= FREE_SHIPPING_THRESHOLD;
  const [zip, setZip] = useState(initialZip ?? "");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ShippingOption[] | null>(null);
  const calc = useServerFn(calculateShipping);

  // Mantém o CEP em sincronia quando o valor vindo do formulário pai muda
  // (ex.: usuário digita o CEP no endereço e o ViaCEP preenche automaticamente).
  useEffect(() => {
    if (initialZip !== undefined) setZip(initialZip);
  }, [initialZip]);

  const handle = async () => {
    const clean = zip.replace(/\D/g, "");
    if (clean.length !== 8) {
      toast.error("Informe um CEP válido");
      return;
    }
    if (items.length === 0) {
      toast.error("Nenhum item para calcular");
      return;
    }
    setLoading(true);
    try {
      const r = await calc({ data: { to_zip: clean, items } });
      // Oculta opções indisponíveis (com erro/sem preço) e ordena do mais barato ao mais caro.
      const available = (r.options ?? [])
        .filter((o) => !o.error && Number(o.price) > 0)
        .sort((a, b) => Number(a.price) - Number(b.price));
      setOptions(available);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao calcular frete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-lg border bg-card p-4"}>
      {!compact && (
        <div className="flex items-center gap-2 text-sm font-bold">
          <Truck className="h-4 w-4 text-primary" /> Calcular frete
        </div>
      )}
      {/* Sem <form> aninhado: quando este componente é usado dentro do form de
          checkout, um <form> aqui submetia o form externo ao clicar em "OK". */}
      <div className="flex gap-2">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handle();
            }
          }}
          placeholder="00000-000"
          maxLength={9}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handle}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
        </button>
      </div>


      {options && options.length === 0 && (
        <div className="text-xs text-muted-foreground">Nenhuma opção de envio disponível.</div>
      )}

      {options && options.length > 0 && (
        <div className="space-y-2">
          {freeEligible && (
            <div className="text-xs text-emerald-700 dark:text-emerald-400">
              Frete grátis na opção mais econômica, até {formatBRL(FREE_SHIPPING_CAP)}. Nas outras, você paga só a diferença.
            </div>
          )}
          {options.map((o) => {
            const disabled = !!o.error;
            const selected = selectedId === o.id;
            const off = freeEligible ? freeShippingDiscountFor(freeShippingSubtotal!, o.price, o.cheapest_price) : 0;
            return (
              <button
                type="button"
                key={o.id}
                disabled={disabled}
                onClick={() => !disabled && onSelect?.(o, zip.replace(/\D/g, ""))}
                className={`flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm transition ${
                  selected ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {o.company_picture ? (
                  <img src={o.company_picture} alt={o.company} className="h-6 w-6 object-contain" />
                ) : (
                  <Truck className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">
                    {o.company} — {o.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.error
                      ? o.error
                      : o.delivery_range
                      ? `Entrega em ${o.delivery_range.min ?? o.delivery_time}${
                          o.delivery_range.max && o.delivery_range.max !== o.delivery_range.min
                            ? `–${o.delivery_range.max}`
                            : ""
                        } dia(s) úteis`
                      : `${o.delivery_time ?? "?"} dias úteis`}
                  </div>
                </div>
                {!o.error && (
                  <div className="text-right">
                    {off > 0 && <div className="text-[11px] text-muted-foreground line-through">{formatBRL(o.price)}</div>}
                    <div className={`font-black ${off >= o.price ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {off >= o.price ? "Grátis" : formatBRL(o.price - off)}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
