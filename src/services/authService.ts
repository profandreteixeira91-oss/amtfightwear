import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

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

  signInWithGoogle: () =>
    lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }),

  signOut: () => supabase.auth.signOut(),

  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    }),
};
