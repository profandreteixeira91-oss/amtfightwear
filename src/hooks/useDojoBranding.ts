import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyAcademyBranding } from "@/lib/dojo/academy-public.functions";

/**
 * Retorna o branding da academia atual (nome, logo, cores) — usado por
 * documentos de impressão, cartazes e telas com identidade visual do dojo.
 */
export function useDojoBranding() {
  const brandingFn = useServerFn(getMyAcademyBranding);
  return useQuery({
    queryKey: ["dojo", "academy-branding"],
    queryFn: () => brandingFn(),
    staleTime: 5 * 60 * 1000,
  });
}
