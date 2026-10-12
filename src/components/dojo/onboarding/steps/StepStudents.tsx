import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listDojoBelts, saveDojoStudent, bulkImportDojoStudents } from "@/lib/dojo/dojo.functions";
import { parseStudentsFile, type ParsedStudentRow, STUDENT_IMPORT_COLUMNS } from "@/lib/dojo/students-xlsx";
import { maskPhone } from "@/lib/br-masks";
import type { SetupState } from "@/lib/dojo/setup.functions";
import { validateSetupRows, setupStudentSchema } from "@/lib/dojo/setup-validation";

export function StepStudents({ state, refresh, onBusy }: { state: SetupState; refresh: () => Promise<void>; onBusy: (value: boolean) => void }) {
  const save = useServerFn(saveDojoStudent); const importStudents = useServerFn(bulkImportDojoStudents); const getBelts = useServerFn(listDojoBelts);
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => getBelts() });
  const [mode, setMode] = useState("quick"); const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [birth, setBirth] = useState(""); const [belt, setBelt] = useState("");
  const [rows, setRows] = useState<ParsedStudentRow[]>([]); const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const modeDescriptions: Record<string, string> = {
    quick: "Ideal para começar agora: preencha nome, contato e faixa inicial e salve. Cada aluno leva poucos segundos e você pode repetir quantas vezes quiser.",
    import: "Melhor para listas prontas: baixe o modelo CSV ou XLSX, preencha uma linha por aluno e envie o arquivo. O sistema valida os dados e mostra uma prévia antes de confirmar.",
    link: "Perfeito para captar novos alunos: copie o link e envie pelo WhatsApp ou Instagram. O aluno preenche a pré-matrícula sozinho e os dados chegam prontos para você aproveitar.",
  };
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  return <div className="space-y-5">
    <div role="tablist" aria-label="Como cadastrar alunos" className="flex flex-wrap gap-2">{[["quick", "Cadastro rápido"], ["import", "Planilha"], ["link", "Pré-matrícula"]].map(([value, label]) => <Button key={value} role="tab" aria-selected={mode === value} variant={mode === value ? "default" : "outline"} onClick={() => setMode(value)}>{label}</Button>)}</div>
    <p className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground" role="note">{modeDescriptions[mode]}</p>
    <p className="text-sm text-muted-foreground">{state.students} alunos cadastrados</p>
    {mode === "quick" && <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); onBusy(true);
      try { setupStudentSchema.parse({ full_name: name, phone, birth_date: birth }); await save({ data: { full_name: name.trim(), phone: phone || null, birth_date: birth || null, current_belt_id: belt || null, current_degree: 0, status: "active" } }); setName(""); setPhone(""); setBirth(""); setBelt(""); await refresh(); toast.success("Aluno cadastrado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar."); } finally { setBusy(false); onBusy(false); }
    }}>
      <Label htmlFor="setup-student-name">Nome completo</Label><Input id="setup-student-name" required minLength={2} maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
      <Label htmlFor="setup-student-phone">WhatsApp / celular</Label><Input id="setup-student-phone" type="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
      <Label htmlFor="setup-birth">Data de nascimento</Label><Input id="setup-birth" type="date" max={today} value={birth} onChange={(e) => setBirth(e.target.value)} />
      <Label htmlFor="setup-belt">Faixa inicial</Label><select id="setup-belt" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={belt} onChange={(e) => setBelt(e.target.value)}><option value="">Sem faixa informada</option>{(belts.data ?? []).map((b: { id: string; name: string; modality?: string | null }) => <option key={b.id} value={b.id}>{b.name} · {b.modality}</option>)}</select>
      <Button className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar e adicionar outro"}</Button>
      <Button asChild variant="link"><Link to="/dojo/app/students">Cadastro completo e matrícula</Link></Button>
    </form>}
    {mode === "import" && <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => {
        const blob = new Blob(["\ufeff" + STUDENT_IMPORT_COLUMNS.map((c) => c.key).join(",") + "\n"], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "modelo-alunos.csv"; a.click(); URL.revokeObjectURL(url);
      }}>Baixar modelo CSV</Button><Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>Selecionar planilha</Button></div>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" aria-label="Planilha de alunos" className="sr-only" onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file) return; setErrors([]); setRows([]); setBusy(true); onBusy(true);
        try { if (file.size > 5 * 1024 * 1024) throw new Error("Arquivo máximo: 5 MB."); const parsed = await parseStudentsFile(file, true); if (!parsed.length || parsed.length > 500) throw new Error("Selecione uma planilha com 1 a 500 alunos."); setErrors(validateSetupRows(parsed)); setRows(parsed); } catch (error) { toast.error(error instanceof Error ? error.message : "Arquivo inválido."); } finally { setBusy(false); onBusy(false); e.target.value = ""; }
      }} />
      {rows.length > 0 && <><div className="max-h-48 overflow-auto rounded-md border"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Nome</th><th className="p-2">Telefone</th></tr></thead><tbody>{rows.map((row, i) => <tr key={`${row.full_name}-${i}`}><td className="p-2">{row.full_name}</td><td className="p-2">{row.phone}</td></tr>)}</tbody></table></div><Button disabled={busy || errors.length > 0} onClick={async () => {
        setBusy(true); onBusy(true); try { const result = await importStudents({ data: { rows: rows.map((row) => ({ ...row, full_name: row.full_name, status: row.status === "inactive" || row.status === "frozen" ? row.status : "active" as const })) } }); const failed = new Set(result.errors.map((error) => error.index - 2)); setRows(rows.filter((_, index) => failed.has(index))); setErrors(result.errors.map((error) => `${error.full_name}: ${error.message}`)); await refresh(); toast.success(`${result.inserted} alunos importados.`); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha na importação."); } finally { setBusy(false); onBusy(false); }
      }}>{busy ? "Importando…" : `Confirmar ${rows.length} alunos`}</Button></>}
      {errors.length > 0 && <ul role="alert" className="text-sm text-destructive">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
    </div>}
    {mode === "link" && <div className="space-y-3">{state.academy?.slug ? <><Input readOnly aria-label="Link de pré-matrícula" value={`${window.location.origin}/dojo/matricula/${state.academy.slug}`} /><Button onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/dojo/matricula/${state.academy?.slug}`); toast.success("Link copiado."); } catch { toast.error("Não foi possível copiar o link."); } }}>Copiar link</Button></> : <Button asChild variant="outline"><Link to="/dojo/app/account" search={{ tab: "academy", onboarding: undefined }}>Configurar link da academia</Link></Button>}</div>}
  </div>;
}