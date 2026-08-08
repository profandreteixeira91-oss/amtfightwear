import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dojo/app/evaluations/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Configurações de avaliações</h2>
        <p className="text-sm text-neutral-500 font-medium">
          Preferências gerais do módulo.
        </p>
      </div>

      <Card className="border-neutral-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100"><CardTitle className="text-base font-black uppercase tracking-tight text-neutral-900">Regras padrão</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600 font-medium space-y-4 p-6">
          <p>
            <strong className="text-neutral-900">Nota mínima:</strong> definida por modelo, no campo
            "Nota mínima para aprovação" do editor de modelos.
          </p>
          <p>
            <strong className="text-neutral-900">Integração com Graduação:</strong> ative "Graduar
            automaticamente ao aprovar" em cada modelo para criar um registro de graduação sempre
            que a avaliação for concluída como Aprovado. A faixa de destino do aluno é a "Faixa
            final" configurada no modelo.
          </p>
          <p>
            <strong className="text-neutral-900">Escala:</strong> selecione o método de avaliação por
            modelo (numérica, checklist, aprovado/reprovado, escala, rubrica ou conceito).
          </p>
          <p>
            <strong className="text-neutral-900">Integração com Vídeos:</strong> nas técnicas você pode
            vincular vídeos existentes do módulo Vídeos; o Plano de Evolução exibirá esses vídeos
            como recomendação após a avaliação.
          </p>
          <p>
            <strong className="text-neutral-900">Compartilhamento entre unidades:</strong> os modelos
            são compartilhados dentro da mesma academia (mesma conta administrativa).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
