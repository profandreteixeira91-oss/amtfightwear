import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Isolamento entre superfícies: o Portal do Aluno (/app/*) tem sessão própria.
  // Se o cliente principal (admin/dojo) capturar por acidente o mesmo usuário
  // logado no portal do aluno (ex.: token de recuperação na mesma origem),
  // derrubamos a sessão principal para que a conta do aluno nunca ganhe acesso
  // a /admin nem a /dojo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mainUserId = user?.id;
    if (!mainUserId) return;
    (async () => {
      const { studentSupabase } = await import("@/lib/student-auth/student-client");
      const { data } = await studentSupabase.auth.getSession();
      if (data.session?.user?.id === mainUserId) {
        await supabase.auth.signOut({ scope: "local" });
      }
    })();
  }, [user?.id]);


  const value: AuthContextValue = {
    user,
    session,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
