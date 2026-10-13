create or replace function public.activate_subscription(p_student uuid, p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  plan public.subscription_plans%rowtype;
  existing public.subscriptions%rowtype;
  sub_id uuid;
begin
  select * into plan from public.subscription_plans where id = p_plan_id;
  if not found then
    raise exception 'plan not found';
  end if;

  select * into existing
  from public.subscriptions
  where student_id = p_student
    and course_id = plan.course_id
    and status = 'active'
    and (ends_at is null or ends_at > now())
    and (
      (plan.module_id is null and module_id is null and term_id is not distinct from plan.term_id)
      or module_id is not distinct from plan.module_id
    )
  order by created_at desc
  limit 1;

  if existing.id is not null then
    update public.subscriptions
    set plan_id = plan.id,
        module_id = plan.module_id,
        term_id = plan.term_id,
        ends_at = null
    where id = existing.id;
    return existing.id;
  end if;

  insert into public.subscriptions (student_id, course_id, plan_id, module_id, term_id, status, starts_at, ends_at)
  values (p_student, plan.course_id, plan.id, plan.module_id, plan.term_id, 'active', now(), null)
  returning id into sub_id;

  return sub_id;
end;
$$;

update public.subscriptions
set ends_at = null
where status = 'active';

update public.subscription_plans
set duration_days = null;

create or replace function public.get_assignment_for_student(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'assignment', to_jsonb(a) - 'created_at',
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', qs.id,
          'question_text', qs.question_text,
          'question_type', qs.question_type,
          'points', qs.points,
          'order_index', qs.order_index,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', o.id,
                'option_text', o.option_text,
                'order_index', o.order_index
              )
              order by o.order_index
            )
            from public.question_options o
            where o.question_id = qs.id
          ), '[]'::jsonb)
        )
        order by qs.order_index
      )
      from public.questions qs
      where qs.assignment_id = a.id
    ), '[]'::jsonb)
  )
  into result
  from public.assignments a
  where a.id = p_assignment_id
    and a.is_published = true;

  return coalesce(result, jsonb_build_object('assignment', null, 'questions', '[]'::jsonb));
end;
$$;

create or replace function public.import_assignment_questions(p_assignment_id uuid, p_payload jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  question_id uuid;
  option_item jsonb;
  inserted int := 0;
  idx int := 0;
  q_type text;
  q_text text;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;

  if not exists (select 1 from public.assignments where id = p_assignment_id) then
    raise exception 'assignment not found';
  end if;

  if jsonb_typeof(p_payload) = 'string' then
    p_payload := (p_payload #>> '{}')::jsonb;
  end if;

  if jsonb_typeof(p_payload) = 'object' then
    p_payload := coalesce(p_payload -> 'questions', p_payload);
  end if;

  if jsonb_typeof(p_payload) <> 'array' then
    raise exception 'payload must be a questions array';
  end if;

  for item in select * from jsonb_array_elements(p_payload)
  loop
    q_text := coalesce(item ->> 'question_text', item ->> 'question', item ->> 'text');
    if coalesce(q_text, '') = '' then
      continue;
    end if;

    q_type := coalesce(item ->> 'question_type', item ->> 'type', 'multiple_choice');
    if q_type not in ('multiple_choice', 'true_false', 'code_output') then
      q_type := 'multiple_choice';
    end if;

    insert into public.questions (assignment_id, question_text, question_type, points, order_index, explanation)
    values (
      p_assignment_id,
      q_text,
      q_type,
      coalesce((item ->> 'points')::int, 1),
      coalesce((item ->> 'order_index')::int, idx),
      item ->> 'explanation'
    )
    returning id into question_id;

    idx := idx + 1;
    inserted := inserted + 1;

    if item ? 'options' and jsonb_typeof(item -> 'options') = 'array' then
      for option_item in select * from jsonb_array_elements(item -> 'options')
      loop
        insert into public.question_options (question_id, option_text, is_correct, order_index)
        values (
          question_id,
          coalesce(option_item ->> 'option_text', option_item ->> 'text'),
          coalesce((option_item ->> 'is_correct')::boolean, false),
          coalesce((option_item ->> 'order_index')::int, 0)
        );
      end loop;
    elsif q_type = 'true_false' then
      insert into public.question_options (question_id, option_text, is_correct, order_index)
      values
        (question_id, 'صح', true, 0),
        (question_id, 'غلط', false, 1);
    end if;
  end loop;

  return inserted;
end;
$$;

grant execute on function public.activate_subscription(uuid, uuid) to authenticated;
grant execute on function public.get_assignment_for_student(uuid) to authenticated;
grant execute on function public.submit_assignment(uuid, jsonb) to authenticated;
grant execute on function public.import_assignment_questions(uuid, jsonb) to authenticated;
grant execute on function public.lesson_unlocked(uuid, uuid) to authenticated;
grant execute on function public.has_course_entitlement(uuid, uuid, uuid) to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;
