// API de integração com o aplicativo desktop (Python).
// GET    /api/desktop/products/:id -> detalhe
// PATCH  /api/desktop/products/:id -> atualização parcial
// DELETE /api/desktop/products/:id -> exclusão
// Autenticação obrigatória via Authorization: Bearer <access_token>.
import { createFileRoute } from "@tanstack/react-router";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/desktop/products/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );
        const { PRODUCT_SELECT } = await import("@/lib/desktop/products-schema");

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;
        if (!UUID_RE.test(params.id)) return errorResponse("ID inválido.", 400, "invalid_id");

        const { data, error } = await auth.supabase
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("id", params.id)
          .maybeSingle();

        if (error) return errorResponse(error.message, 400, "query_failed");
        if (!data) return errorResponse("Produto não encontrado.", 404, "not_found");
        return jsonResponse({ success: true, data });
      },

      PATCH: async ({ request, params }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );
        const { PRODUCT_SELECT, updateProductSchema } = await import("@/lib/desktop/products-schema");

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;
        if (!UUID_RE.test(params.id)) return errorResponse("ID inválido.", 400, "invalid_id");

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Corpo JSON inválido.", 400, "invalid_json");
        }

        const parsed = updateProductSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              error: { message: "Dados inválidos.", code: "validation_failed", issues: parsed.error.issues },
            },
            422,
          );
        }

        const { data, error } = await auth.supabase
          .from("products")
          .update({ ...parsed.data, updated_at: new Date().toISOString() })
          .eq("id", params.id)
          .select(PRODUCT_SELECT)
          .maybeSingle();

        if (error) {
          const status = error.code === "42501" ? 403 : 400;
          return errorResponse(error.message, status, "update_failed");
        }
        if (!data) return errorResponse("Produto não encontrado ou sem permissão.", 404, "not_found");
        return jsonResponse({ success: true, data });
      },

      DELETE: async ({ request, params }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;
        if (!UUID_RE.test(params.id)) return errorResponse("ID inválido.", 400, "invalid_id");

        const { data, error } = await auth.supabase
          .from("products")
          .delete()
          .eq("id", params.id)
          .select("id")
          .maybeSingle();

        if (error) {
          const status = error.code === "42501" ? 403 : 400;
          return errorResponse(error.message, status, "delete_failed");
        }
        if (!data) return errorResponse("Produto não encontrado ou sem permissão.", 404, "not_found");
        return jsonResponse({ success: true, data: { id: data.id, deleted: true } });
      },
    },
  },
});
