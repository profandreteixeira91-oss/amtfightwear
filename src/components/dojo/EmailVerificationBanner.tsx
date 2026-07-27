import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export function EmailVerificationBanner() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !data.user.email_confirmed_at) {
        setUser(data.user);
      }
    });
  }, []);

  const resendEmail = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dojo/auth`,
        },
      });
      if (error) throw error;
      toast.success("E-mail de confirmação enviado!");
    } catch (error: any) {
      toast.error("Erro ao enviar e-mail", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!user || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 p-2 sm:p-3 relative">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left pr-8 sm:pr-0">
        <div className="flex items-center gap-2 text-amber-800">
          <Mail className="h-4 w-4 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">
            Confirme seu e-mail ({user.email}) para garantir a segurança da sua conta.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resendEmail}
          disabled={loading}
          className="h-8 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 hover:text-amber-950 text-xs px-3"
        >
          {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Reenviar e-mail
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-amber-500 hover:text-amber-700 transition-colors"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
