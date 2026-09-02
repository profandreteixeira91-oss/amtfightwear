// Middleware client-side que anexa o bearer token correto por SUPERFÍCIE:
// - rotas /app/*          -> token do Portal do Aluno (studentSupabase)
// - rotas /dojo/staff/*   -> token do Portal da Equipe (staffSupabase)
// - demais rotas          -> token do cliente principal (admin/dono do dojo)
//
// Isso substitui o `attachSupabaseAuth` gerado para que o login do aluno ou do
// professor nunca contamine (nem derrube) a sessão do /admin nem do /dojo/app.

import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { studentSupabase } from "@/lib/student-auth/student-client";
import { staffSupabase } from "@/lib/dojo/staff-auth/staff-client";

function surfaceClient() {
  if (typeof window === "undefined") return supabase;
  const path = window.location.pathname;
  if (path.startsWith("/app")) return studentSupabase;
  if (path.startsWith("/dojo/staff")) return staffSupabase;
  return supabase;
}

export const attachScopedSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await surfaceClient().auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
