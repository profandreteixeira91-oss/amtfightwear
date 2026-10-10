import type { ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  error?: string;
  hint?: string;
};

export function NumField({ id, label, value, onChange, prefix, suffix, error, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className={`flex items-center rounded-xl border bg-white px-3 focus-within:ring-2 focus-within:ring-[#C1121F]/40 ${error ? "border-[#C1121F]" : "border-black/15"}`}>
        {prefix && <span className="mr-2 text-sm text-[#111111]/50">{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className="h-11 w-full min-w-0 bg-transparent text-base outline-none"
          placeholder="0"
        />
        {suffix && <span className="ml-2 text-sm text-[#111111]/50">{suffix}</span>}
      </div>
      {hint && !error && <p className="text-xs text-[#111111]/55">{hint}</p>}
      {error && <p id={`${id}-err`} className="text-xs font-medium text-[#C1121F]">{error}</p>}
    </div>
  );
}

export function ResultCard({ label, value, highlight, note }: { label: string; value: string; highlight?: boolean; note?: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-[#C1121F]/30 bg-[#C1121F]/5" : "border-black/10 bg-white"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-[#111111]/55">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${highlight ? "text-[#C1121F]" : ""}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-[#111111]/55">{note}</p>}
    </div>
  );
}

export function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-black/10 bg-[#FAFAFA] p-5 md:p-8">
      <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[#111111]/60">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <p role={tone === "warn" ? "alert" : undefined} className={`rounded-xl border px-4 py-3 text-sm ${tone === "warn" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-black/10 bg-white text-[#111111]/70"}`}>
      {children}
    </p>
  );
}
