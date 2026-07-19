import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/certificate/$hash")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const hash = String(params.hash ?? "").trim();
        if (!hash || hash.length < 8 || hash.length > 128) {
          return new Response(JSON.stringify({ error: "invalid_hash" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: cert, error } = await supabaseAdmin
          .from("dojo_certificates")
          .select(
            "id, issued_at, pdf_url, values, student_id, graduation_id, owner_id, " +
              "student:dojo_students(full_name), " +
              "graduation:dojo_graduations(graduation_date, degree, belt:dojo_belts(name, color_hex))",
          )
          .eq("public_hash", hash)
          .maybeSingle();

        if (error) {
          console.error("[certificate/validate] db error", error);
          return new Response(JSON.stringify({ error: "server_error" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        if (!cert) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }

        // Load academy (dojo) info via owner_id → dojo_academy_profile
        let academy: { trade_name: string | null; legal_name: string | null } | null = null;
        if (cert.owner_id) {
          const { data: a } = await supabaseAdmin
            .from("dojo_academy_profile")
            .select("trade_name, legal_name")
            .eq("owner_id", cert.owner_id)
            .maybeSingle();
          academy = a ?? null;
        }

        const grad = (cert as unknown as { graduation?: { graduation_date?: string; degree?: number; belt?: { name?: string; color_hex?: string } } }).graduation;
        const student = (cert as unknown as { student?: { full_name?: string } }).student;

        const payload = {
          id: cert.id,
          issued_at: cert.issued_at,
          pdf_url: cert.pdf_url,
          values: cert.values ?? null,
          student: student ? { full_name: student.full_name ?? null } : null,
          belt: grad?.belt ? { name: grad.belt.name ?? null, color_hex: grad.belt.color_hex ?? null } : null,
          graduation_date: grad?.graduation_date ?? null,
          degree: grad?.degree ?? null,
          academy,
        };

        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=60, s-maxage=300",
          },
        });
      },
    },
  },
});
