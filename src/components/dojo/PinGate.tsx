import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shield, Loader2, KeyRound, Lock } from "lucide-react";
import {
  getSecurityPinStatus,
  createSecurityPin,
  verifySecurityPin,
} from "@/lib/dojo/security-pin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
} from "@/components/ui/input-otp";
import { OTPInputContext } from "input-otp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MaskedOTPSlot = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const ctx = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = ctx.slots[index];
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className,
      )}
      {...props}
    >
      {char ? <span className="text-lg leading-none">•</span> : null}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
});
MaskedOTPSlot.displayName = "MaskedOTPSlot";

const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const STORAGE_PREFIX = "dojo:pin-unlock:";

type UnlockRecord = { userId: string; unlockedAt: number };

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readUnlock(userId: string): UnlockRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UnlockRecord;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.unlockedAt > UNLOCK_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveUnlock(userId: string) {
  if (typeof window === "undefined") return;
  const rec: UnlockRecord = { userId, unlockedAt: Date.now() };
  window.localStorage.setItem(storageKey(userId), JSON.stringify(rec));
}

export function clearAllPinUnlocks() {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
}

function useCurrentUserId() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearAllPinUnlocks();
        setUid(null);
        return;
      }
      setUid(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

export function PinGate({
  moduleName,
  description,
  children,
}: {
  moduleName: string;
  description?: string;
  children: React.ReactNode;
}) {
  const userId = useCurrentUserId();
  const statusFn = useServerFn(getSecurityPinStatus);
  const createFn = useServerFn(createSecurityPin);
  const verifyFn = useServerFn(verifySecurityPin);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["dojo", "security-pin", "status", userId],
    queryFn: () => statusFn(),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const [unlocked, setUnlocked] = useState<boolean>(false);
  useEffect(() => {
    if (!userId) return;
    const rec = readUnlock(userId);
    setUnlocked(!!rec);
  }, [userId]);

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mode: "loading" | "create" | "unlock" | "open" = useMemo(() => {
    if (isLoading || !userId) return "loading";
    if (unlocked) return "open";
    if (!status?.hasPin) return "create";
    return "unlock";
  }, [isLoading, userId, unlocked, status?.hasPin]);

  async function handleCreate() {
    if (pin.length !== 6 || confirm.length !== 6) {
      toast.error("Digite os 6 dígitos em ambos os campos.");
      return;
    }
    if (pin !== confirm) {
      toast.error("Os PINs não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await createFn({ data: { pin, confirm } });
      if (userId) saveUnlock(userId);
      setUnlocked(true);
      setPin("");
      setConfirm("");
      await refetch();
      toast.success("PIN criado. Módulo desbloqueado por 24h.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar PIN.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlock() {
    if (pin.length !== 6) {
      toast.error("Digite os 6 dígitos do PIN.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyFn({ data: { pin } });
      if (userId) saveUnlock(userId);
      setUnlocked(true);
      setPin("");
      toast.success("Acesso liberado por 24 horas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PIN incorreto.");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "open") return <>{children}</>;

  return (
    <div className="mx-auto max-w-md w-full p-6 md:p-10">
      <Card className="border-red-100 shadow-xl">
        <CardHeader className="items-center text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            {mode === "create" ? <KeyRound className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600 flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Área protegida
          </div>
          <CardTitle className="text-xl">
            {mode === "loading"
              ? "Carregando…"
              : mode === "create"
                ? `Crie um PIN para o ${moduleName}`
                : `Digite seu PIN para acessar ${moduleName}`}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {description ??
              "Módulos financeiros e administrativos exigem PIN de 6 dígitos. Após validado, o acesso permanece liberado por 24 horas ou até você sair da conta."}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {mode === "loading" ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : mode === "create" ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Novo PIN (6 dígitos)</label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={pin} onChange={setPin} disabled={submitting}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <MaskedOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Confirme o PIN</label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={confirm} onChange={setConfirm} disabled={submitting}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <MaskedOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleCreate}
                disabled={submitting || pin.length !== 6 || confirm.length !== 6}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar PIN e desbloquear
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Guarde este PIN em local seguro. Ele protege dados financeiros e cadastrais da sua rede.
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={pin}
                  onChange={(v) => {
                    setPin(v);
                    if (v.length === 6) {
                      // small delay so user sees full input before submit
                      setTimeout(() => {
                        void handleUnlock();
                      }, 80);
                    }
                  }}
                  disabled={submitting}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <MaskedOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleUnlock}
                disabled={submitting || pin.length !== 6}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Desbloquear módulo
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
