import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugSchema = z.object({ slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/) });

export type PublicAcademy = {
  slug: string;
  trade_name: string | null;
  legal_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  city: string | null;
  state: string | null;
};

// Public — no auth. Returns branding only (safe to expose).
export const getAcademyBySlug = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => slugSchema.parse(i))
  .handler(async ({ data }): Promise<PublicAcademy | null> => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input as any, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await client.rpc("get_academy_by_slug", { _slug: data.slug });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return (row as PublicAcademy) ?? null;
  });

// Authenticated — used by admin QR/install poster to know its own slug.
export const getMyAcademySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Filtrar explicitamente por owner_id: a RLS também expõe a linha da
    // academia onde o usuário é aluno (policy "Student reads own academy
    // branding"), o que pode retornar a academia errada em .maybeSingle().
    const { data, error } = await context.supabase
      .from("dojo_academy_profile")
      .select("slug, trade_name, legal_name")
      .eq("owner_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as { slug: string | null; trade_name: string | null; legal_name: string | null } | null;
  });

// Authenticated — branding of the current admin's academy (logo + name + colors).
export const getMyAcademyBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Mesmo motivo: garantir a linha da PRÓPRIA academia do usuário logado.
    const { data, error } = await context.supabase
      .from("dojo_academy_profile")
      .select("slug, trade_name, legal_name, logo_url, brand_primary, brand_secondary")
      .eq("owner_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as {
      slug: string | null;
      trade_name: string | null;
      legal_name: string | null;
      logo_url: string | null;
      brand_primary: string | null;
      brand_secondary: string | null;
    } | null;
  });
