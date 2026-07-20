import { useCallback, useState } from "react";

export type CepAddress = {
  zip: string;
  address: string;      // logradouro
  neighborhood: string; // bairro
  city: string;
  state: string;        // UF
  complement?: string;
};

/**
 * Hook para buscar endereço a partir do CEP via ViaCEP.
 * Retorna { lookup, loading, error } — `lookup(zip)` resolve com o endereço
 * ou lança erro se o CEP for inválido / não encontrado.
 */
export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (rawZip: string): Promise<CepAddress | null> => {
    const clean = (rawZip || "").replace(/\D/g, "");
    if (clean.length !== 8) {
      setError("CEP inválido");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!r.ok) throw new Error("Falha ao consultar CEP");
      const j = await r.json();
      if (j?.erro) {
        setError("CEP não encontrado");
        return null;
      }
      return {
        zip: clean,
        address: j.logradouro || "",
        neighborhood: j.bairro || "",
        city: j.localidade || "",
        state: j.uf || "",
        complement: j.complemento || "",
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao consultar CEP");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, error };
}
