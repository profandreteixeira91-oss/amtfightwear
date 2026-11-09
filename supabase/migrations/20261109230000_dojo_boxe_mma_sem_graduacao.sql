-- AMT Dojo Manager: Boxe e MMA não têm graduação.
--
-- Remove as faixas globais (owner_id nulo) dessas modalidades criadas em
-- 20261109220000_dojo_faixas_padrao_boxe_mma_kickboxing. As modalidades
-- continuam no catálogo (cadastro, turmas, agenda), só sem faixas.
-- Faixas próprias de alguma academia (owner_id preenchido) não são tocadas, e
-- uma faixa global já usada em graduação ou aluno também fica.

delete from public.dojo_belts b
where b.owner_id is null
  and b.modality in ('boxe', 'mma')
  and not exists (select 1 from public.dojo_graduations g where g.belt_id = b.id)
  and not exists (select 1 from public.dojo_students s where s.current_belt_id = b.id);
