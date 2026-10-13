alter table public.course_modules
  add column if not exists price numeric not null default 0;

alter table public.lessons
  add column if not exists available_at timestamptz;

create table if not exists public.course_terms (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  price numeric not null default 0,
  order_index int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_modules
  add column if not exists term_id uuid references public.course_terms (id) on delete cascade;

alter table public.subscription_plans
  add column if not exists term_id uuid references public.course_terms (id) on delete set null;

alter table public.subscriptions
  add column if not exists term_id uuid references public.course_terms (id) on delete set null;

create index if not exists course_terms_course_idx on public.course_terms (course_id, order_index);
create index if not exists modules_term_idx on public.course_modules (term_id, order_index);

alter table public.course_terms enable row level security;

drop policy if exists staff_all_course_terms on public.course_terms;
create policy staff_all_course_terms
  on public.course_terms for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists terms_public_read on public.course_terms;
create policy terms_public_read on public.course_terms
  for select using (is_published = true or public.is_staff());

drop trigger if exists terms_updated_at on public.course_terms;
create trigger terms_updated_at
  before update on public.course_terms
  for each row execute function public.set_updated_at();

insert into public.course_terms (id, course_id, title, description, image_url, price, order_index, is_published)
select
  gen_random_uuid(),
  c.id,
  'الترم الأول',
  coalesce(c.description, 'محتوى الترم الأول'),
  c.image_url,
  coalesce((
    select min(p.price) from public.subscription_plans p
    where p.course_id = c.id and p.type = 'full_term'
  ), 400),
  0,
  c.status = 'published'
from public.courses c
where not exists (select 1 from public.course_terms t where t.course_id = c.id);

update public.course_modules m
set term_id = t.id
from public.course_terms t
where t.course_id = m.course_id
  and m.term_id is null;

update public.course_modules m
set price = coalesce(nullif(m.price, 0), (
  select p.price from public.subscription_plans p
  where p.module_id = m.id and p.type = 'monthly'
  limit 1
), 150)
where coalesce(m.price, 0) = 0;

update public.subscription_plans p
set term_id = t.id
from public.course_terms t
where t.course_id = p.course_id
  and p.type = 'full_term'
  and p.term_id is null;

update public.lessons
set available_at = now()
where available_at is null
  and is_published = true
  and order_index = 0;

create or replace function public.previous_lesson_id(p_lesson uuid)
returns uuid
language sql
stable
as $$
  select prev.id
  from public.lessons current
  join public.lessons prev
    on prev.module_id = current.module_id
   and prev.order_index < current.order_index
  where current.id = p_lesson
  order by prev.order_index desc
  limit 1;
$$;

create or replace function public.has_course_entitlement(p_student uuid, p_course uuid, p_module uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.course_modules m on m.id = p_module
    where s.student_id = p_student
      and s.course_id = p_course
      and s.status = 'active'
      and (s.ends_at is null or s.ends_at > now())
      and (
        (s.module_id is null and (s.term_id is null or s.term_id = m.term_id))
        or s.module_id = p_module
      )
  );
$$;

create or replace function public.lesson_unlocked(p_student uuid, p_lesson uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_lesson public.lessons%rowtype;
  prev uuid;
  prev_assignment public.assignments%rowtype;
  prev_progress public.lesson_progress%rowtype;
begin
  select * into current_lesson from public.lessons where id = p_lesson;
  if not found then
    return false;
  end if;

  if current_lesson.available_at is not null and current_lesson.available_at > now() then
    return false;
  end if;

  prev := public.previous_lesson_id(p_lesson);

  if prev is null then
    return true;
  end if;

  if current_lesson.available_at is null then
    return false;
  end if;

  select * into prev_assignment from public.assignments where lesson_id = prev and is_published = true;
  select * into prev_progress from public.lesson_progress where student_id = p_student and lesson_id = prev;

  if prev_assignment.id is not null and prev_assignment.is_required then
    return coalesce(prev_progress.assignment_completed, false);
  end if;

  return coalesce(prev_progress.lesson_completed, false);
end;
$$;

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

create or replace function public.notify_students(p_title text, p_body text, p_user_id uuid default null, p_grade text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int := 0;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;

  if p_user_id is not null then
    insert into public.notifications (user_id, title, body)
    values (p_user_id, p_title, p_body);
    return 1;
  end if;

  insert into public.notifications (user_id, title, body)
  select p.id, p_title, p_body
  from public.profiles p
  where p.role = 'student'
    and (p_grade is null or p_grade = '' or p.grade = p_grade);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

grant execute on function public.notify_students(text, text, uuid, text) to authenticated;

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
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;

  if jsonb_typeof(p_payload) = 'object' then
    p_payload := coalesce(p_payload -> 'questions', p_payload);
  end if;

  for item in select * from jsonb_array_elements(p_payload)
  loop
    insert into public.questions (assignment_id, question_text, question_type, points, order_index, explanation)
    values (
      p_assignment_id,
      coalesce(item ->> 'question_text', item ->> 'question'),
      coalesce(item ->> 'question_type', 'multiple_choice'),
      coalesce((item ->> 'points')::int, 1),
      coalesce((item ->> 'order_index')::int, idx),
      item ->> 'explanation'
    )
    returning id into question_id;

    idx := idx + 1;
    inserted := inserted + 1;

    if item ? 'options' then
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
    end if;
  end loop;

  return inserted;
end;
$$;

grant execute on function public.import_assignment_questions(uuid, jsonb) to authenticated;

create or replace function public.submit_assignment(p_assignment_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.assignments%rowtype;
  attempt_no int;
  total numeric := 0;
  earned numeric := 0;
  attempt_id uuid;
  question record;
  selected uuid;
  typed text;
  correct boolean;
  option_ok boolean;
  awarded numeric;
begin
  select * into assignment from public.assignments where id = p_assignment_id and is_published = true;
  if not found then
    raise exception 'assignment not found';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into attempt_no
  from public.assignment_attempts
  where assignment_id = p_assignment_id and student_id = auth.uid();

  if assignment.max_attempts is not null and attempt_no > assignment.max_attempts then
    raise exception 'max attempts reached';
  end if;

  insert into public.assignment_attempts (assignment_id, student_id, attempt_number)
  values (p_assignment_id, auth.uid(), attempt_no)
  returning id into attempt_id;

  for question in
    select * from public.questions where assignment_id = p_assignment_id order by order_index
  loop
    total := total + question.points;
    selected := nullif(p_answers -> question.id::text ->> 'option_id', '')::uuid;
    typed := p_answers -> question.id::text ->> 'text';
    correct := false;
    awarded := 0;

    if question.question_type in ('multiple_choice', 'true_false') then
      select o.is_correct into option_ok from public.question_options o where o.id = selected;
      correct := coalesce(option_ok, false);
    elsif question.question_type = 'code_output' then
      select o.is_correct into option_ok
      from public.question_options o
      where o.question_id = question.id
        and lower(trim(o.option_text)) = lower(trim(coalesce(typed, '')))
      limit 1;
      correct := coalesce(option_ok, false);
    end if;

    if correct then
      awarded := question.points;
      earned := earned + awarded;
    end if;

    insert into public.assignment_answers (
      attempt_id, question_id, selected_option_id, answer_text, is_correct, points_awarded
    ) values (
      attempt_id, question.id, selected, typed, correct, awarded
    );
  end loop;

  update public.assignment_attempts
  set score = earned,
      total_points = total,
      percentage = case when total = 0 then 0 else round((earned / total) * 100, 2) end,
      passed = case
        when assignment.passing_score is null then true
        else (case when total = 0 then 0 else (earned / total) * 100 end) >= assignment.passing_score
      end
  where id = attempt_id;

  if assignment.is_required and (
    assignment.passing_score is null
    or (case when total = 0 then 0 else (earned / total) * 100 end) >= assignment.passing_score
  ) then
    insert into public.lesson_progress (student_id, lesson_id, assignment_completed, lesson_completed, completed_at)
    values (auth.uid(), assignment.lesson_id, true, true, now())
    on conflict (student_id, lesson_id) do update
      set assignment_completed = true,
          lesson_completed = true,
          completed_at = coalesce(public.lesson_progress.completed_at, now()),
          updated_at = now();
  end if;

  return (
    select jsonb_build_object(
      'attempt', to_jsonb(a),
      'answers', coalesce((
        select jsonb_agg(jsonb_build_object(
          'question_id', ans.question_id,
          'question_text', q.question_text,
          'is_correct', ans.is_correct,
          'points_awarded', ans.points_awarded,
          'explanation', q.explanation,
          'selected_text', coalesce(
            (select o.option_text from public.question_options o where o.id = ans.selected_option_id),
            ans.answer_text
          ),
          'correct_text', (
            select o.option_text
            from public.question_options o
            where o.question_id = ans.question_id and o.is_correct
            limit 1
          )
        ))
        from public.assignment_answers ans
        join public.questions q on q.id = ans.question_id
        where ans.attempt_id = a.id
      ), '[]'::jsonb)
    )
    from public.assignment_attempts a
    where a.id = attempt_id
  );
end;
$$;
