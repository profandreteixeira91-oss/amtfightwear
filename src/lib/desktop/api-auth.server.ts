// Autenticação das rotas de integração com o aplicativo desktop.
// Valida o Bearer JWT do usuário e devolve um client Supabase que atua
// como esse usuário (RLS aplicada — nunca service_role).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type DesktopAuth =
  | { ok: true; supabase: SupabaseClient<Database>; userId: string }
  | { ok: false; response: Response };

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(message: string, status: number, code?: string): Response {
  return jsonResponse({ success: false, error: { message, code: code ?? null } }, status);
}

export async function authenticateDesktopRequest(request: Request): Promise<DesktopAuth> {
  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return { ok: false, response: errorResponse("Backend indisponível.", 500, "config_missing") };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: errorResponse("Authorization: Bearer <access_token> é obrigatório.", 401, "missing_token"),
    };
  }
  const token = authHeader.slice(7).trim();
  if (!token || token.split(".").length !== 3) {
    return { ok: false, response: errorResponse("Token inválido.", 401, "invalid_token") };
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: errorResponse("Token inválido ou expirado.", 401, "invalid_token") };
  }

  return { ok: true, supabase, userId: data.user.id };
}
