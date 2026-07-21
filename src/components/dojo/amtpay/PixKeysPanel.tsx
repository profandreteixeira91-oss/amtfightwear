import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  listPixKeys,
  createPixKey,
  setDefaultPixKey,
  deletePixKey,
} from "@/lib/dojo/pix-keys.functions";

const TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Aleatória" },
];

export function PixKeysPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPixKeys);
  const createFn = useServerFn(createPixKey);
  const setDefaultFn = useServerFn(setDefaultPixKey);
  const deleteFn = useServerFn(deletePixKey);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["amtpay", "pix-keys"],
    queryFn: () => listFn(),
  });

  const [form, setForm] = useState({
    key_type: "cpf" as "cpf" | "cnpj" | "email" | "phone" | "random",
    key_value: "",
    holder_name: "",
    holder_document: "",
    is_default: false,
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      toast.success("Chave PIX cadastrada.");
      qc.invalidateQueries({ queryKey: ["amtpay", "pix-keys"] });
      setForm({ ...form, key_value: "", holder_document: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const setDef = useMutation({
    mutationFn: (id: string) => setDefaultFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amtpay", "pix-keys"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Chave removida.");
      qc.invalidateQueries({ queryKey: ["amtpay", "pix-keys"] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nova chave PIX
          </CardTitle>
          <CardDescription>Cadastre destinos para receber seus saques.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <Label className="text-xs">Tipo</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={form.key_type}
              onChange={(e) => setForm({ ...form, key_type: e.target.value as any })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Chave</Label>
            <Input
              value={form.key_value}
              onChange={(e) => setForm({ ...form, key_value: e.target.value })}
              placeholder={form.key_type === "email" ? "voce@dojo.com" : "..."}
            />
          </div>
          <div>
            <Label className="text-xs">Titular</Label>
            <Input
              value={form.holder_name}
              onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Doc. do titular</Label>
            <Input
              value={form.holder_document}
              onChange={(e) => setForm({ ...form, holder_document: e.target.value })}
            />
          </div>
          <div className="md:col-span-5 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              Definir como chave padrão de saque
            </label>
            <Button
              onClick={() => create.mutate()}
              disabled={
                create.isPending || !form.key_value || !form.holder_name
              }
            >
              Cadastrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chaves cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Carregando...</div>
          ) : keys.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              Nenhuma chave cadastrada ainda.
            </div>
          ) : (
            <div className="divide-y">
              {keys.map((k: any) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between py-3 gap-3 flex-wrap"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {k.key_value}
                      {k.is_default && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" /> Padrão
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {TYPES.find((t) => t.value === k.key_type)?.label} · {k.holder_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!k.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDef.mutate(k.id)}
                      >
                        Tornar padrão
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Remover esta chave?")) del.mutate(k.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
