// API de integração com o aplicativo desktop (Python) — Orçamento específico.
// GET    /api/desktop/quotes/:id
// PATCH  /api/desktop/quotes/:id
// DELETE /api/desktop/quotes/:id
// Autenticação obrigatória via Authorization: Bearer <access_token>.
import { createFileRoute } from "@tanstack/react-router";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/desktop/quotes/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );
        const { QUOTE_SELECT } = await import("@/lib/desktop/quotes-schema");

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;
        if (!UUID_RE.test(params.id)) return errorResponse("ID inválido.", 400, "invalid_id");

        const { data, error } = await auth.supabase
          .from("store_quotes")
          .select(QUOTE_SELECT)
          .eq("id", params.id)
          .eq("owner_id", auth.userId)
          .maybeSingle();

        if (error) return errorResponse(error.message, 400, "query_failed");
        if (!data) return errorResponse("Orçamento não encontrado.", 404, "not_found");
        return jsonResponse({ success: true, data });
      },

      PATCH: async ({ request, params }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );
        const { QUOTE_SELECT, updateQuoteSchema, computeQuoteTotals } = await import(
          "@/lib/desktop/quotes-schema"
        );

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;
        if (!UUID_RE.test(params.id)) return errorResponse("ID inválido.", 400, "invalid_id");

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Corpo JSON inválido.", 400, "invalid_json");
        }

        const parsed = updateQuoteSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              error: { message: "Dados inválidos.", code: "validation_failed", issues: parsed.error.issues },
            },
            422,
          );
        }

        const { data: current, error: currentError } = await auth.supabase
          .from("store_quotes")
          .select("items, discount, shipping_cost")
          .eq("id", params.id)
          .eq("owner_id", auth.userId)
          .maybeSingle();
        if (currentError) return errorResponse(currentError.message, 400, "query_failed");
        if (!current) return errorResponse("Orçamento não encontrado.", 404, "not_found");

        const input = parsed.data;
        const items = (input.items ?? (current.items as never)) as Parameters<typeof computeQuoteTotals>[0];
        const discount = input.discount ?? Number(current.discount ?? 0);
        const shipping_cost = input.shipping_cost ?? Number(current.shipping_cost ?? 0);
        const { subtotal, total } = computeQuoteTotals(items ?? [], discount, shipping_cost);

        const patch: Record<string, unknown> = {
          ...input,
          discount,
          shipping_cost,
          subtotal,
          total,
          updated_at: new Date().toISOString(),
        };
        if (input.items) patch.items = input.items;

        const { data, error } = await auth.supabase
          .from("store_quotes")
          .update(patch)
          .eq("id", params.id)
          .eq("owner_id", auth.userId)
          .select(QUOTE_SELECT)
          .maybeSingle();

        if (error) {
          const status = error.code === "42501" ? 403 : 400;
          return errorResponse(error.message, status, "update_failed");
        }
        if (!data) return errorResponse("Orçamento não encontrado.", 404, "not_found");

        const { syncQuoteEverywhere } = await import("@/lib/store/quote-sync.server");
        await syncQuoteEverywhere(auth.supabase, data as never);

        return jsonResponse({ success: true, data });
      },

      DELETE: async ({ request, params }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;
        if (!UUID_RE.test(params.id)) return errorResponse("ID inválido.", 400, "invalid_id");

        const { syncQuoteEverywhere } = await import("@/lib/store/quote-sync.server");
        await syncQuoteEverywhere(auth.supabase, { id: params.id, status: "rejected", total: 0 } as never);

        const { data, error } = await auth.supabase
          .from("store_quotes")
          .delete()
          .eq("id", params.id)
          .eq("owner_id", auth.userId)
          .select("id")
          .maybeSingle();

        if (error) {
          const status = error.code === "42501" ? 403 : 400;
          return errorResponse(error.message, status, "delete_failed");
        }
        if (!data) return errorResponse("Orçamento não encontrado.", 404, "not_found");

        return jsonResponse({ success: true, data: { id: params.id, deleted: true } });
      },
    },
  },
});
