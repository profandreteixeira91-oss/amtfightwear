import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const OWNER_EMAIL = "profandreteixeira91@gmail.com";

export function useIsOwner() {
  const [state, setState] = useState<{ loading: boolean; isOwner: boolean; email: string | null }>({
    loading: true,
    isOwner: false,
    email: null,
  });
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const e = data.user?.email ?? null;
      setState({ loading: false, isOwner: e?.toLowerCase() === OWNER_EMAIL, email: e });
    });
    return () => {
      mounted = false;
    };
  }, []);
  return state;
}

export function OwnerOnly({
  children,
  description,
  showLoading = true,
}: {
  children: React.ReactNode | ((state: ReturnType<typeof useIsOwner>) => React.ReactNode);
  description?: string;
  showLoading?: boolean;
}) {
  const state = useIsOwner();
  const { loading, isOwner, email } = state;

  if (loading && showLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Verificando permissão…</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-neutral-900">Acesso restrito</h1>
          <p className="text-sm leading-relaxed text-neutral-600">
            {description ??
              "O Growth Engine é uma área exclusiva da administração da AMT Fight Wear. Sua conta não possui permissão para acessar este módulo."}
          </p>

          {email && (
            <p className="mt-4 text-xs text-neutral-400">
              Conectado como <span className="font-medium text-neutral-500">{email}</span>
            </p>
          )}
          <Link
            to="/dojo/app"
            className="mt-6 inline-block rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Ir para o AMT Dojo Manager
          </Link>
        </div>
      </div>
    );
  }

  return <>{typeof children === 'function' ? children(state) : children}</>;
}
