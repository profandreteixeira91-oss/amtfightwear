import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyStudent, updateMyProfile } from "@/lib/student/student.functions";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/app/_student/profile")({
  head: () => ({ meta: [{ title: "Meu perfil — Portal do Aluno" }] }),
  component: ProfilePage,
});

const fields = [
  { name: "phone", label: "Telefone", type: "tel" },
  { name: "zip", label: "CEP" },
  { name: "street", label: "Rua" },
  { name: "address_number", label: "Número" },
  { name: "address_complement", label: "Complemento" },
  { name: "neighborhood", label: "Bairro" },
  { name: "city", label: "Cidade" },
  { name: "state", label: "UF" },
  { name: "emergency_contact_name", label: "Contato de emergência" },
  { name: "emergency_contact_phone", label: "Telefone de emergência", type: "tel" },
  { name: "emergency_contact_relationship", label: "Parentesco" },
] as const;

function ProfilePage() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMyStudent);
  const upFn = useServerFn(updateMyProfile);
  const { data: me } = useQuery({ queryKey: ["student", "me"], queryFn: () => meFn({}) });
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      initial[f.name] = ((me as unknown as Record<string, string | null>)[f.name] ?? "") as string;
    });
    setForm(initial);
  }, [me]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await upFn({ data: form as never });
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["student"] });
    } catch (err) {
      toast.error("Falha", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Meu perfil</h1>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <div className="flex items-center gap-3">
          {me?.photo_url ? (
            <img src={me.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-neutral-100" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{me?.full_name}</div>
            <div className="truncate text-xs text-neutral-500">{me?.email}</div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-neutral-400">
          Nome, e-mail, CPF, faixa e professor são gerenciados pela sua academia.
        </p>
      </section>

      <form onSubmit={onSave} className="space-y-3">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-xs font-medium text-neutral-600">{f.label}</label>
            <input
              type={("type" in f && f.type) || "text"}
              value={form[f.name] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-60"
          style={{ background: "var(--sa-primary, #dc2626)" }}
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}
