import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODALITIES } from "@/components/dojo/schedule/constants";
import { saveSetupIdentity, type SetupState } from "@/lib/dojo/setup.functions";
import { maskPhone } from "@/lib/br-masks";
import { supabase } from "@/integrations/supabase/client";

export function StepIdentity({ academy, onNext, onBusy }: { academy: SetupState["academy"]; onNext: () => Promise<void>; onBusy: (value: boolean) => void }) {
  const save = useServerFn(saveSetupIdentity);
  const [form, setForm] = useState({ trade_name: academy?.trade_name ?? "", whatsapp: academy?.whatsapp ?? "", city: academy?.city ?? "", state: academy?.state ?? "", modalities: academy?.modalities ?? [] });
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); onBusy(true);
    try {
      let logoUrl = academy?.logo_url ?? null;
      if (logo) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(logo.type) || logo.size > 5 * 1024 * 1024) throw new Error("Use PNG, JPEG ou WebP de até 5 MB.");
        const { data, error } = await supabase.auth.getUser(); if (error || !data.user) throw new Error("Sessão expirada.");
        const path = `logo/${data.user.id}/${crypto.randomUUID()}.${logo.type.split("/")[1]}`;
        const uploaded = await supabase.storage.from("dojo-brand").upload(path, logo, { contentType: logo.type });
        if (uploaded.error) throw new Error(uploaded.error.message);
        logoUrl = supabase.storage.from("dojo-brand").getPublicUrl(path).data.publicUrl;
      }
      await save({ data: { ...form, logo_url: logoUrl } }); await onNext();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setBusy(false); onBusy(false); }
  }}>
    <div className="space-y-2"><Label htmlFor="setup-name">Nome do dojo</Label><Input id="setup-name" required minLength={2} maxLength={200} value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} /></div>
    <div className="space-y-2"><Label htmlFor="setup-phone">WhatsApp</Label><Input id="setup-phone" type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} /></div>
    <div className="grid grid-cols-[1fr_80px] gap-3"><div className="space-y-2"><Label htmlFor="setup-city">Cidade</Label><Input id="setup-city" maxLength={120} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="setup-state">UF</Label><Input id="setup-state" maxLength={2} pattern="[A-Za-z]{2}" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} /></div></div>
    <fieldset><legend className="mb-3 text-sm font-medium">Modalidades</legend><div className="grid grid-cols-2 gap-3">{MODALITIES.map((modality) => <label key={modality} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.modalities.includes(modality)} onChange={(e) => setForm({ ...form, modalities: e.target.checked ? [...form.modalities, modality] : form.modalities.filter((m) => m !== modality) })} />{modality}</label>)}</div></fieldset>
    <div className="space-y-2"><Label htmlFor="setup-logo">Logotipo (opcional)</Label><Input id="setup-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></div>
    <Button type="submit" disabled={busy || form.modalities.length === 0} className="w-full">{busy ? "Salvando…" : "Salvar e continuar"}</Button>
  </form>;
}