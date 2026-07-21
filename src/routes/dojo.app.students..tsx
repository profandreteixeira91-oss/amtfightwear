
// ============ Critério de graduação (aluno) ============
function GraduationCriteriaCard({
  student, belts, graduations, attendanceRows, onSaved, saveStudent,
}: {
  student: any; belts: any[]; graduations: any[]; attendanceRows: any[];
  onSaved: () => void; saveStudent: (args: any) => Promise<any>;
}) {
  const lastGrad = graduations[0];
  const currentBelt =
    (lastGrad?.belt as any) ??
    (student?.current_belt_id ? belts.find((b: any) => b.id === student.current_belt_id) : null);

  const sinceDate = lastGrad?.graduation_date
    ? new Date(lastGrad.graduation_date)
    : (student?.created_at ? new Date(student.created_at) : new Date(0));
  const attendanceSince = attendanceRows.filter(
    (a: any) => a?.checked_in_at && new Date(a.checked_in_at) >= sinceDate,
  ).length;
  const monthsSince = Math.floor(
    (Date.now() - sinceDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375),
  );

  const hasOverride = Boolean(
    student?.graduation_criteria_mode ||
    student?.graduation_min_classes != null ||
    student?.graduation_min_months != null,
  );

  const [useOverride, setUseOverride] = useState<boolean>(hasOverride);
  const [mode, setMode] = useState<string>(
    student?.graduation_criteria_mode ?? currentBelt?.criteria_mode ?? "time",
  );
  const [minClasses, setMinClasses] = useState<string>(
    student?.graduation_min_classes != null
      ? String(student.graduation_min_classes)
      : (currentBelt?.min_classes != null ? String(currentBelt.min_classes) : ""),
  );
  const [minMonths, setMinMonths] = useState<string>(
    student?.graduation_min_months != null
      ? String(student.graduation_min_months)
      : (currentBelt?.min_months != null ? String(currentBelt.min_months) : ""),
  );
  const [saving, setSaving] = useState(false);

  const effectiveMode = useOverride ? mode : (currentBelt?.criteria_mode ?? "time");
  const effectiveMinClasses = useOverride
    ? (minClasses.trim() === "" ? null : Number(minClasses))
    : (currentBelt?.min_classes ?? null);
  const effectiveMinMonths = useOverride
    ? (minMonths.trim() === "" ? null : Number(minMonths))
    : (currentBelt?.min_months ?? null);

  const save = async () => {
    setSaving(true);
    try {
      await saveStudent({ data: {
        id: student.id,
        full_name: student.full_name,
        graduation_criteria_mode: useOverride ? (mode as any) : null,
        graduation_min_classes: useOverride
          ? (minClasses.trim() === "" ? null : Number(minClasses))
          : null,
        graduation_min_months: useOverride
          ? (minMonths.trim() === "" ? null : Number(minMonths))
          : null,
      }});
      toast.success("Critério do aluno atualizado");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar critério");
    } finally {
      setSaving(false);
    }
  };

  const classesPct = effectiveMinClasses && effectiveMinClasses > 0
    ? Math.min(100, Math.round((attendanceSince / effectiveMinClasses) * 100)) : 0;
  const monthsPct = effectiveMinMonths && effectiveMinMonths > 0
    ? Math.min(100, Math.round((monthsSince / effectiveMinMonths) * 100)) : 0;

  return (
    <SectionCard title="Critério para próxima graduação" icon={TrendingUp}>
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Faixa atual: <strong>{currentBelt?.name ?? "—"}</strong>
          {" · "}Desde {sinceDate.getTime() > 0 ? sinceDate.toLocaleDateString("pt-BR") : "—"}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(effectiveMode === "classes" || effectiveMode === "time") && effectiveMinClasses != null && (
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Aulas realizadas</span>
                <span className="font-mono">{attendanceSince}/{effectiveMinClasses}</span>
              </div>
              <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${classesPct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {attendanceSince >= effectiveMinClasses ? "Meta atingida" : `${effectiveMinClasses - attendanceSince} restantes`}
              </div>
            </div>
          )}
          {(effectiveMode === "time" || effectiveMode === "classes") && effectiveMinMonths != null && (
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tempo de permanência</span>
                <span className="font-mono">{monthsSince}/{effectiveMinMonths} meses</span>
              </div>
              <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${monthsPct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {monthsSince >= effectiveMinMonths ? "Carência cumprida" : `${effectiveMinMonths - monthsSince} meses restantes`}
              </div>
            </div>
          )}
          {effectiveMode === "evaluation" && (
            <div className="rounded-md border p-3 text-xs sm:col-span-2">
              Critério: <strong>mediante avaliação</strong>. A promoção depende do resultado de uma avaliação registrada pelo instrutor.
            </div>
          )}
          {effectiveMode === "merit" && (
            <div className="rounded-md border p-3 text-xs sm:col-span-2">
              Critério: <strong>por mérito</strong>. A promoção é decidida pelo instrutor, sem meta objetiva de tempo ou aulas.
            </div>
          )}
        </div>

        <div className="rounded-md border border-dashed p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} />
            <span>Sobrescrever critério para este aluno (caso a caso)</span>
          </label>
          {!useOverride && (
            <p className="text-[11px] text-muted-foreground">
              Sem sobrescrita, vale o critério universal da faixa atual
              ({currentBelt?.criteria_mode === "classes" ? "por aulas" :
                currentBelt?.criteria_mode === "evaluation" ? "por avaliação" :
                currentBelt?.criteria_mode === "merit" ? "por mérito" : "por tempo"}).
            </p>
          )}
          {useOverride && (
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-2 text-sm sm:col-span-3"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="time">Tempo mínimo</option>
                <option value="classes">Mínimo de aulas</option>
                <option value="evaluation">Mediante avaliação</option>
                <option value="merit">Por mérito</option>
              </select>
              <Input
                type="number" min={0} placeholder="Meses mínimos"
                value={minMonths} onChange={(e) => setMinMonths(e.target.value)}
                disabled={mode === "evaluation" || mode === "merit"}
              />
              <Input
                type="number" min={0} placeholder="Aulas mínimas"
                value={minClasses} onChange={(e) => setMinClasses(e.target.value)}
                disabled={mode === "evaluation" || mode === "merit"}
              />
              <div className="flex justify-end sm:col-span-1">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar critério"}
                </Button>
              </div>
            </div>
          )}
          {!useOverride && hasOverride && (
            <Button size="sm" variant="outline" onClick={save} disabled={saving}>
              Remover sobrescrita
            </Button>
          )}
          {!useOverride && !hasOverride && (
            <Button size="sm" variant="outline" onClick={save} disabled={saving}>
              Salvar
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
