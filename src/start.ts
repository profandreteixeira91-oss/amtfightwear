import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachScopedSupabaseAuth } from "@/lib/student-auth/bearer-attacher";
import { attachActiveStudent } from "@/integrations/supabase/active-student-attacher";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const DOJO_HOST = "dojomanager.amtfightwear.com.br";

const domainRoutingMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);

  // Internal /lovable/* routes (auth emails, webhooks, cron) must never be
  // redirected by domain or locale routing.
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }

  // Proxies may disagree about the public host (x-forwarded-host vs host vs URL).
  // Treat the request as the Dojo host if ANY source says so; otherwise a
  // proxy-rewritten header makes /dojo/* redirect to itself forever.
  const normalize = (h: string | null | undefined) =>
    (h ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const hosts = [
    normalize(request.headers.get("x-forwarded-host")),
    normalize(request.headers.get("host")),
    normalize(url.host),
  ].filter(Boolean);
  const hostname = hosts[0] ?? "";
  const isDojoHost = hosts.includes(DOJO_HOST);
  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  const isPageRequest = (request.method === "GET" || request.method === "HEAD") && acceptsHtml;

  if (!isPageRequest) return next();

  // Ambientes de desenvolvimento/preview nunca são redirecionados para o domínio público.
  const isInternalHost = hosts.some(
    (h) =>
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.endsWith(".lovable.app") ||
      h.endsWith(".lovableproject.com"),
  );
  if (isInternalHost && !isDojoHost) return next();

  if (!isDojoHost && hostname && url.pathname.startsWith("/dojo")) {
    // Loop breaker: a request already redirected once is served as-is.
    if (url.searchParams.has("_dh")) return next();
    const target = new URL(`https://${DOJO_HOST}${url.pathname}${url.search}`);
    target.searchParams.set("_dh", "1");
    return Response.redirect(target.toString(), 307);
  }

  if (isDojoHost && !url.pathname.startsWith("/dojo")) {
    const targetPath = url.pathname === "/" ? "/dojo" : `/dojo${url.pathname}`;
    return Response.redirect(`https://${DOJO_HOST}${targetPath}${url.search}`, 307);
  }

  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachScopedSupabaseAuth, attachActiveStudent],
  requestMiddleware: [domainRoutingMiddleware, errorMiddleware],
}));
