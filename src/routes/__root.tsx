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
            to="/admin"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
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
            href="/admin"
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
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://connect.facebook.net" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Cinzel:wght@400;600;700;900&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Great+Vibes&family=Dancing+Script:wght@400;600;700&family=Allura&family=Pinyon+Script&family=Montserrat:wght@300;400;600;700;800&family=Poppins:wght@300;400;600;700;800&family=Bebas+Neue&family=Raleway:wght@300;400;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap" },
    ],
    scripts: [
      {
        children:
          "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','2149647638877087');fbq('track','PageView');",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const DOJO_HOST = "dojomanager.amtfightwear.com.br";

const DOMAIN_ROUTING_SCRIPT = `(function(){try{var h=location.hostname,p=location.pathname,s=location.search||"",x=location.hash||"";if(h!=="localhost"&&h!=="127.0.0.1"&&!h.endsWith(".lovable.app")){var isDojoArea=p.indexOf("/dojo")===0||p.indexOf("/app")===0||p.indexOf("/api/public/app")===0;if(h!=="${DOJO_HOST}"&&p.indexOf("/dojo")===0){location.replace("https://${DOJO_HOST}"+p+s+x);return;}if(h==="${DOJO_HOST}"&&!isDojoArea){location.replace("https://${DOJO_HOST}/dojo"+(p==="/"?"":p)+s+x);return;}}}catch(e){}try{window.__amtInstallPrompt=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__amtInstallPrompt=e;window.dispatchEvent(new Event("amt:install-ready"));});window.addEventListener("appinstalled",function(){window.__amtInstallPrompt=null;window.__amtInstalled=true;window.dispatchEvent(new Event("amt:install-ready"));});}catch(e){}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DOMAIN_ROUTING_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=2149647638877087&ev=PageView&noscript=1" alt="" />',
          }}
        />
        {children}
        <Scripts />
      </body>
    </html>
  );
}


function useDojoDomainRouting() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { hostname, pathname, search, hash } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".lovable.app")) return;
    const isDojoArea =
      pathname.startsWith("/dojo") ||
      pathname.startsWith("/app") ||
      pathname.startsWith("/api/public/app");
    // Off-domain access to /dojo/* → send to dedicated subdomain
    if (hostname !== DOJO_HOST && pathname.startsWith("/dojo")) {
      window.location.replace(`https://${DOJO_HOST}${pathname}${search}${hash}`);
      return;
    }
    // On the dedicated subdomain, anything outside the dojo area goes to /dojo
    if (hostname === DOJO_HOST && !isDojoArea) {
      window.location.replace(`https://${DOJO_HOST}/dojo${pathname === "/" ? "" : pathname}${search}${hash}`);
    }
  }, []);
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useDojoDomainRouting();
  useEffect(() => {
    if (typeof window === "undefined") return;
    void import("@/lib/pwa/register").then((m) => m.registerPwa());
    void import("@/lib/cep-autofill").then((m) => m.attachCepAutofill());
  }, []);

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
