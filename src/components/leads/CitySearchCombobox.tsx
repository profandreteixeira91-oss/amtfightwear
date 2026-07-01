import { useEffect, useMemo, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadCities, searchCities, NORDESTE_UFS, type IbgeCity } from "@/lib/ibge";
import { cn } from "@/lib/utils";

export type SelectedCity = {
  name: string;
  uf: string;
  ufName: string;
  label: string; // "São Paulo, SP"
};

export function CitySearchCombobox({
  value,
  onChange,
  placeholder = "Digite uma cidade (ex.: São Paulo)",
}: {
  value: SelectedCity | null;
  onChange: (city: SelectedCity | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadCities()
      .then(() => setReady(true))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => (ready ? searchCities(q, 8) : []), [q, ready]);
  const nordesteSet = useMemo(() => new Set<string>(NORDESTE_UFS), []);

  function select(c: IbgeCity) {
    const label = `${c.nome}, ${c.uf}`;
    onChange({ name: c.nome, uf: c.uf, ufName: c.ufName, label });
    setQ(label);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          value={q}
          placeholder={loading ? "Carregando cidades..." : placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (value && e.target.value !== value.label) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={loading}
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1 text-sm">
            {results.map((c) => {
              const isNe = nordesteSet.has(c.uf);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(c);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-accent",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {c.nome}
                        <span className="ml-1 text-xs text-muted-foreground">— {c.ufName}</span>
                      </span>
                    </span>
                    <Badge variant={isNe ? "default" : "outline"} className="h-5 text-[10px]">
                      {c.uf}
                      {isNe ? " · NE" : ""}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
