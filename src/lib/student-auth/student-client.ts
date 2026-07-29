// Cliente Supabase DEDICADO ao Portal do Aluno (/app/*).
//
// Objetivo: isolar a sessão do aluno da sessão do painel administrativo
// (AMT Fight Wear /admin) e do Dojo Manager (/dojo/*) na MESMA origem.
// A separação é feita usando um `storageKey` diferente do cliente principal,
// portanto login em /app NÃO derruba a sessão do /admin e vice-versa.
//
// NÃO importe este cliente fora de /app/* — o restante do app deve continuar
// usando `@/integrations/supabase/client`.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const STUDENT_AUTH_STORAGE_KEY = "sb-student-portal-auth";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createStudentFetch(supabaseKey: string): typeof fetch {
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
    global: { fetch: createStudentFetch(key) },
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: STUDENT_AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _client: ReturnType<typeof build> | undefined;

export const studentSupabase = new Proxy({} as ReturnType<typeof build>, {
  get(_t, prop, recv) {
    if (!_client) _client = build();
    return Reflect.get(_client, prop, recv);
  },
});
