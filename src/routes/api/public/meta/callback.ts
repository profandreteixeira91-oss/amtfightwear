import { createFileRoute } from "@tanstack/react-router";

const REDIRECT_URI = "https://loja.amtfightwear.com.br/api/public/meta/callback";
const GRAPH = "https://graph.facebook.com/v21.0";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Meta OAuth</title><style>body{font-family:system-ui;background:#0a0a0a;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{max-width:520px;padding:32px;border:1px solid #262626;border-radius:12px;background:#111}h1{margin:0 0 12px;font-size:20px}p{color:#a3a3a3;line-height:1.5}a{color:#ef4444}</style></head><body><div class="box">${body}</div><script>setTimeout(()=>{window.location.href="/market/connections"},3500)</script></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error_description") || url.searchParams.get("error");

        if (errorParam) {
          return html(`<h1>❌ Autorização cancelada</h1><p>${errorParam}</p><p>Redirecionando…</p>`, 400);
        }
        if (!code || !state) {
          return html(`<h1>❌ Parâmetros ausentes</h1><p>Code ou state faltando.</p>`, 400);
        }

        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        if (!appId || !appSecret) {
          return html(`<h1>❌ Configuração incompleta</h1><p>META_APP_ID/META_APP_SECRET não definidos.</p>`, 500);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Validar state
        const { data: stateRow, error: stateErr } = await supabaseAdmin
          .from("meta_oauth_states")
          .select("user_id, expires_at")
          .eq("state", state)
          .maybeSingle();
        if (stateErr || !stateRow) {
          return html(`<h1>❌ State inválido</h1><p>Sessão de OAuth expirada ou desconhecida.</p>`, 400);
        }
        if (new Date(stateRow.expires_at).getTime() < Date.now()) {
          await supabaseAdmin.from("meta_oauth_states").delete().eq("state", state);
          return html(`<h1>❌ State expirado</h1><p>Refaça a conexão.</p>`, 400);
        }
        const userId = stateRow.user_id;
        await supabaseAdmin.from("meta_oauth_states").delete().eq("state", state);

        try {
          // 2. Trocar code por short-lived token
          const tokenRes = await fetch(
            `${GRAPH}/oauth/access_token?` +
              new URLSearchParams({
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: REDIRECT_URI,
                code,
              }),
          );
          const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: { message: string } };
          if (!tokenJson.access_token) throw new Error(tokenJson.error?.message || "Falha no token curto");

          // 3. Trocar por long-lived token (~60 dias)
          const llRes = await fetch(
            `${GRAPH}/oauth/access_token?` +
              new URLSearchParams({
                grant_type: "fb_exchange_token",
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: tokenJson.access_token,
              }),
          );
          const llJson = (await llRes.json()) as { access_token?: string; expires_in?: number; error?: { message: string } };
          if (!llJson.access_token) throw new Error(llJson.error?.message || "Falha no token longo");
          const userToken = llJson.access_token;
          const expiresAt = new Date(Date.now() + (llJson.expires_in ?? 60 * 24 * 60 * 60) * 1000);

          // 4. Buscar usuário Facebook
          const meRes = await fetch(`${GRAPH}/me?fields=id,name&access_token=${userToken}`);
          const me = (await meRes.json()) as { id: string; name: string };

          // 5. Listar páginas
          const pagesRes = await fetch(
            `${GRAPH}/me/accounts?fields=id,name,access_token,picture{url},instagram_business_account{id,username}&access_token=${userToken}`,
          );
          const pagesJson = (await pagesRes.json()) as {
            data?: Array<{
              id: string;
              name: string;
              access_token: string;
              picture?: { data?: { url: string } };
              instagram_business_account?: { id: string; username?: string };
            }>;
            error?: { message: string };
          };
          if (!pagesJson.data || pagesJson.data.length === 0) {
            return html(
              `<h1>⚠️ Nenhuma Página encontrada</h1><p>O usuário <b>${me.name}</b> foi autenticado, mas não há Páginas do Facebook administradas. Adicione a Página AMT no Meta Business Suite e tente novamente.</p>`,
              200,
            );
          }

          // 6. Buscar IG username quando disponível
          for (const page of pagesJson.data) {
            const ig = page.instagram_business_account;
            if (ig?.id && !ig.username) {
              const igRes = await fetch(`${GRAPH}/${ig.id}?fields=username&access_token=${page.access_token}`);
              const igJson = (await igRes.json()) as { username?: string };
              ig.username = igJson.username;
            }
          }

          // 7. Salvar cada página (upsert por page_id)
          for (const page of pagesJson.data) {
            await supabaseAdmin.from("meta_connections").upsert(
              {
                user_id: userId,
                facebook_user_id: me.id,
                facebook_user_name: me.name,
                page_id: page.id,
                page_name: page.name,
                page_access_token: page.access_token,
                page_picture_url: page.picture?.data?.url ?? null,
                instagram_business_account_id: page.instagram_business_account?.id ?? null,
                instagram_username: page.instagram_business_account?.username ?? null,
                token_expires_at: expiresAt.toISOString(),
                status: "active",
                last_sync_at: new Date().toISOString(),
              },
              { onConflict: "page_id" },
            );
          }

          const pageNames = pagesJson.data.map((p) => p.name).join(", ");
          return html(
            `<h1>✅ Conectado com sucesso!</h1><p><b>Usuário:</b> ${me.name}</p><p><b>Páginas:</b> ${pageNames}</p><p>Redirecionando para o painel…</p>`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return html(`<h1>❌ Falha na integração</h1><p>${msg}</p>`, 500);
        }
      },
    },
  },
});
