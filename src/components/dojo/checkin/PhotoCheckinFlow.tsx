import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Check, X, AlertTriangle, UserPlus, HelpCircle, RefreshCw, Loader2, Users, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";
import { listClasses } from "@/lib/dojo/schedule.functions";
import { listLessonPlans } from "@/lib/dojo/lesson-plans.functions";
import { startFaceRecognition, confirmSmartCheckins } from "@/lib/dojo/face-recognition.functions";
import { searchStudents } from "@/lib/dojo/checkin.functions";
import { supabase } from "@/integrations/supabase/client";

interface PhotoCheckinFlowProps {
  onComplete: () => void;
  onCancel: () => void;
  unitId?: string;
}

export function PhotoCheckinFlow({ onComplete, onCancel, unitId: initialUnitId }: PhotoCheckinFlowProps) {
  const [step, setStep] = useState<"setup" | "upload" | "processing" | "validation" | "summary">("setup");
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnitId || "");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [classPhotoId, setClassPhotoId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const qc = useQueryClient();
  const unitsFn = useServerFn(listDojoUnits);
  const startRecognition = useServerFn(startFaceRecognition);
  const confirmCheckins = useServerFn(confirmSmartCheckins);
  
  const { data: units } = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });
  const { data: classes } = useQuery({ 
    queryKey: ["dojo-classes"], 
    queryFn: () => listClasses(),
  });
  const { data: lessons } = useQuery({ 
    queryKey: ["dojo-lessons", selectedClassId], 
    queryFn: () => listLessonPlans({ data: { classId: selectedClassId } }),
    enabled: !!selectedClassId 
  });

  // Filter classes by selected unit
  const filteredClasses = classes?.filter((c: any) => !selectedUnitId || c.unit_id === selectedUnitId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep("processing");
    processPhoto(f);
  }

  async function processPhoto(f: File) {
    setIsProcessing(true);
    setProcessingProgress(10);
    try {
      // 1. Upload to Supabase Storage
      const ext = f.name.split('.').pop();
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

      // 2. Start recognition
      const res = await startRecognition({ 
        data: { 
          photoUrl: publicUrl, 
          classId: selectedClassId, 
          unitId: selectedUnitId,
          lessonHistoryId: selectedLessonId || null
        } 
      });

      setClassPhotoId(res.classPhotoId);
      setResults(res.faces.map((f: any) => ({
        ...f,
        status: f.studentId && f.confidence >= res.minConfidence ? "confirmed" : "pending"
      })));
      
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
        .filter(r => r.status === "confirmed")
        .map(r => ({
          studentId: r.studentId,
          status: "confirmed" as const
        }));
        
      await confirmCheckins({ data: { classPhotoId, confirms } });
      toast.success(`${confirms.length} check-ins realizados com sucesso!`);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Erro ao confirmar check-ins");
    }
  }

  return (
    <div className="space-y-6">
      {step === "setup" && (
        <Card className="border-red-500/10 bg-neutral-900/40 backdrop-blur-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1 text-center">
              <h3 className="text-lg font-bold text-white">Check-in por Foto</h3>
              <p className="text-sm text-neutral-400">Selecione a turma e a aula para começar</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Unidade</label>
                <select 
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:ring-2 focus:ring-red-500/50"
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {units?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Turma</label>
                <select 
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:ring-2 focus:ring-red-500/50"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={!selectedUnitId}
                >
                  <option value="">Selecione...</option>
                  {filteredClasses?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Aula (Opcional)</label>
              <select 
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:ring-2 focus:ring-red-500/50"
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                disabled={!selectedClassId}
              >
                <option value="">Selecione a aula...</option>
                {lessons?.map((l: any) => <option key={l.id} value={l.id}>{new Date(l.date).toLocaleDateString()} - {l.title}</option>)}
              </select>
            </div>

            <div className="grid gap-3 pt-4 sm:grid-cols-2">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedClassId}
                className="h-24 flex-col gap-2 border-red-500/20 bg-white/5 hover:bg-white/10 text-white"
              >
                <Camera className="h-6 w-6 text-red-400" />
                Tirar Foto
              </Button>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedClassId}
                className="h-24 flex-col gap-2 border-red-500/20 bg-white/5 hover:bg-white/10 text-white"
              >
                <Upload className="h-6 w-6 text-red-400" />
                Enviar Foto
              </Button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload} 
                capture="environment"
              />
            </div>
            
            <Button variant="ghost" className="w-full text-neutral-500" onClick={onCancel}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "processing" && (
        <Card className="border-red-500/10 bg-neutral-900/40 backdrop-blur-sm py-12">
          <CardContent className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
                <RefreshCw className="h-10 w-10 animate-spin text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Processando Imagem</h3>
              <p className="text-sm text-neutral-400">Detectando rostos e comparando com a base de alunos...</p>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Progress value={processingProgress} className="h-2 bg-white/10" />
              <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">{processingProgress}% Concluído</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "validation" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden border-white/10 bg-black/40">
              <div className="relative aspect-video w-full overflow-hidden bg-neutral-800">
                <img src={photoUrl} className="h-full w-full object-contain" alt="Aula" />
                {/* Visual indicator for faces could go here with absolute positioning based on box_json */}
                {results.map((r, i) => (
                  <div 
                    key={i}
                    className="absolute border-2 transition-all"
                    style={{
                      left: `${r.box.x}%`,
                      top: `${r.box.y}%`,
                      width: `${r.box.w}%`,
                      height: `${r.box.h}%`,
                      borderColor: r.studentId ? (r.confidence > 0.9 ? "#22c55e" : "#eab308") : "#ef4444"
                    }}
                  />
                ))}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-400">Rostos encontrados: {results.length}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      {results.filter(r => r.studentId).length} Identificados
                    </Badge>
                    <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400">
                      {results.filter(r => !r.studentId).length} Desconhecidos
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Resultados da Identificação</h3>
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
            <Button variant="outline" className="flex-1 border-white/10 bg-white/5 text-white" onClick={() => setStep("setup")}>
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

function FaceResultCard({ face, onUpdate }: { face: any; onUpdate: (f: any) => void }) {
  const [showSearch, setShowSearch] = useState(false);
  const isHighConfidence = face.confidence >= 0.9;
  const isUnknown = !face.studentId;
  const isPending = face.status === "pending";

  return (
    <Card className={`overflow-hidden border-white/5 bg-neutral-900/40 transition-all ${isUnknown ? 'ring-1 ring-red-500/30' : !isHighConfidence ? 'ring-1 ring-amber-500/30' : ''}`}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-800 ring-1 ring-white/10">
          {face.photo_url ? (
            <img src={face.photo_url} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Users className="h-5 w-5 text-neutral-600" />
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-white">
              {face.name || "Pessoa Desconhecida"}
            </span>
            {isHighConfidence && face.studentId && <Check className="h-3.5 w-3.5 text-emerald-400" />}
            {!isHighConfidence && face.studentId && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="font-medium text-neutral-500 uppercase">Confiança:</span>
            <span className={`font-bold ${isHighConfidence ? 'text-emerald-400' : 'text-amber-400'}`}>
              {Math.round(face.confidence * 100)}%
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {face.status === "confirmed" ? (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400" onClick={() => onUpdate({...face, status: "pending"})}>
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-500 hover:text-white" onClick={() => onUpdate({...face, status: "confirmed"})}>
              <Check className="h-4 w-4" />
            </Button>
          )}
          
          <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-500 hover:text-white" onClick={() => setShowSearch(true)}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-500 hover:text-red-400" onClick={() => onUpdate({...face, status: "ignored"})}>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-white/10 bg-neutral-900 shadow-2xl">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Vincular Aluno</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input 
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 pl-10 text-white outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Buscar por nome ou CPF..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto">
            {isLoading && <div className="p-4 text-center text-xs text-neutral-500">Buscando...</div>}
            {results?.map((s: any) => (
              <button 
                key={s.id}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5"
                onClick={() => onPick(s)}
              >
                <div className="h-8 w-8 overflow-hidden rounded-full bg-neutral-800">
                  {s.photo_url ? <img src={s.photo_url} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 m-2 text-neutral-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{s.full_name}</div>
                  <div className="text-[10px] text-neutral-500">{s.email || s.phone || "Sem contato"}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
