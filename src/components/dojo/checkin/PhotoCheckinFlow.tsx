import { useState, useRef, useMemo, useEffect } from "react";
import { Camera, Check, X, AlertTriangle, RefreshCw, Users, Search, Trash2, Image as ImageIcon, MapPin, Calendar, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";
import { listClasses, listTodayClassOccurrences } from "@/lib/dojo/schedule.functions";
import { startFaceRecognition, confirmSmartCheckins } from "@/lib/dojo/face-recognition.functions";
import { searchStudents } from "@/lib/dojo/checkin.functions";
import { supabase } from "@/integrations/supabase/client";

interface PhotoCheckinFlowProps {
  onComplete: () => void;
  onCancel: () => void;
  unitId?: string;
}

const STEPS = [
  { key: "setup", label: "Configurar" },
  { key: "processing", label: "Processar" },
  { key: "validation", label: "Validar" },
] as const;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function PhotoCheckinFlow({ onComplete, onCancel, unitId: initialUnitId }: PhotoCheckinFlowProps) {
  const [step, setStep] = useState<"setup" | "processing" | "validation">("setup");
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnitId || "");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [classPhotoId, setClassPhotoId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const qc = useQueryClient();
  const unitsFn = useServerFn(listDojoUnits);
  const classesFn = useServerFn(listClasses);
  const todayOccFn = useServerFn(listTodayClassOccurrences);
  const startRecognition = useServerFn(startFaceRecognition);
  const confirmCheckins = useServerFn(confirmSmartCheckins);

  const { data: units } = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });
  const { data: classes, isLoading: loadingClasses } = useQuery({
    queryKey: ["dojo-classes-photo-checkin"],
    queryFn: () => classesFn(),
  });
  const { data: occurrences, isLoading: loadingOccurrences } = useQuery({
    queryKey: ["dojo-today-occurrences", selectedClassId],
    queryFn: () => todayOccFn({ data: { classId: selectedClassId } }),
    enabled: !!selectedClassId,
  });

  const filteredClasses = useMemo(
    () => (classes ?? []).filter((c: any) => !selectedUnitId || c.unit_id === selectedUnitId),
    [classes, selectedUnitId],
  );

  useEffect(() => {
    if (selectedClassId && !filteredClasses.some((c: any) => c.id === selectedClassId)) {
      setSelectedClassId("");
      setSelectedOccurrenceId("");
    }
  }, [selectedUnitId, filteredClasses, selectedClassId]);

  useEffect(() => {
    setSelectedOccurrenceId("");
  }, [selectedClassId]);

  // Auto-seleciona a única ocorrência do dia (comum quando a turma tem apenas 1 horário).
  useEffect(() => {
    if (!selectedOccurrenceId && (occurrences ?? []).length === 1) {
      setSelectedOccurrenceId((occurrences as any[])[0].id);
    }
  }, [occurrences, selectedOccurrenceId]);

  useEffect(() => {
    if (!selectedUnitId && units && units.length === 1) {
      setSelectedUnitId(units[0].id);
    }
  }, [units, selectedUnitId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep("processing");
    processPhoto(f);
    e.target.value = "";
  }

  async function processPhoto(f: File) {
    setIsProcessing(true);
    setProcessingProgress(10);
    try {
      const ext = f.name.split(".").pop();
      const path = `class-photos/${crypto.randomUUID()}.${ext}`;
      setProcessingProgress(30);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("academy_documents")
        .upload(path, f);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("academy_documents")
        .getPublicUrl(path);

      setPhotoUrl(publicUrl);
      setProcessingProgress(60);

      const res = await startRecognition({
        data: {
          photoUrl: publicUrl,
          classId: selectedClassId,
          unitId: selectedUnitId,
          lessonHistoryId: null,
        },
      });

      setClassPhotoId(res.classPhotoId);
      setResults(
        res.faces.map((f: any) => ({
          ...f,
          status: f.studentId && f.confidence >= res.minConfidence ? "confirmed" : "pending",
        })),
      );

      setProcessingProgress(100);
      setTimeout(() => setStep("validation"), 500);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar foto");
      setStep("setup");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleConfirm() {
    try {
      const confirms = results
        .filter((r) => r.status === "confirmed")
        .map((r) => ({ studentId: r.studentId, status: "confirmed" as const }));

      await confirmCheckins({ data: { classPhotoId, confirms } });
      toast.success(`${confirms.length} check-ins realizados com sucesso!`);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Erro ao confirmar check-ins");
    }
  }

  const canProceed = !!selectedUnitId && !!selectedClassId;
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return `${WEEKDAYS[d.getDay()]}, ${d.toLocaleDateString("pt-BR")}`;
  }, []);

  return (
    <div className="space-y-5 text-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 ring-1 ring-red-200">
            <Camera className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight text-slate-900">Check-in por Foto</h3>
            <p className="text-xs text-slate-500">Identifique a turma inteira em uma única imagem</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-1 transition-all ${
                  i <= currentStepIndex
                    ? "bg-red-600 text-white ring-red-600"
                    : "bg-slate-100 text-slate-400 ring-slate-200"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`hidden text-[11px] font-medium sm:inline ${
                  i <= currentStepIndex ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="hidden h-px w-4 bg-slate-200 sm:block" />}
            </div>
          ))}
        </div>
      </div>

      {step === "setup" && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Unidade"
                value={selectedUnitId}
                onChange={setSelectedUnitId}
                placeholder="Selecione a unidade..."
                options={(units ?? []).map((u: any) => ({ value: u.id, label: u.name }))}
              />
              <SelectField
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Turma"
                value={selectedClassId}
                onChange={setSelectedClassId}
                placeholder={
                  !selectedUnitId
                    ? "Selecione a unidade primeiro"
                    : loadingClasses
                      ? "Carregando turmas..."
                      : filteredClasses.length === 0
                        ? "Nenhuma turma nesta unidade"
                        : "Selecione a turma..."
                }
                disabled={!selectedUnitId || loadingClasses || filteredClasses.length === 0}
                options={filteredClasses.map((c: any) => ({ value: c.id, label: c.name }))}
              />
            </div>

            <SelectField
              icon={<BookOpen className="h-3.5 w-3.5" />}
              label={`Aula do dia · ${todayLabel}`}
              hint="Puxado automaticamente da Agenda da turma selecionada"
              value={selectedOccurrenceId}
              onChange={setSelectedOccurrenceId}
              placeholder={
                !selectedClassId
                  ? "Selecione a turma primeiro"
                  : loadingOccurrences
                    ? "Carregando aulas do dia..."
                    : (occurrences ?? []).length === 0
                      ? "Nenhuma aula agendada hoje para esta turma"
                      : "Selecione o horário da aula..."
              }
              disabled={!selectedClassId || loadingOccurrences || (occurrences ?? []).length === 0}
              options={(occurrences ?? []).map((o: any) => ({
                value: o.id,
                label: `${(o.start_time ?? "").slice(0, 5)} – ${(o.end_time ?? "").slice(0, 5)}`,
              }))}
            />

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Fonte da imagem
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!canProceed}
                  className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/60 p-6 text-slate-900 transition-all hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 ring-1 ring-red-200 group-hover:bg-red-200">
                    <Camera className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold">Tirar foto agora</div>
                    <div className="text-[11px] text-slate-500">Usa a câmera do dispositivo</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canProceed}
                  className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 group-hover:bg-slate-50">
                    <ImageIcon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold">Enviar da galeria</div>
                    <div className="text-[11px] text-slate-500">JPG ou PNG até 10 MB</div>
                  </div>
                </button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              {!canProceed && (
                <p className="pt-1 text-center text-[11px] text-amber-600">
                  Selecione unidade e turma antes de escolher a imagem.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button variant="ghost" className="text-slate-500 hover:text-slate-900" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "processing" && (
        <Card className="border-slate-200 bg-white py-12 shadow-sm">
          <CardContent className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-red-200/60" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-600 shadow-[0_10px_30px_-10px_rgba(220,38,38,0.6)]">
                <RefreshCw className="h-10 w-10 animate-spin text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Processando Imagem</h3>
              <p className="text-sm text-slate-500">Detectando rostos e comparando com a base de alunos...</p>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Progress value={processingProgress} className="h-2 bg-slate-100" />
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">{processingProgress}% Concluído</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "validation" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <img src={photoUrl} className="h-full w-full object-contain" alt="Aula" />
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="absolute border-2 transition-all"
                    style={{
                      left: `${r.box.x}%`,
                      top: `${r.box.y}%`,
                      width: `${r.box.w}%`,
                      height: `${r.box.h}%`,
                      borderColor: r.studentId ? (r.confidence > 0.9 ? "#16a34a" : "#ca8a04") : "#dc2626"
                    }}
                  />
                ))}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Rostos encontrados: {results.length}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      {results.filter(r => r.studentId).length} Identificados
                    </Badge>
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                      {results.filter(r => !r.studentId).length} Desconhecidos
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Resultados da Identificação</h3>
              <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {results.map((face, idx) => (
                  <FaceResultCard
                    key={idx}
                    face={face}
                    onUpdate={(updated) => {
                      const newRes = [...results];
                      newRes[idx] = updated;
                      setResults(newRes);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setStep("setup")}>
              Refazer
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm}>
              Confirmar {results.filter(r => r.status === "confirmed").length} Check-ins
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectField({
  icon,
  label,
  hint,
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500">{icon}</span>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          {label}
        </label>
      </div>
      <select
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-[10.5px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FaceResultCard({ face, onUpdate }: { face: any; onUpdate: (f: any) => void }) {
  const [showSearch, setShowSearch] = useState(false);
  const isHighConfidence = face.confidence >= 0.9;
  const isUnknown = !face.studentId;

  return (
    <Card className={`overflow-hidden border-slate-200 bg-white transition-all ${isUnknown ? 'ring-1 ring-red-200' : !isHighConfidence ? 'ring-1 ring-amber-200' : ''}`}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
          {face.photo_url ? (
            <img src={face.photo_url} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Users className="h-5 w-5 text-slate-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-slate-900">
              {face.name || "Pessoa Desconhecida"}
            </span>
            {isHighConfidence && face.studentId && <Check className="h-3.5 w-3.5 text-emerald-600" />}
            {!isHighConfidence && face.studentId && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="font-medium text-slate-500 uppercase">Confiança:</span>
            <span className={`font-bold ${isHighConfidence ? 'text-emerald-600' : 'text-amber-600'}`}>
              {Math.round(face.confidence * 100)}%
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {face.status === "confirmed" ? (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => onUpdate({ ...face, status: "pending" })}>
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => onUpdate({ ...face, status: "confirmed" })}>
              <Check className="h-4 w-4" />
            </Button>
          )}

          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => setShowSearch(true)}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => onUpdate({ ...face, status: "ignored" })}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {showSearch && (
          <StudentPickerModal
            onClose={() => setShowSearch(false)}
            onPick={(s) => {
              onUpdate({
                ...face,
                studentId: s.id,
                name: s.full_name,
                photo_url: s.photo_url,
                status: "confirmed"
              });
              setShowSearch(false);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function StudentPickerModal({ onClose, onPick }: { onClose: () => void; onPick: (s: any) => void }) {
  const [q, setQ] = useState("");
  const searchFn = useServerFn(searchStudents);
  const { data: results, isLoading } = useQuery({
    queryKey: ["student-search-picker", q],
    queryFn: () => searchFn({ data: { q } }),
    enabled: q.length > 2
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Vincular Aluno</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 pl-10 text-slate-900 outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Buscar por nome ou CPF..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto">
            {isLoading && <div className="p-4 text-center text-xs text-slate-500">Buscando...</div>}
            {results?.map((s: any) => (
              <button
                key={s.id}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
                onClick={() => onPick(s)}
              >
                <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-100">
                  {s.photo_url ? <img src={s.photo_url} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 m-2 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-900">{s.full_name}</div>
                  <div className="text-[10px] text-slate-500">{s.email || s.phone || "Sem contato"}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
