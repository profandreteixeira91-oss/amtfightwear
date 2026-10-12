import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODALITIES } from "@/components/dojo/schedule/constants";
import { saveSetupIdentity, type SetupState } from "@/lib/dojo/setup.functions";
import { maskPhone } from "@/lib/br-masks";

export function StepIdentity({ academy, onNext }: { academy: SetupState["academy"]; onNext: () => Promise<void> }) {
  const save = useServerFn(saveSetupIdentity);
  const [form, setForm] = useState({ trade_name: academy?.trade_name ?? "", whatsapp: academy?.whatsapp ?? "", city: academy?.city ?? "", state: academy?.state ?? "", modalities: academy?.modalities ?? [] });
  const [busy, setBusy] = useState(false);
  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true);
    try { await save({ data: form }); await onNext(); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setBusy(false); }
  }}>
    <div className="space-y-2"><Label htmlFor="setup-name">Nome do dojo</Label><Input id="setup-name" required minLength={2} maxLength={200} value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} /></div>
    <div className="space-y-2"><Label htmlFor="setup-phone">WhatsApp</Label><Input id="setup-phone" type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} /></div>
    <div className="grid grid-cols-[1fr_80px] gap-3"><div className="space-y-2"><Label htmlFor="setup-city">Cidade</Label><Input id="setup-city" maxLength={120} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="setup-state">UF</Label><Input id="setup-state" maxLength={2} pattern="[A-Za-z]{2}" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} /></div></div>
    <fieldset><legend className="mb-3 text-sm font-medium">Modalidades</legend><div className="grid grid-cols-2 gap-3">{MODALITIES.map((modality) => <label key={modality} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.modalities.includes(modality)} onChange={(e) => setForm({ ...form, modalities: e.target.checked ? [...form.modalities, modality] : form.modalities.filter((m) => m !== modality) })} />{modality}</label>)}</div></fieldset>
    <Button type="submit" disabled={busy || form.modalities.length === 0} className="w-full">{busy ? "Salvando…" : "Salvar e continuar"}</Button>
  </form>;
}