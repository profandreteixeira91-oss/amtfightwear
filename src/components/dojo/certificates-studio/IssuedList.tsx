import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listIssuedCertificates, deleteIssuedCertificate } from "@/lib/dojo/dojo.functions";

export function IssuedList() {
  const listFn = useServerFn(listIssuedCertificates);
  const delFn = useServerFn(deleteIssuedCertificate);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const issued = useQuery({ queryKey: ["dojo-issued-certificates"], queryFn: () => listFn() });

  const rows = useMemo(() => {
    const list: any[] = issued.data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) =>
      (r.student?.full_name ?? "").toLowerCase().includes(s) ||
      (r.template?.name ?? "").toLowerCase().includes(s) ||
      (r.public_hash ?? "").toLowerCase().includes(s)
    );
  }, [issued.data, q]);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Excluir o certificado de "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await delFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["dojo-issued-certificates"] });
      toast.success("Certificado excluído");
    } catch (e: any) { toast.error(e.message ?? String(e)); }
  };

  const validationUrl = (hash: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/certificate/${hash}`;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("Copiado"); }
    catch { toast.error("Não foi possível copiar"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por aluno, modelo ou código…" className="h-9 w-72 pl-7 text-sm" />
        </div>
        <div className="text-xs text-muted-foreground">{rows.length} emitido(s)</div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Aluno</th>
              <th className="p-2 text-left">Modelo</th>
              <th className="p-2 text-left">Emitido</th>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-2 font-medium">{r.student?.full_name ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{r.template?.name ?? "—"}</td>
                <td className="p-2 text-muted-foreground">
                  {r.issued_at ? new Date(r.issued_at).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="p-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{r.public_hash?.slice(0, 12)}…</code>
                </td>
                <td className="p-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Copiar link de validação"
                      onClick={() => copy(validationUrl(r.public_hash))}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <a
                      href={validationUrl(r.public_hash)}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir página de validação"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {r.pdf_url ? (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Baixar PDF"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground" title="PDF não disponível">
                        <Download className="h-4 w-4 opacity-30" />
                      </span>
                    )}
                    <Button size="icon" variant="ghost" title="Excluir"
                      onClick={() => remove(r.id, r.student?.full_name ?? "certificado")}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                  {issued.isLoading ? "Carregando…" : "Nenhum certificado emitido ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
