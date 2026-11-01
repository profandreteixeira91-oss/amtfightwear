import { supabase } from "@/integrations/supabase/client";

export const authService = {
  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signUpWithPassword: (email: string, password: string, fullName?: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: fullName ? { full_name: fullName } : undefined,
      },
    }),

  // OAuth nativo do Supabase: redireciona para o Google e volta com a sessão na URL.
  signInWithGoogle: (redirectTo: string = window.location.origin) =>
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } }),

  signOut: () => supabase.auth.signOut(),

  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    }),
};
