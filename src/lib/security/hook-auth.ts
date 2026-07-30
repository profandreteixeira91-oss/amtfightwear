/**
 * Autenticação dos endpoints internos de automação (cron / triggers do banco).
 *
 * Todas as rotinas internas são chamadas pelo pg_cron/pg_net enviando o header
 * `apikey` do projeto. Este guard apenas rejeita chamadas anônimas vindas da
 * internet — o comportamento das automações permanece exatamente o mesmo.
 *
 * Webhooks de terceiros (Asaas, Mercado Pago, Instagram, Melhor Envio) NÃO usam
 * este guard: eles têm verificação própria de assinatura/token.
 */
export function checkInternalHookAuth(request: Request): Response | null {
  const expected = [
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.CRON_SECRET,
  ].filter((v): v is string => !!v && v.length > 10);

  if (expected.length === 0) {
    // Sem chave configurada no ambiente: falha fechada.
    return new Response("Unauthorized", { status: 401 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const provided = [
    request.headers.get("apikey") ?? "",
    request.headers.get("x-cron-secret") ?? "",
    auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "",
  ].filter(Boolean);

  const ok = provided.some((p) => expected.some((e) => e === p));
  return ok ? null : new Response("Unauthorized", { status: 401 });
}
