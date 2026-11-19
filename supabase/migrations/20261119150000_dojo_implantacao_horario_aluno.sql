-- Implantação assistida: horário do aluno nas observações.
--
-- Quando a turma tem mais de um horário, o dono pode escolher na implantação qual o
-- aluno faz (chave `class_times` do aluno no payload, ex.: "Kids → Seg/Qua 09:00–10:00").
-- O sistema liga o aluno à turma inteira (dojo_class_students não tem horário), então a
-- escolha é só informativa: dojo_apply_implementation a grava nas observações do aluno
-- novo, depois das observações da planilha. Sem `class_times`, nada muda.

CREATE OR REPLACE FUNCTION public.dojo_apply_implementation(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r public.dojo_implementation_requests%rowtype;
  p jsonb;
  v_owner uuid;
  a jsonb;
  it jsonb;
  sch jsonb;
  v_id uuid;
  v_student uuid;
  v_new boolean;
  v_plan_ids jsonb := '{}'::jsonb;
  v_class_ids jsonb := '{}'::jsonb;
  v_modalities text[];
  v_start_month date;
  v_due_default int;
  v_due int;
  v_next date;
  v_belt uuid;
  v_degree int;
  v_freq text;
  v_cls text;
  v_methods jsonb;
  n_plans int := 0; n_classes int := 0; n_team int := 0;
  n_students int := 0; n_students_existing int := 0; n_enrollments int := 0; n_class_links int := 0;
  v_result jsonb;
begin
  select * into r from public.dojo_implementation_requests where id = p_request_id for update;
  if not found then raise exception 'Pedido de implantação não encontrado.'; end if;
  if r.status not in ('enviada', 'em_implantacao', 'concluida') then
    raise exception 'Este pedido está como "%" e não pode ser aplicado.', r.status;
  end if;
  v_owner := r.owner_id;
  p := coalesce(r.payload, '{}'::jsonb);

  -- 1. Academia (só os campos preenchidos; o resto fica como está).
  a := coalesce(p->'academy', '{}'::jsonb);
  select coalesce(array_agg(x), '{}') into v_modalities
    from jsonb_array_elements_text(coalesce(a->'modalities', '[]'::jsonb)) x;
  insert into public.dojo_academy_profile as ap (owner_id, trade_name, legal_name, cnpj, whatsapp, phone, email, instagram,
                                           zip, address, address_number, address_complement, neighborhood, city, state,
                                           modalities, logo_url, responsible_name)
  values (v_owner, nullif(a->>'trade_name', ''), nullif(a->>'legal_name', ''), nullif(a->>'cnpj', ''),
          nullif(a->>'whatsapp', ''), nullif(a->>'whatsapp', ''), nullif(a->>'email', ''), nullif(a->>'instagram', ''),
          nullif(a->>'zip', ''), nullif(a->>'address', ''), nullif(a->>'address_number', ''), nullif(a->>'address_complement', ''),
          nullif(a->>'neighborhood', ''), nullif(a->>'city', ''), nullif(upper(a->>'state'), ''),
          v_modalities, nullif(a->>'logo_url', ''), nullif(a->>'responsible_name', ''))
  on conflict (owner_id) do update set
    trade_name = coalesce(excluded.trade_name, ap.trade_name),
    legal_name = coalesce(excluded.legal_name, ap.legal_name),
    cnpj = coalesce(excluded.cnpj, ap.cnpj),
    whatsapp = coalesce(excluded.whatsapp, ap.whatsapp),
    phone = coalesce(ap.phone, excluded.phone),
    email = coalesce(excluded.email, ap.email),
    instagram = coalesce(excluded.instagram, ap.instagram),
    zip = coalesce(excluded.zip, ap.zip),
    address = coalesce(excluded.address, ap.address),
    address_number = coalesce(excluded.address_number, ap.address_number),
    address_complement = coalesce(excluded.address_complement, ap.address_complement),
    neighborhood = coalesce(excluded.neighborhood, ap.neighborhood),
    city = coalesce(excluded.city, ap.city),
    state = coalesce(excluded.state, ap.state),
    modalities = case when cardinality(excluded.modalities) > 0 then excluded.modalities else ap.modalities end,
    logo_url = coalesce(excluded.logo_url, ap.logo_url),
    responsible_name = coalesce(excluded.responsible_name, ap.responsible_name);
  select coalesce(modalities, '{}') into v_modalities from public.dojo_academy_profile where owner_id = v_owner;

  -- 2. Planos (por nome).
  for it in select * from jsonb_array_elements(coalesce(p->'plans', '[]'::jsonb)) loop
    if coalesce(trim(it->>'name'), '') = '' then continue; end if;
    select coalesce(jsonb_agg(jsonb_build_object('code', m, 'enabled', true, 'gateway', 'manual')), '[]'::jsonb)
      into v_methods
      from jsonb_array_elements_text(coalesce(it->'payment_methods', '["cash","pix"]'::jsonb)) m
     where m in ('cash', 'pix', 'card_machine', 'payment_link');
    if jsonb_array_length(v_methods) = 0 then
      v_methods := '[{"code":"cash","enabled":true,"gateway":"manual"},{"code":"pix","enabled":true,"gateway":"manual"}]'::jsonb;
    end if;
    v_freq := coalesce(nullif(it->>'frequency', ''), 'monthly');
    if v_freq not in ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual') then v_freq := 'monthly'; end if;

    select id into v_id from public.dojo_plans
     where owner_id = v_owner and lower(trim(name)) = lower(trim(it->>'name')) order by created_at limit 1;
    if v_id is null then
      insert into public.dojo_plans (owner_id, name, amount, frequency, enrollment_fee, description, payment_methods, active, sort_order)
      values (v_owner, trim(it->>'name'), coalesce((it->>'amount')::numeric, 0), v_freq,
              coalesce((it->>'enrollment_fee')::numeric, 0), nullif(it->>'description', ''), v_methods, true, n_plans)
      returning id into v_id;
      n_plans := n_plans + 1;
    end if;
    v_plan_ids := v_plan_ids || jsonb_build_object(lower(trim(it->>'name')), v_id);
  end loop;

  -- 3. Turmas e horários (por nome; turma nova recebe a grade enviada).
  for it in select * from jsonb_array_elements(coalesce(p->'classes', '[]'::jsonb)) loop
    if coalesce(trim(it->>'name'), '') = '' then continue; end if;
    select id into v_id from public.dojo_classes
     where owner_id = v_owner and lower(trim(name)) = lower(trim(it->>'name')) and status = 'active' order by created_at limit 1;
    if v_id is null then
      insert into public.dojo_classes (owner_id, name, modality, level, teacher_name, max_students, status)
      values (v_owner, trim(it->>'name'),
              coalesce(nullif(it->>'modality', ''), v_modalities[1], 'jiu-jitsu'),
              coalesce(nullif(it->>'level', ''), 'todos'),
              nullif(it->>'teacher_name', ''),
              coalesce(nullif(it->>'max_students', '')::int, 30), 'active')
      returning id into v_id;
      for sch in select * from jsonb_array_elements(coalesce(it->'schedules', '[]'::jsonb)) loop
        insert into public.dojo_class_schedules (owner_id, class_id, weekday, start_time, end_time)
        values (v_owner, v_id, (sch->>'weekday')::smallint, (sch->>'start_time')::time, (sch->>'end_time')::time);
      end loop;
      n_classes := n_classes + 1;
    end if;
    v_class_ids := v_class_ids || jsonb_build_object(lower(trim(it->>'name')), v_id);
  end loop;

  -- 4. Equipe (cadastro sem login; o dono cria os acessos em Usuários do Sistema).
  for it in select * from jsonb_array_elements(coalesce(p->'team', '[]'::jsonb)) loop
    if coalesce(trim(it->>'full_name'), '') = '' then continue; end if;
    if exists (select 1 from public.dojo_team_members
                where owner_id = v_owner
                  and (lower(trim(full_name)) = lower(trim(it->>'full_name'))
                       or (nullif(it->>'email', '') is not null and lower(email) = lower(it->>'email')))) then
      continue;
    end if;
    insert into public.dojo_team_members (owner_id, full_name, email, phone, whatsapp, role, modalities, status)
    values (v_owner, trim(it->>'full_name'), nullif(lower(it->>'email'), ''), nullif(it->>'phone', ''), nullif(it->>'phone', ''),
            case when it->>'role' in ('teacher', 'instructor', 'assistant', 'receptionist', 'finance', 'admin', 'manager', 'other')
                 then it->>'role' else 'teacher' end,
            coalesce(it->'modalities', '[]'::jsonb), 'active');
    n_team := n_team + 1;
  end loop;

  -- 5. Alunos, matrícula no plano e vínculo com turmas.
  v_due_default := least(greatest(coalesce(nullif(p->'billing'->>'due_day_default', '')::int, 10), 1), 28);
  v_start_month := coalesce(
    to_date(nullif(p->'billing'->>'start_month', ''), 'YYYY-MM'),
    (date_trunc('month', (now() at time zone 'America/Sao_Paulo')) + interval '1 month')::date);

  for it in select * from jsonb_array_elements(coalesce(p->'students', '[]'::jsonb)) loop
    if coalesce(trim(it->>'full_name'), '') = '' then continue; end if;
    v_student := null; v_new := false;
    if nullif(regexp_replace(coalesce(it->>'cpf', ''), '\D', '', 'g'), '') is not null then
      select id into v_student from public.dojo_students
       where owner_id = v_owner
         and regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = regexp_replace(it->>'cpf', '\D', '', 'g')
       limit 1;
    end if;
    if v_student is null then
      select id into v_student from public.dojo_students
       where owner_id = v_owner and lower(trim(full_name)) = lower(trim(it->>'full_name')) limit 1;
    end if;

    if v_student is null then
      -- Faixa pelo nome: modalidade do aluno (se informada), depois a ordem das
      -- modalidades da academia; faixa própria antes da padrão.
      v_belt := null;
      if nullif(trim(it->>'belt'), '') is not null then
        select b.id into v_belt from public.dojo_belts b
         where (b.owner_id = v_owner or b.owner_id is null)
           and lower(trim(b.name)) = lower(trim(it->>'belt'))
           and (cardinality(v_modalities) = 0 or b.modality = any (v_modalities)
                or b.modality = nullif(it->>'modality', ''))
         order by (nullif(it->>'modality', '') is not null and b.modality is distinct from it->>'modality'),
                  coalesce(array_position(v_modalities, b.modality), 999),
                  (b.owner_id is null), (b.category <> 'adult'), b.sort_order
         limit 1;
      end if;
      -- Grau limitado ao que a faixa permite (max_degrees), entre 0 e 10.
      v_degree := 0;
      if v_belt is not null then
        select least(greatest(coalesce(nullif(it->>'degree', '')::int, 0), 0), coalesce(b.max_degrees, 10), 10)
          into v_degree from public.dojo_belts b where b.id = v_belt;
      end if;

      insert into public.dojo_students (owner_id, full_name, cpf, rg, birth_date, gender, email, phone, zip, street,
        address_number, neighborhood, city, state, guardian_name, guardian_phone, emergency_contact_name,
        emergency_contact_phone, emergency_contact_relationship, blood_type, profession, notes, status,
        current_belt_id, current_degree)
      values (v_owner, trim(it->>'full_name'), nullif(it->>'cpf', ''), nullif(it->>'rg', ''),
        nullif(it->>'birth_date', '')::date, nullif(it->>'gender', ''), nullif(lower(it->>'email'), ''),
        nullif(it->>'phone', ''), nullif(it->>'zip', ''), nullif(it->>'street', ''), nullif(it->>'address_number', ''),
        nullif(it->>'neighborhood', ''), nullif(it->>'city', ''), nullif(upper(it->>'state'), ''),
        nullif(it->>'guardian_name', ''), nullif(it->>'guardian_phone', ''), nullif(it->>'emergency_contact_name', ''),
        nullif(it->>'emergency_contact_phone', ''), nullif(it->>'emergency_contact_relationship', ''),
        nullif(it->>'blood_type', ''), nullif(it->>'profession', ''),
        -- Observações da planilha + horário escolhido na implantação (o sistema liga o
        -- aluno à turma inteira; o horário fica só como informação).
        nullif(concat_ws(E'\n', nullif(trim(it->>'notes'), ''),
          'Horário: ' || nullif(trim(it->>'class_times'), '')), ''),
        case when it->>'status' in ('inactive', 'frozen') then it->>'status' else 'active' end,
        v_belt, v_degree)
      returning id into v_student;
      -- As telas leem a faixa do histórico (dojo_graduations), como no cadastro e na
      -- matrícula online: a faixa da planilha vira a graduação inicial, já aplicada.
      if v_belt is not null then
        insert into public.dojo_graduations (owner_id, student_id, belt_id, degree, graduation_date, applied_at, notes)
        values (v_owner, v_student, v_belt, v_degree, (now() at time zone 'America/Sao_Paulo')::date, now(),
                'Faixa informada na implantação assistida AMT');
      end if;
      v_new := true;
      n_students := n_students + 1;
    else
      n_students_existing := n_students_existing + 1;
    end if;

    -- Matrícula: só para aluno ativo, plano conhecido e sem matrícula ativa nesse plano.
    v_id := (v_plan_ids ->> lower(trim(coalesce(it->>'plan', ''))))::uuid;
    if v_id is not null
       and exists (select 1 from public.dojo_students s where s.id = v_student and s.status = 'active')
       and not exists (select 1 from public.dojo_enrollments e
                        where e.student_id = v_student and e.plan_id = v_id and e.status = 'active') then
      v_due := least(greatest(coalesce(nullif(it->>'due_day', '')::int, v_due_default), 1), 28);
      v_next := make_date(extract(year from v_start_month)::int, extract(month from v_start_month)::int, v_due);
      select frequency into v_freq from public.dojo_plans where id = v_id;
      insert into public.dojo_enrollments (owner_id, student_id, plan_id, due_day, start_date, status, frequency, next_run_at, notes)
      values (v_owner, v_student, v_id, v_due, v_start_month, 'active',
              case when v_freq in ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual') then v_freq else 'monthly' end,
              v_next, 'Implantação assistida AMT');
      n_enrollments := n_enrollments + 1;
    end if;

    -- Turmas: nomes separados por ";" ou ",".
    for v_cls in select trim(x) from regexp_split_to_table(coalesce(it->>'classes', ''), '[;,]') x where trim(x) <> '' loop
      v_id := (v_class_ids ->> lower(v_cls))::uuid;
      if v_id is null then
        select id into v_id from public.dojo_classes
         where owner_id = v_owner and lower(trim(name)) = lower(v_cls) and status = 'active' limit 1;
      end if;
      if v_id is not null and not exists (select 1 from public.dojo_class_students
                                           where class_id = v_id and student_id = v_student) then
        insert into public.dojo_class_students (owner_id, class_id, student_id, status)
        values (v_owner, v_id, v_student, 'active');
        n_class_links := n_class_links + 1;
      end if;
    end loop;
  end loop;

  -- 6. Assistente de primeiros passos dá lugar à implantação concluída.
  insert into public.dojo_setup_progress (owner_id, step, status)
  values (v_owner, 4, 'completed')
  on conflict (owner_id) do update set step = 4, status = 'completed', updated_at = now();

  -- 7. Teste grátis recomeça na conclusão (se o dono pediu).
  if r.trial_after_implementation then
    update public.dojo_subscriptions
       set trial_ends_at = now() + interval '14 days'
     where owner_id = v_owner and status = 'trialing';
  end if;

  v_result := jsonb_build_object(
    'applied_at', now(),
    'plans_created', n_plans, 'classes_created', n_classes, 'team_created', n_team,
    'students_created', n_students, 'students_existing', n_students_existing,
    'enrollments_created', n_enrollments, 'class_links_created', n_class_links,
    'billing_start', v_start_month,
    'trial_restarted', r.trial_after_implementation);

  update public.dojo_implementation_requests
     set status = 'concluida', completed_at = now(), started_at = coalesce(started_at, now()), result = v_result
   where id = r.id;

  return v_result;
end
$function$;

revoke all on function public.dojo_apply_implementation(uuid) from public, anon, authenticated;
grant execute on function public.dojo_apply_implementation(uuid) to service_role;
