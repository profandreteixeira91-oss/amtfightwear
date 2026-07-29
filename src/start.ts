import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachScopedSupabaseAuth } from "@/lib/student-auth/bearer-attacher";
import { attachActiveStudent } from "@/integrations/supabase/active-student-attacher";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const DOJO_HOST = "dojomanager.amtfightwear.com.br";

const domainRoutingMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = forwardedHost || request.headers.get("host") || url.host;
  const hostname = hostHeader.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  const isPageRequest = (request.method === "GET" || request.method === "HEAD") && acceptsHtml;

  if (!isPageRequest) return next();

  if (hostname !== DOJO_HOST && url.pathname.startsWith("/dojo")) {
    return Response.redirect(
      `https://${DOJO_HOST}${url.pathname}${url.search}${url.hash}`,
      307,
    );
  }

  if (hostname === DOJO_HOST && !url.pathname.startsWith("/dojo")) {
    const targetPath = url.pathname === "/" ? "/dojo" : `/dojo${url.pathname}`;
    return Response.redirect(
      `https://${DOJO_HOST}${targetPath}${url.search}${url.hash}`,
      307,
    );
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
