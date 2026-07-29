// Middleware client-side que anexa o bearer token correto por SUPERFÍCIE:
// - rotas /app/*        -> token do cliente do Portal do Aluno (studentSupabase)
// - demais rotas        -> token do cliente principal (admin/dojo)
//
// Isso substitui o `attachSupabaseAuth` gerado para que o login do aluno
// nunca contamine a sessão do /admin nem do /dojo.

import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { studentSupabase } from "@/lib/student-auth/student-client";

function isStudentSurface(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/app");
}

export const attachScopedSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const client = isStudentSurface() ? studentSupabase : supabase;
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
