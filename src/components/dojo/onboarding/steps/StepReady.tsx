import { Link } from "@tanstack/react-router";
import { CheckCircle2, QrCode, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SetupState } from "@/lib/dojo/setup.functions";

export function StepReady({ state }: { state: SetupState }) {
  return <div className="space-y-6">
    <CheckCircle2 className="h-10 w-10 text-primary" />
    <dl className="grid grid-cols-3 gap-3 text-center">{[["Alunos", state.students], ["Planos", state.plans.length], ["Turmas", state.classes.length]].map(([label, value]) => <div key={label} className="rounded-md bg-muted p-3"><dd className="text-2xl font-semibold">{value}</dd><dt className="text-xs text-muted-foreground">{label}</dt></div>)}</dl>
    <div className="flex flex-col gap-3"><Button asChild variant="outline"><Link to="/dojo/app/checkin"><QrCode />Check-in e QR Code</Link></Button><Button asChild variant="outline"><Link to="/dojo/app/student-app-qr"><Smartphone />Aplicativo do aluno</Link></Button></div>
  </div>;
}