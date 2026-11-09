-- AMT Dojo Manager: faixas pré-definidas pelo sistema para todas as modalidades
-- do catálogo (Judô, Jiu-Jitsu, Karatê, Taekwondo, Boxe, Muay-Thai, MMA,
-- Kickboxing). As cinco primeiras já existiam; aqui entram Boxe, MMA e
-- Kickboxing. São faixas globais (owner_id nulo): cada academia vê e pode
-- personalizar no Belt Studio.
--
-- * Kickboxing: sequência mais usada no Brasil (WAKO/CBKB), preta com graus Dan.
-- * Boxe: a CBBoxe não tem graduação oficial; sequência de faixas como ponto
--   de partida para academias que graduam.
-- * MMA: sem sistema oficial; segue o modelo adulto do Jiu-Jitsu.
--
-- Idempotente: só insere o que ainda não existe (modalidade + nome + categoria).

insert into public.dojo_belts
  (owner_id, modality, category, name, color_hex, stripe_hex, sort_order, max_degrees, criteria_mode, visual, variants)
select null, v.modality, 'adult', v.name, v.color_hex, null, v.sort_order, v.max_degrees, 'time', '{}'::jsonb, '[]'::jsonb
from (values
  ('kickboxing', 'Branca',  '#F5F5F5', 1, 0),
  ('kickboxing', 'Amarela', '#FFD54F', 2, 0),
  ('kickboxing', 'Laranja', '#FB8C00', 3, 0),
  ('kickboxing', 'Verde',   '#2E7D32', 4, 0),
  ('kickboxing', 'Azul',    '#1E63C4', 5, 0),
  ('kickboxing', 'Marrom',  '#5D4037', 6, 0),
  ('kickboxing', 'Preta',   '#111111', 7, 10),

  ('boxe', 'Branca',  '#F5F5F5', 1, 0),
  ('boxe', 'Amarela', '#FFD54F', 2, 0),
  ('boxe', 'Laranja', '#FB8C00', 3, 0),
  ('boxe', 'Verde',   '#2E7D32', 4, 0),
  ('boxe', 'Azul',    '#1E63C4', 5, 0),
  ('boxe', 'Roxa',    '#6A1B9A', 6, 0),
  ('boxe', 'Marrom',  '#5D4037', 7, 0),
  ('boxe', 'Preta',   '#111111', 8, 0),

  ('mma', 'Branca', '#F5F5F5', 1, 4),
  ('mma', 'Azul',   '#1E63C4', 2, 4),
  ('mma', 'Roxa',   '#6A1B9A', 3, 4),
  ('mma', 'Marrom', '#5D4037', 4, 4),
  ('mma', 'Preta',  '#111111', 5, 6)
) as v(modality, name, color_hex, sort_order, max_degrees)
where not exists (
  select 1 from public.dojo_belts b
  where b.owner_id is null and b.modality = v.modality and b.category = 'adult' and b.name = v.name
);

-- A faixa Preta global do Jiu-Jitsu estava na categoria 'adulto' (as demais
-- usam 'adult'), o que a separava do resto da sequência.
update public.dojo_belts
   set category = 'adult'
 where owner_id is null and modality = 'jiu-jitsu' and category = 'adulto'
   and not exists (
     select 1 from public.dojo_belts b
     where b.owner_id is null and b.modality = 'jiu-jitsu' and b.category = 'adult' and b.name = 'Preta'
   );
