import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROVIDERS, type ProviderId } from "@/lib/dojo/competitions/providers";

export type CompetitionFormValues = {
  id?: string;
  provider: ProviderId;
  name: string;
  external_url?: string | null;
  banner_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  registration_deadline?: string | null;
  city?: string | null;
  state?: string | null;
  venue_name?: string | null;
  address?: string | null;
  organizer?: string | null;
  description?: string | null;
  modality?: string | null;
  with_gi?: boolean | null;
  entry_fee?: number | null;
  categories?: string[];
};

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function CompetitionFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<CompetitionFormValues> | null;
  onSubmit: (values: CompetitionFormValues) => Promise<void>;
}) {
  const [v, setV] = useState<CompetitionFormValues>({
    provider: "manual",
    name: "",
  });
  const [busy, setBusy] = useState(false);
  const [catsText, setCatsText] = useState("");

  useEffect(() => {
    if (open) {
      setV({
        provider: (initial?.provider as ProviderId) ?? "manual",
        name: initial?.name ?? "",
        id: initial?.id,
        external_url: initial?.external_url ?? "",
        banner_url: initial?.banner_url ?? "",
        starts_at: initial?.starts_at ?? null,
        ends_at: initial?.ends_at ?? null,
        registration_deadline: initial?.registration_deadline ?? null,
        city: initial?.city ?? "",
        state: initial?.state ?? "",
        venue_name: initial?.venue_name ?? "",
        address: initial?.address ?? "",
        organizer: initial?.organizer ?? "",
        description: initial?.description ?? "",
        modality: initial?.modality ?? "",
        with_gi: initial?.with_gi ?? null,
        entry_fee: initial?.entry_fee ?? null,
        categories: initial?.categories ?? [],
      });
      setCatsText((initial?.categories ?? []).join(", "));
    }
  }, [open, initial]);

  const save = async () => {
    if (!v.name.trim()) return;
    setBusy(true);
    try {
      await onSubmit({
        ...v,
        categories: catsText.split(",").map((s) => s.trim()).filter(Boolean),
        entry_fee: v.entry_fee != null && !isNaN(Number(v.entry_fee)) ? Number(v.entry_fee) : null,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{v.id ? "Editar competição" : "Nova competição"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Nome *</Label>
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </div>

          <div>
            <Label>Provedor / Origem</Label>
            <select
              className="w-full border rounded p-2 bg-background h-10"
              value={v.provider}
              onChange={(e) => setV({ ...v, provider: e.target.value as ProviderId })}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Organizador</Label>
            <Input value={v.organizer ?? ""} onChange={(e) => setV({ ...v, organizer: e.target.value })} />
          </div>

          <div>
            <Label>Início</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(v.starts_at)}
              onChange={(e) => setV({ ...v, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div>
            <Label>Fim</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(v.ends_at)}
              onChange={(e) => setV({ ...v, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>

          <div>
            <Label>Prazo de inscrição</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(v.registration_deadline)}
              onChange={(e) => setV({ ...v, registration_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div>
            <Label>Valor da inscrição (R$)</Label>
            <Input
              type="number" step="0.01"
              value={v.entry_fee ?? ""}
              onChange={(e) => setV({ ...v, entry_fee: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>

          <div>
            <Label>Cidade</Label>
            <Input value={v.city ?? ""} onChange={(e) => setV({ ...v, city: e.target.value })} />
          </div>
          <div>
            <Label>Estado (UF)</Label>
            <Input value={v.state ?? ""} maxLength={2} onChange={(e) => setV({ ...v, state: e.target.value.toUpperCase() })} />
          </div>

          <div>
            <Label>Local (nome)</Label>
            <Input value={v.venue_name ?? ""} onChange={(e) => setV({ ...v, venue_name: e.target.value })} />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={v.address ?? ""} onChange={(e) => setV({ ...v, address: e.target.value })} />
          </div>

          <div>
            <Label>Modalidade</Label>
            <Input placeholder="Ex.: Jiu-Jitsu, No-Gi, Grappling"
              value={v.modality ?? ""}
              onChange={(e) => setV({ ...v, modality: e.target.value })} />
          </div>
          <div>
            <Label>Kimono</Label>
            <select
              className="w-full border rounded p-2 bg-background h-10"
              value={v.with_gi == null ? "" : v.with_gi ? "gi" : "nogi"}
              onChange={(e) => {
                const val = e.target.value;
                setV({ ...v, with_gi: val === "" ? null : val === "gi" });
              }}
            >
              <option value="">—</option>
              <option value="gi">Com kimono</option>
              <option value="nogi">Sem kimono</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label>Categorias (separe por vírgula)</Label>
            <Input value={catsText} onChange={(e) => setCatsText(e.target.value)} placeholder="Adulto, Master 1, Infantil…" />
          </div>

          <div className="md:col-span-2">
            <Label>Link oficial (inscrição)</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={v.external_url ?? ""}
              onChange={(e) => setV({ ...v, external_url: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Banner (URL)</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={v.banner_url ?? ""}
              onChange={(e) => setV({ ...v, banner_url: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={4} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy || !v.name.trim()}>
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
