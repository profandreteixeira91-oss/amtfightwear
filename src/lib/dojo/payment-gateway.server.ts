// Helpers para carregar a configuração do gateway de pagamento de um dono de dojo.
// Usa supabaseAdmin (bypass RLS) — chame só a partir de código servidor autorizado.

export type OwnerGateway = {
  id: string;
  owner_id: string;
  provider: "mercadopago" | "asaas" | "pagseguro";
  label: string | null;
  access_token: string | null;
  public_key: string | null;
  webhook_secret: string | null;
  is_default: boolean;
  active: boolean;
};

/** Retorna o gateway padrão ativo do dono, ou null. */
export async function getOwnerDefaultGateway(ownerId: string): Promise<OwnerGateway | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("dojo_payment_gateways")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("active", true)
    .eq("is_default", true)
    .maybeSingle();
  return (data as OwnerGateway | null) ?? null;
}

/** Retorna qualquer gateway ativo do dono que atenda ao provider preferido. */
export async function getOwnerGatewayByProvider(
  ownerId: string,
  provider: OwnerGateway["provider"],
): Promise<OwnerGateway | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("dojo_payment_gateways")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("provider", provider)
    .eq("active", true)
    .maybeSingle();
  return (data as OwnerGateway | null) ?? null;
}

/** Retorna o access token do dono para MP, ou lança erro amigável. */
export async function requireOwnerMpToken(ownerId: string): Promise<string> {
  const gw =
    (await getOwnerGatewayByProvider(ownerId, "mercadopago")) ??
    (await getOwnerDefaultGateway(ownerId));
  if (!gw || gw.provider !== "mercadopago" || !gw.access_token) {
    throw new Error(
      "A academia ainda não configurou o Mercado Pago para receber cobranças. Peça ao administrador para cadastrar as credenciais em Gateways de Pagamento.",
    );
  }
  return gw.access_token;
}
