// Cliente Supabase DEDICADO ao Portal da Equipe (/dojo/staff/*).
//
// Invariante: a sessão do professor (STAFF) é armazenada em um `storageKey`
// próprio, portanto o login/logout do professor NUNCA derruba, substitui ou
// invalida a sessão do dono do dojo (`@/integrations/supabase/client`) nem a
// do aluno (`@/lib/student-auth/student-client`). As três superfícies
// coexistem na mesma origem com identidades independentes.
//
// NÃO importe este cliente fora de /dojo/staff/*.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const STAFF_AUTH_STORAGE_KEY = "sb-staff-portal-auth";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createStaffFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function build() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient<Database>(url, key, {
    global: { fetch: createStaffFetch(key) },
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: STAFF_AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _client: ReturnType<typeof build> | undefined;

export const staffSupabase = new Proxy({} as ReturnType<typeof build>, {
  get(_t, prop, recv) {
    if (!_client) _client = build();
    return Reflect.get(_client, prop, recv);
  },
});
