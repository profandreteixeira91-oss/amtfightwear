// Server middleware for the student PWA. Runs after the standard
// requireSupabaseAuth logic but also propagates the `x-active-student`
// request header to Supabase / PostgREST so `public.get_my_student_id()`
// picks the caller-chosen student (validated by `is_my_student` in SQL).
//
// A caller cannot escalate privileges by lying in this header: the DB
// helper always verifies the id belongs to the current auth user.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
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

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const requireStudentAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment. Connect Supabase in Lovable Cloud.");
  }

  const request = getRequest();
  if (!request?.headers) throw new Error("Unauthorized: No request headers available");

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.slice("Bearer ".length);
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");

  const rawActive = request.headers.get("x-active-student") ?? "";
  const activeStudentId = UUID_RE.test(rawActive) ? rawActive : null;

  const extraHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (activeStudentId) extraHeaders["x-active-student"] = activeStudentId;

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: extraHeaders,
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized: Invalid token");

  const { data: studentId, error: studentError } = await supabase.rpc("get_my_student_id");
  if (studentError || !studentId) {
    throw new Error("Acesso ao app indisponível. Fale com sua academia para reativar sua matrícula.");
  }

  return next({
    context: {
      supabase,
      userId: data.claims.sub,
      claims: data.claims,
      activeStudentId,
    },
  });
});
