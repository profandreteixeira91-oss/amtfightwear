# Módulo: Análise Individual do Atleta

Novo hub de performance acessado pela ficha do aluno em `/dojo/app/students/$id`, consolidando dados já existentes (cadastro, frequência, avaliações, graduações, competições, vídeos, agenda, financeiro) sem duplicação.

## Escopo desta entrega (Fase 1 — MVP funcional completo)

Vou entregar o módulo end-to-end com toda a UI, todos os cálculos e todos os gráficos usando **exclusivamente dados já existentes** no banco. Campos que hoje não existem em nenhuma tabela (ex.: composição corporal detalhada, notas por fundamento técnico, lesões, metas) serão exibidos como seções "vazias com CTA" — sem migração nova nesta fase, para não inflar schema antes de confirmarmos os fluxos de captura de dados.

## Arquitetura

### Rota e navegação
- Nova rota: `src/routes/dojo.app.students.$id.analysis.tsx`
- Botão **"Análise de Performance"** no topo da ficha do aluno (`dojo.app.students.$id.tsx`) abre a nova página
- Tabs internas: `Visão Geral · Frequência · Físico · Técnico · Graduações · Competições · Vídeos · Metas · Lesões · Comparar · Relatórios`

### Server functions (`src/lib/dojo/athlete-analysis.functions.ts`)
Uma função por consulta agregada, todas com `requireSupabaseAuth` + verificação de ownership do aluno:
- `getAthleteOverview({ studentId })` — dados do aluno + faixa + turmas + próximos eventos
- `getAthleteAttendance({ studentId, period })` — presenças/faltas por dia; retorna série temporal + heatmap + streaks
- `getAthletePerformanceScore({ studentId })` — score 0–100 calculado (ver algoritmo abaixo)
- `getAthleteEvolution({ studentId, metric, period })` — série temporal por métrica
- `getAthletePhysical({ studentId })` — histórico de `dojo_evaluations` (peso, altura, IMC já capturados)
- `getAthleteTechnical({ studentId })` — última avaliação técnica em formato radar
- `getAthleteGraduations({ studentId })` — timeline de `dojo_graduations` + previsão da próxima
- `getAthleteCompetitions({ studentId })` — usa RPC existente `get_student_competition_history`
- `getAthleteVideos({ studentId })` — vídeos vinculados ao aluno
- `getAthleteInsights({ studentId })` — insights heurísticos automáticos
- `compareAthletes({ studentIdA, studentIdB })` — dataset lado-a-lado

### Algoritmo do Score Geral (0–100)
Média ponderada de sub-scores (cada um 0–100):
- Frequência (30%): `presenças / esperado` nos últimos 90 dias
- Assiduidade/streak (10%): normaliza maior sequência ativa
- Avaliações técnicas (20%): média das notas mais recentes
- Evolução em graduações (15%): tempo na faixa vs. tempo médio esperado
- Competições (15%): `(ouro*5 + prata*3 + bronze*2 + vitórias) / (competições+1)`
- Participação em eventos/check-ins (10%): densidade nos últimos 30 dias

Classificação: ≥85 Excelente · ≥70 Muito bom · ≥55 Bom · ≥40 Regular · <40 Necessita atenção

### Insights automáticos (heurísticas, sem IA nesta fase)
Regras determinísticas em cima dos agregados:
- Queda de frequência (30/60/90d) vs. baseline pessoal
- Streak ativo em alta / risco de evasão (>21 dias sem check-in)
- Tempo na faixa dentro/fora da média da modalidade → sugestão de graduação
- Performance acima da média da turma
- Sem competições nos últimos 6 meses → sugerir participação

## UI

### Componentes reutilizados
- `PageShell`, `SectionCard`, `StatCard`, `BeltAuto`, shadcn `Tabs`, `Card`, `Table`, `Select`
- Já temos **recharts** no projeto (usar para Linha, Barras, Radar, Gauge via `RadialBarChart`)
- Heatmap: componente próprio simples (grid 53×7 com escala de cor via `bg-primary/[opacity]`)

### Novos componentes (`src/components/dojo/athlete-analysis/`)
- `PerformanceGauge.tsx` — velocímetro do score
- `AttendanceHeatmap.tsx` — heatmap anual estilo GitHub
- `EvolutionChart.tsx` — linha com filtros de período
- `TechnicalRadar.tsx` — radar chart
- `GraduationTimeline.tsx` — timeline vertical
- `InsightCard.tsx` — cartão de alerta/sugestão
- `CompareView.tsx` — layout duplo com radar + barras
- `AthleteReportButton.tsx` — export PDF (via `jsPDF` já instalado) e CSV

### Design
Segue design system do Dojo Manager: header com gradiente vermelho, tabs com ícones, cards `rounded-2xl`, responsivo, dark mode nativo.

## Relatórios
- **PDF**: renderiza a página em modo print via `jsPDF` + `html-to-image` (padrão já usado nos certificados)
- **CSV**: export nativo para tabelas de frequência, competições e avaliações

## Fora do escopo desta fase (marcados como "em breve" na UI)
- Captura de novos campos físicos (percentual de gordura, circunferências) — precisa migração dedicada
- Notas por fundamento técnico específico por modalidade — precisa migração
- Módulo de metas e lesões com CRUD completo — precisa migração
- Comparação lado a lado de vídeos com player sincronizado — Fase 2
- IA preditiva — Fase 2 (heurísticas atendem o requisito de "insights" agora)

Ao aprovar, entrego a Fase 1 completa. Se quiser incluir alguma das seções "Fora do escopo" já nesta rodada, me diga quais para eu incluir as migrações necessárias.
