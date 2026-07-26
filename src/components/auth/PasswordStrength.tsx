import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordChecks = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
};

export function evaluatePassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export function isPasswordStrong(pw: string): boolean {
  const c = evaluatePassword(pw);
  return c.length && c.lower && c.upper && c.number && c.symbol;
}

const RULES: { key: keyof PasswordChecks; label: string }[] = [
  { key: "length", label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres` },
  { key: "upper", label: "Uma letra maiúscula (A-Z)" },
  { key: "lower", label: "Uma letra minúscula (a-z)" },
  { key: "number", label: "Um número (0-9)" },
  { key: "symbol", label: "Um símbolo (!@#$...)" },
];

type Props = {
  password: string;
  className?: string;
  accent?: string; // hex or css color for the accent (progress + check)
};

export function PasswordStrength({ password, className, accent = "#C1121F" }: Props) {
  const checks = evaluatePassword(password);
  const score = Object.values(checks).filter(Boolean).length;
  const pct = (score / RULES.length) * 100;
  const label =
    score === 0
      ? ""
      : score <= 2
      ? "Fraca"
      : score === 3
      ? "Razoável"
      : score === 4
      ? "Forte"
      : "Excelente";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor:
              score <= 2 ? "#ef4444" : score === 3 ? "#f59e0b" : score === 4 ? "#84cc16" : accent,
          }}
        />
      </div>
      {password.length > 0 && (
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="uppercase tracking-widest text-black/40">Força</span>
          <span
            style={{
              color: score <= 2 ? "#ef4444" : score === 3 ? "#f59e0b" : score === 4 ? "#84cc16" : accent,
            }}
          >
            {label}
          </span>
        </div>
      )}
      <ul className="grid gap-1.5 text-xs">
        {RULES.map((r) => {
          const ok = checks[r.key];
          return (
            <li
              key={r.key}
              className={cn(
                "flex items-center gap-2 transition-colors",
                ok ? "text-emerald-600" : "text-black/50",
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-full border transition-colors",
                  ok
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-black/20 bg-white text-black/30",
                )}
              >
                {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={2.5} />}
              </span>
              <span>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
