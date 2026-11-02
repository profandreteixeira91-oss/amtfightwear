import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";

/**
 * Login + dono da loja. Toda função de servidor usada pelo /admin deve usar este
 * middleware: o login é compartilhado com outros produtos (clientes da loja,
 * Dojo Manager), então só estar logado não basta para operar a Central.
 */
export const requireStoreOwner = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    await assertSaasOwner(context);
    return next();
  });
