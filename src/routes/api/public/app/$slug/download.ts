import { createFileRoute } from "@tanstack/react-router";

const APK_BUCKET = "dojo-apk";

// Link permanente de download: /api/public/app/:slug/download
// Resolve a última versão publicada, gera signed URL e redireciona.
export const Route = createFileRoute("/api/public/app/$slug/download")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = params.slug;
        if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
          return new Response("Slug inválido", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: rows, error } = await supabaseAdmin.rpc("get_latest_apk_by_slug", { _slug: slug });
        if (error) return new Response("Erro ao localizar versão", { status: 500 });
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row) {
          return new Response(
            renderNoApkPage(slug),
            { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        // Busca o file_path (não exposto pela RPC pública)
        const { data: full } = await supabaseAdmin
          .from("dojo_app_apk_versions")
          .select("file_path, file_name")
          .eq("id", row.id)
          .single();
        if (!full) return new Response("Versão não localizada", { status: 404 });

        const { data: signed, error: sErr } = await supabaseAdmin.storage
          .from(APK_BUCKET)
          .createSignedUrl(full.file_path, 60 * 5, { download: full.file_name });
        if (sErr || !signed) return new Response("Falha ao gerar link", { status: 500 });

        // Log de download (fire-and-forget)
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          null;
        const ua = request.headers.get("user-agent") ?? null;
        void supabaseAdmin.from("dojo_app_apk_downloads").insert({
          apk_version_id: row.id,
          owner_id: row.owner_id,
          slug,
          ip,
          user_agent: ua,
        });
        void supabaseAdmin
          .from("dojo_app_apk_versions")
          .update({ downloads: (row.downloads ?? 0) + 1 })
          .eq("id", row.id);

        return Response.redirect(signed.signedUrl, 302);
      },
    },
  },
});

function renderNoApkPage(slug: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>App indisponível</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f5f5f5;color:#111;margin:0;display:grid;place-items:center;min-height:100vh}.card{max-width:420px;background:#fff;padding:32px;border-radius:20px;box-shadow:0 20px 60px -20px rgba(0,0,0,.15);text-align:center}.dot{width:56px;height:56px;border-radius:16px;background:#fee2e2;display:grid;place-items:center;margin:0 auto 16px;font-size:26px}</style>
</head><body><div class="card"><div class="dot">📱</div>
<h1 style="margin:0 0 8px;font-size:20px">Nenhuma versão disponível</h1>
<p style="margin:0;color:#666">O aplicativo desta academia ainda não tem uma versão publicada. Peça ao administrador para publicar o APK.</p>
<p style="margin-top:16px"><a href="/app/install/${slug}" style="color:#dc2626;font-weight:600;text-decoration:none">Voltar para a página do app →</a></p>
</div></body></html>`;
}
