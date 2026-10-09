import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories } from "@/lib/store/store.functions";
import { supabase } from "@/integrations/supabase/client";
import { getMyCustomerProfile, saveMyCustomerProfile } from "@/lib/store/customer-profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/loja/conta/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }),
    );
  },
  head: () => ({
    meta: [
      { title: "Minha conta — AMT Fight Wear" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Página não encontrada</div>,
});

function AccountPage() {
  const navigate = useNavigate();
  const { data: categories } = useSuspenseQuery(
    queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }),
  );
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    document: "",
    zip: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/loja/entrar", search: { redirect: "/loja/conta" }, replace: true });
        return;
      }
      setChecking(false);
      setLoading(true);
      try {
        const p = await getMyCustomerProfile();
        if (p) {
          setEmail(p.email ?? "");
          setForm((f) => ({
            full_name: p.full_name ?? "",
            phone: p.phone ?? "",
            document: p.document ?? "",
            zip: p.zip ?? "",
            street: p.street ?? "",
            number: p.number ?? "",
            complement: p.complement ?? "",
            neighborhood: p.neighborhood ?? "",
            city: p.city ?? "",
            state: p.state ?? "",
          }));
        }
      } finally {
        setLoading(false);
      }
    });
  }, [navigate]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveMyCustomerProfile({ data: form });
      toast.success("Dados atualizados");
    } catch (err) {
      toast.error("Erro ao salvar", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  if (checking) {
    return (
      <StoreShell categories={categories}>
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Minha conta</h1>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          <nav className="flex gap-2">
            <Link
              to="/loja/conta"
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background"
            >
              <User className="h-4 w-4" /> Meus dados
            </Link>
            <Link
              to="/loja/conta/pedidos"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-accent"
            >
              <Package className="h-4 w-4" /> Meus pedidos
            </Link>
          </nav>
        </div>

        {loading ? (
          <div className="grid min-h-[30vh] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">Dados pessoais</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" value={form.full_name} onChange={upd("full_name")} />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={upd("phone")} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label htmlFor="document">CPF / CNPJ</Label>
                <Input id="document" value={form.document} onChange={upd("document")} />
              </div>
            </div>

            <h2 className="mb-4 mt-8 text-lg font-bold">Endereço de entrega</h2>
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Label htmlFor="zip">CEP</Label>
                <Input id="zip" value={form.zip} onChange={upd("zip")} />
              </div>
              <div className="sm:col-span-4">
                <Label htmlFor="street">Rua</Label>
                <Input id="street" value={form.street} onChange={upd("street")} />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="number">Nº</Label>
                <Input id="number" value={form.number} onChange={upd("number")} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" value={form.complement} onChange={upd("complement")} />
              </div>
              <div className="sm:col-span-3">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" value={form.neighborhood} onChange={upd("neighborhood")} />
              </div>
              <div className="sm:col-span-4">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={form.city} onChange={upd("city")} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="state">UF</Label>
                <Input id="state" value={form.state} onChange={upd("state")} maxLength={2} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          </form>
        )}
      </div>
    </StoreShell>
  );
}
