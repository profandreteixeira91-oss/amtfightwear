import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MAX_APK_BYTES = 300 * 1024 * 1024; // 300 MB
const APK_BUCKET = "dojo-apk";

// Upload multipart de APK — protegido por bearer token do dono.
export const Route = createFileRoute("/api/dojo/apk-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!token) return new Response("Unauthorized", { status: 401 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false },
          });
          const { data: userData, error: uErr } = await anon.auth.getUser();
          if (uErr || !userData.user) return new Response("Unauthorized", { status: 401 });
          const userId = userData.user.id;

          const form = await request.formData();
          const file = form.get("file");
          const versionName = String(form.get("version_name") ?? "").trim();
          const buildCodeRaw = String(form.get("build_code") ?? "").trim();
          const releaseNotes = String(form.get("release_notes") ?? "").trim() || null;
          const publish = String(form.get("publish") ?? "true") === "true";

          if (!(file instanceof File)) {
            return Response.json({ error: "Arquivo APK ausente" }, { status: 400 });
          }
          if (!versionName || versionName.length > 30) {
            return Response.json({ error: "Nome da versão inválido" }, { status: 400 });
          }
          const buildCode = Number(buildCodeRaw);
          if (!Number.isInteger(buildCode) || buildCode < 1 || buildCode > 999999) {
            return Response.json({ error: "Build inválido" }, { status: 400 });
          }
          if (file.size <= 0 || file.size > MAX_APK_BYTES) {
            return Response.json({ error: `Arquivo excede o limite de ${MAX_APK_BYTES / 1024 / 1024}MB` }, { status: 400 });
          }
          if (!/\.apk$/i.test(file.name)) {
            return Response.json({ error: "Somente arquivos .apk são aceitos" }, { status: 400 });
          }
          const mime = file.type || "application/vnd.android.package-archive";
          if (
            mime !== "application/vnd.android.package-archive" &&
            mime !== "application/octet-stream" &&
            mime !== "application/x-authorware-bin" &&
            mime !== "application/java-archive" &&
            mime !== "application/zip" &&
            mime !== "application/x-zip-compressed"
          ) {
            return Response.json({ error: "Tipo de arquivo não permitido: " + mime }, { status: 400 });
          }

          const safeName = file.name.replace(/[^a-zA-Z0-9_.-]+/g, "_");
          const path = `${userId}/${Date.now()}-${safeName}`;
          const buf = new Uint8Array(await file.arrayBuffer());

          const { error: upErr } = await supabaseAdmin.storage
            .from(APK_BUCKET)
            .upload(path, buf, {
              contentType: "application/vnd.android.package-archive",
              upsert: false,
            });
          if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

          if (publish) {
            await supabaseAdmin
              .from("dojo_app_apk_versions")
              .update({ is_published: false })
              .eq("owner_id", userId);
          }
          const { data: row, error: iErr } = await supabaseAdmin
            .from("dojo_app_apk_versions")
            .insert({
              owner_id: userId,
              version_name: versionName,
              build_code: buildCode,
              file_name: file.name,
              file_path: path,
              file_size: file.size,
              mime_type: "application/vnd.android.package-archive",
              release_notes: releaseNotes,
              is_published: publish,
              created_by: userId,
            })
            .select("id")
            .single();
          if (iErr) {
            await supabaseAdmin.storage.from(APK_BUCKET).remove([path]);
            return Response.json({ error: iErr.message }, { status: 500 });
          }
          return Response.json({ ok: true, id: row.id });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "Erro inesperado" }, { status: 500 });
        }
      },
    },
  },
});
