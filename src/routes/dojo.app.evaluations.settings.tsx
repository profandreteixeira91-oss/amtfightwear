import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dojo/app/evaluations/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Configurações de avaliações</h2>
        <p className="text-sm text-muted-foreground">
          Preferências gerais do módulo.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Regras padrão</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Nota mínima:</strong> definida por modelo, no campo
            "Nota mínima para aprovação" do editor de modelos.
          </p>
          <p>
            <strong className="text-foreground">Integração com Graduação:</strong> ative "Graduar
            automaticamente ao aprovar" em cada modelo para criar um registro de graduação sempre
            que a avaliação for concluída como Aprovado. A faixa de destino do aluno é a "Faixa
            final" configurada no modelo.
          </p>
          <p>
            <strong className="text-foreground">Escala:</strong> selecione o método de avaliação por
            modelo (numérica, checklist, aprovado/reprovado, escala, rubrica ou conceito).
          </p>
          <p>
            <strong className="text-foreground">Integração com Vídeos:</strong> nas técnicas você pode
            vincular vídeos existentes do módulo Vídeos; o Plano de Evolução exibirá esses vídeos
            como recomendação após a avaliação.
          </p>
          <p>
            <strong className="text-foreground">Compartilhamento entre unidades:</strong> os modelos
            são compartilhados dentro da mesma academia (mesma conta administrativa).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
