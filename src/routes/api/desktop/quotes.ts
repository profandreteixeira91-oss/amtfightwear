// API de integração com o aplicativo desktop (Python) — Orçamentos (admin/orcamentos).
// GET  /api/desktop/quotes  -> lista paginada
// POST /api/desktop/quotes  -> cria orçamento
// Autenticação obrigatória via Authorization: Bearer <access_token>.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/desktop/quotes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateDesktopRequest, jsonResponse, errorResponse } = await import(
          "@/lib/desktop/api-auth.server"
        );
        const { QUOTE_LIST_SELECT, quoteListQuerySchema } = await import("@/lib/desktop/quotes-schema");

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;

        const url = new URL(request.url);
        const parsed = quoteListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) return errorResponse("Parâmetros inválidos.", 400, "invalid_query");

        const { page, per_page, search, status } = parsed.data;
        const from = (page - 1) * per_page;

        let query = auth.supabase
          .from("store_quotes")
          .select(QUOTE_LIST_SELECT, { count: "exact" })
          .eq("owner_id", auth.userId)
          .order("created_at", { ascending: false })
          .range(from, from + per_page - 1);

        if (status) query = query.eq("status", status);
        if (search) {
          query = query.or(
            `quote_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_company.ilike.%${search}%,customer_document.ilike.%${search}%`,
          );
        }

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
        const { QUOTE_SELECT, createQuoteSchema, computeQuoteTotals } = await import(
          "@/lib/desktop/quotes-schema"
        );

        const auth = await authenticateDesktopRequest(request);
        if (!auth.ok) return auth.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Corpo JSON inválido.", 400, "invalid_json");
        }

        const parsed = createQuoteSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              error: { message: "Dados inválidos.", code: "validation_failed", issues: parsed.error.issues },
            },
            422,
          );
        }

        const input = parsed.data;
        const items = input.items ?? [];
        const discount = input.discount ?? 0;
        const shipping_cost = input.shipping_cost ?? 0;
        const { subtotal, total } = computeQuoteTotals(items, discount, shipping_cost);

        let quoteNumber = input.quote_number?.trim();
        if (!quoteNumber) {
          const { count } = await auth.supabase
            .from("store_quotes")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", auth.userId);
          quoteNumber = `ORC-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;
        }

        const payload = {
          owner_id: auth.userId,
          quote_number: quoteNumber,
          status: input.status ?? "draft",
          customer_name: input.customer_name,
          customer_company: input.customer_company || null,
          customer_document: input.customer_document || null,
          customer_email: input.customer_email || null,
          customer_phone: input.customer_phone || null,
          customer_address: input.customer_address ?? {},
          items,
          discount,
          shipping_cost,
          subtotal,
          total,
          valid_until: input.valid_until || null,
          payment_terms: input.payment_terms || null,
          delivery_terms: input.delivery_terms || null,
          notes: input.notes || null,
          signer_name: input.signer_name || null,
          signer_role: input.signer_role || null,
          signature_image: input.signature_image || null,
        };

        const { data, error } = await auth.supabase
          .from("store_quotes")
          .insert(payload)
          .select(QUOTE_SELECT)
          .single();

        if (error) {
          const status = error.code === "42501" ? 403 : 400;
          return errorResponse(error.message, status, "insert_failed");
        }

        // Mantém fila de produção / financeiro em sincronia, igual ao painel admin.
        const { syncQuoteEverywhere } = await import("@/lib/store/quote-sync.server");
        await syncQuoteEverywhere(auth.supabase, data as never);

        return jsonResponse({ success: true, data }, 201);
      },
    },
  },
});
