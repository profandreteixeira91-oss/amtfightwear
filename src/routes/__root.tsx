import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-primary">
          AMT Growth Engine
        </div>
        <h1 className="text-7xl font-black text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A rota que você tentou acessar não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-destructive">
          Ops — algo saiu do trilho
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Não conseguimos carregar esta tela
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente novamente. Se o problema persistir, volte ao dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Loja AMT Fight Wear | Artigos para Artes Marciais" },
      {
        name: "description",
        content:
          "A Loja AMT Fight Wear é o e-commerce oficial de kimonos, rashguards, faixas e acessórios para artes marciais.",
      },
      { name: "author", content: "AMT Fight Wear" },
      { property: "og:title", content: "Loja AMT Fight Wear | Artigos para Artes Marciais" },
      {
        property: "og:description",
        content:
          "A Loja AMT Fight Wear é o e-commerce oficial de kimonos, rashguards, faixas e acessórios para artes marciais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Loja AMT Fight Wear | Artigos para Artes Marciais" },
      { name: "twitter:description", content: "E-commerce oficial de kimonos, rashguards, faixas e acessórios para artes marciais." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/5b65ed16-336c-4f97-b997-ac7d4e5a86f4" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/5b65ed16-336c-4f97-b997-ac7d4e5a86f4" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.jpg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const DOJO_HOST = "dojomanager.amtfightwear.com.br";

function useDojoDomainRouting() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { hostname, pathname, search, hash } = window.location;
    // Off-domain access to /dojo/* → send to dedicated subdomain
    if (hostname !== DOJO_HOST && pathname.startsWith("/dojo")) {
      window.location.replace(`https://${DOJO_HOST}${pathname}${search}${hash}`);
      return;
    }
    // On the dedicated subdomain, anything outside /dojo goes to /dojo
    if (hostname === DOJO_HOST && !pathname.startsWith("/dojo")) {
      window.location.replace(`https://${DOJO_HOST}/dojo${pathname === "/" ? "" : pathname}${search}${hash}`);
    }
  }, []);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useDojoDomainRouting();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <Outlet />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
