import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/dojo/partner-checkin/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provider = params.provider;
        if (!["gympass", "totalpass"].includes(provider)) {
          return new Response("Unknown provider", { status: 404 });
        }
        const body = await request.text();
        let payload: any = {};
        try { payload = body ? JSON.parse(body) : {}; } catch { payload = {}; }
        const externalUser =
          payload.user_id || payload.userId || payload.email || payload.cpf || payload.member_id || null;
        const token = payload.token || payload.code || payload.checkin_token || null;
        // Owner disambiguation: caller must include ?owner=<uuid> so we can locate
        // the right tenant's integration. Falls back to first enabled integration if omitted.
        const url = new URL(request.url);
        const ownerHint = url.searchParams.get("owner") || payload.owner_id || null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let cfgQuery = supabaseAdmin
          .from("dojo_partner_integrations")
          .select("*")
          .eq("provider", provider)
          .eq("enabled", true);
        if (ownerHint) cfgQuery = cfgQuery.eq("owner_id", ownerHint);
        const { data: cfg } = await cfgQuery.limit(1).maybeSingle();

        if (!cfg) {
          return Response.json({ approved: false, reason: "integration_not_found" }, { status: 403 });
        }

        const ownerId = cfg.owner_id;

        // HMAC verification (optional if secret configured)
        if (cfg.webhook_secret) {
          const signature = request.headers.get("x-signature") || request.headers.get("x-hub-signature-256") || "";
          const clean = signature.replace(/^sha256=/, "");
          const expected = createHmac("sha256", cfg.webhook_secret).update(body).digest("hex");
          const a = Buffer.from(clean);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            await supabaseAdmin.from("dojo_partner_checkins").insert({
              provider, external_user: externalUser, token, status: "denied",
              reason: "invalid_signature", payload, unit_id: cfg.unit_id, owner_id: ownerId,
            });
            return new Response("Invalid signature", { status: 401 });
          }
        }

        // Find linked student by email/cpf (scoped to owner)
        let studentId: string | null = null;
        if (externalUser) {
          const { data: s } = await supabaseAdmin
            .from("dojo_students")
            .select("id")
            .eq("owner_id", ownerId)
            .or(`email.eq.${externalUser},cpf.eq.${externalUser}`)
            .maybeSingle();
          if (s) studentId = s.id;
        }

        if (!studentId) {
          await supabaseAdmin.from("dojo_partner_checkins").insert({
            provider, external_user: externalUser, token, status: "denied",
            reason: "student_not_found", payload, unit_id: cfg.unit_id, owner_id: ownerId,
          });
          return Response.json({ approved: false, reason: "student_not_found" }, { status: 404 });
        }

        const { data: att, error: attErr } = await supabaseAdmin
          .from("dojo_attendance")
          .insert({
            student_id: studentId,
            unit_id: cfg.unit_id,
            method: provider,
            source: token,
            external_user: externalUser,
            owner_id: ownerId,
          })
          .select("id")
          .single();

        if (attErr) {
          await supabaseAdmin.from("dojo_partner_checkins").insert({
            provider, external_user: externalUser, token, status: "error",
            reason: attErr.message, payload, unit_id: cfg.unit_id, owner_id: ownerId,
          });
          return Response.json({ approved: false, reason: "error" }, { status: 500 });
        }

        await supabaseAdmin.from("dojo_partner_checkins").insert({
          provider, external_user: externalUser, token, status: "approved",
          payload, attendance_id: att.id, unit_id: cfg.unit_id, owner_id: ownerId,
        });

        return Response.json({ approved: true, attendance_id: att.id });
      },
    },
  },
});
