// API de integração com o aplicativo desktop (Python).
// GET  /api/desktop/products  -> lista paginada
// POST /api/desktop/products  -> cria produto
// Autenticação obrigatória via Authorization: Bearer <access_token>.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/desktop/products")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );
        const { PRODUCT_SELECT, listQuerySchema } = await import("@/lib/desktop/products-schema");

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;

        const url = new URL(request.url);
        const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return errorResponse("Parâmetros inválidos.", 400, "invalid_query");
        }
        const { page, per_page, search, status } = parsed.data;
        const from = (page - 1) * per_page;

        let query = auth.supabase
          .from("products")
          .select(PRODUCT_SELECT, { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, from + per_page - 1);

        if (status) query = query.eq("status", status);
        if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);

        const { data, error, count } = await query;
        if (error) return errorResponse(error.message, 400, "query_failed");

        const total = count ?? 0;
        return jsonResponse({
          success: true,
          data: data ?? [],
          pagination: {
            page,
            per_page,
            total,
            total_pages: per_page > 0 ? Math.ceil(total / per_page) : 0,
            has_more: from + (data?.length ?? 0) < total,
          },
        });
      },

      POST: async ({ request }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );
        const { PRODUCT_SELECT, createProductSchema } = await import("@/lib/desktop/products-schema");

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Corpo JSON inválido.", 400, "invalid_json");
        }

        const parsed = createProductSchema.safeParse(body);
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
          .insert(parsed.data)
          .select(PRODUCT_SELECT)
          .single();

        if (error) {
          const status = error.code === "42501" ? 403 : 400;
          return errorResponse(error.message, status, "insert_failed");
        }

        return jsonResponse({ success: true, data }, 201);
      },
    },
  },
});
