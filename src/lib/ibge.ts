// Cliente para autocomplete de cidades brasileiras via IBGE + geocoding via Nominatim.
// Ambos são APIs públicas gratuitas (uso leve, cacheado no cliente).

export type IbgeCity = {
  id: number;
  nome: string;
  uf: string; // sigla estado
  ufName: string;
};

export const NORDESTE_UFS = ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] as const;

let cache: IbgeCity[] | null = null;
let inflight: Promise<IbgeCity[]> | null = null;

export async function loadCities(): Promise<IbgeCity[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(
      "https://servicodosdados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado",
    );
    if (!res.ok) throw new Error("Falha ao carregar cidades do IBGE");
    const raw = (await res.json()) as Array<{
      "municipio-id": number;
      "municipio-nome": string;
      "UF-sigla": string;
      "UF-nome": string;
    }>;
    cache = raw.map((r) => ({
      id: r["municipio-id"],
      nome: r["municipio-nome"],
      uf: r["UF-sigla"],
      ufName: r["UF-nome"],
    }));
    return cache;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function searchCities(query: string, limit = 8): IbgeCity[] {
  if (!cache || !query.trim()) return [];
  const q = normalize(query);
  return cache
    .filter((c) => normalize(c.nome).includes(q) || normalize(`${c.nome} ${c.uf}`).includes(q))
    .sort((a, b) => {
      const an = normalize(a.nome);
      const bn = normalize(b.nome);
      const ax = an.startsWith(q) ? 0 : 1;
      const bx = bn.startsWith(q) ? 0 : 1;
      if (ax !== bx) return ax - bx;
      return a.nome.localeCompare(b.nome);
    })
    .slice(0, limit);
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function geocodeCity(
  city: IbgeCity,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${city.nome}, ${city.ufName}, Brasil`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`,
      { headers: { "Accept-Language": "pt-BR" } },
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!arr.length) return null;
    return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
  } catch {
    return null;
  }
}
