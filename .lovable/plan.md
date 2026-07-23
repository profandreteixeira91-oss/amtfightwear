# Módulo Planos de Aula — AMT Dojo Manager

Novo módulo pedagógico dentro de **Ensino e Graduação**, cobrindo planejamento, biblioteca de conteúdos, banco de técnicas, histórico e analytics — integrado a Turmas, Faixas, Avaliações, Vídeos e Certificados.

Dado o tamanho (calendário drag-and-drop, biblioteca, banco de técnicas, templates, histórico, relatórios, dashboard analítico, inteligência pedagógica), proponho entregar em **4 fases**, cada uma utilizável de forma independente. Isso garante qualidade, evita um mega-PR arriscado e permite validar as decisões de UX antes de investir nas camadas mais complexas.

---

## Fase 1 — Fundação (base de dados + CRUD + calendário)

Objetivo: professor já consegue planejar aulas reais.

**Backend (migrations)**
- `dojo_lesson_plans` (título, modalidade, turma, professor, faixa, categoria, idade, local, data, hora início/fim, carga horária, status, cor, objetivos rich text, notas)
- `dojo_lesson_blocks` (aquecimento, alongamento, fundamentos, técnicas, exercícios, sparring, condicionamento, encerramento — como blocos ordenáveis JSONB)
- `dojo_lesson_content_library` (conteúdos reutilizáveis: nome, categoria, modalidade, descrição, mídia, tags, tempo, faixa, idade, nível)
- `dojo_techniques_bank` (técnicas por modalidade — Judô/BJJ/Karatê/MT/TKD, com seeds só de estrutura, sem popular contas)
- `dojo_lesson_history` (log automático de aulas ministradas: presença, notas, mídia)
- Todas com `owner_id`, `unit_id`, RLS por owner, GRANT authenticated/service_role, políticas de leitura/escrita.

**Rotas**
- `/dojo/app/lesson-plans` (dashboard + calendário)
- `/dojo/app/lesson-plans/library` (biblioteca de conteúdos)
- `/dojo/app/lesson-plans/techniques` (banco de técnicas)
- `/dojo/app/lesson-plans/$id` (editor de plano)

**UI Fase 1**
- Dashboard com cards: aulas planejadas na semana, realizadas, pendentes, horas planejadas/ministradas, turmas ativas, próxima aula.
- Calendário Dia/Semana/Mês/Ano (reaproveitando estilo do módulo Agenda).
- Editor de plano com blocos (aquecimento, fundamentos, técnicas principais, exercícios, sparring, condicionamento, encerramento), autosave, cores e status.
- Filtros: professor, modalidade, turma, unidade, faixa, período.

**Menu**
- Adiciona "Planos de Aula" ao grupo Rotina em `AppTopNav.tsx` e ao menu lateral do Dojo.

## Fase 2 — Biblioteca, técnicas e templates

- Biblioteca de conteúdos com upload de imagem/vídeo/PDF (bucket `ig-media`), tags e busca instantânea.
- Banco de técnicas por modalidade (Judô Nage/Katame/Shime/Kansetsu/Ukemi, BJJ passagens/raspagens/finalizações, Karatê Kihon/Kata/Kumite, Muay Thai chutes/joelhadas/cotoveladas/clinch, TKD Poomsae/chutes/defesas). Adicionar ao plano com 1 clique.
- Templates de aula (Infantil, Adulto, Competição, Exame, Iniciantes, Avançado, Feminino, Prep Física) + templates personalizados.
- Drag-and-drop entre blocos, duplicação de aula/semana/mês/semestre/ano com troca de turma/professor/data.

## Fase 3 — Integrações + histórico

- Registro de aula ministrada com presença (integra `dojo_attendance`), fotos/vídeos, observações.
- Controle de conteúdo aplicado: última aplicação, quantas vezes, sugestão automática.
- Integração com Turmas (planejamento futuro, últimas aulas, carga horária).
- Integração com Graduação: conteúdos obrigatórios por faixa, % concluído, aptidão para exame.
- Integração com Avaliações (vincular aula a exame/simulado/avaliação técnica).
- Integração com Biblioteca de Vídeos (`dojo_videos`) e Certificados (emissão ao concluir plano).

## Fase 4 — Analytics + inteligência pedagógica

- Dashboard analítico (recharts): planejamento x realizado, conteúdos/técnicas mais usados, horas por professor/modalidade, evolução mensal, distribuição por categoria, aproveitamento, % obrigatórios concluídos, frequência de reuso.
- Relatórios exportáveis (PDF/Excel/Word) por professor/turma/aluno/modalidade/faixa/período.
- Inteligência: recomendar conteúdos não ensinados, alertar técnica sem revisão, sugerir sequência lógica, detectar repetição, indicar turmas prontas para avaliação.

---

## Detalhes técnicos

- Server functions em `src/lib/dojo/lesson-plans.functions.ts` (CRUD, autosave, duplicação, sugestões) — `requireSupabaseAuth` + RLS por `owner_id`.
- Autosave via debounce + `useMutation` + `invalidateQueries`.
- Calendário reaproveita padrão de `dojo.app.schedule.tsx` (Google-Calendar-like).
- Blocos da aula como array JSONB ordenável — drag-and-drop com `@dnd-kit`.
- Uploads no bucket `ig-media` (já público).
- Nova conta continua **zerada** (memória do projeto): seeds só para catálogo estrutural do banco de técnicas por modalidade, opt-in pelo professor.
- Terminologia "Faixa/Grau/Dan" vem de `belt-terms` (memória do projeto).
- **Sem IA** (memória: proibida em Avaliações; aqui aplico o mesmo princípio às "sugestões" da Fase 4 — serão heurísticas determinísticas sobre o histórico, não LLM).

## Confirmações antes de começar

1. Posso entregar apenas a **Fase 1** neste turno e as demais em turnos seguintes? (Recomendado — evita PR gigante e alto risco.)
2. As "sugestões automáticas" da Fase 4 podem ser **heurísticas** (sem IA), coerente com a regra do módulo Avaliações?
