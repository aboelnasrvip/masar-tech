create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade text,
  starts_at timestamptz not null,
  duration_minutes int not null default 10 check (duration_minutes > 0),
  passing_score int,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'code_output')),
  points int not null default 1,
  order_index int not null default 0,
  explanation text
);

create table if not exists public.exam_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exam_questions (id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  order_index int not null default 0
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  attempt_number int not null default 1,
  score numeric not null default 0,
  total_points numeric not null default 0,
  percentage numeric not null default 0,
  passed boolean not null default false,
  auto_submitted boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

create table if not exists public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  question_id uuid not null references public.exam_questions (id) on delete cascade,
  selected_option_id uuid references public.exam_question_options (id),
  answer_text text,
  is_correct boolean not null default false,
  points_awarded numeric not null default 0
);

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_question_options enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_answers enable row level security;

drop policy if exists staff_all_exams on public.exams;
create policy staff_all_exams on public.exams
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists exams_published_read on public.exams;
create policy exams_published_read on public.exams
  for select using (is_published = true or public.is_staff());

drop policy if exists staff_all_exam_questions on public.exam_questions;
create policy staff_all_exam_questions on public.exam_questions
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_all_exam_question_options on public.exam_question_options;
create policy staff_all_exam_question_options on public.exam_question_options
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_all_exam_attempts on public.exam_attempts;
create policy staff_all_exam_attempts on public.exam_attempts
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists exam_attempts_own on public.exam_attempts;
create policy exam_attempts_own on public.exam_attempts
  for select using (student_id = auth.uid() or public.is_staff());

drop policy if exists staff_all_exam_answers on public.exam_answers;
create policy staff_all_exam_answers on public.exam_answers
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists exam_answers_own on public.exam_answers;
create policy exam_answers_own on public.exam_answers
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.exam_attempts a
      where a.id = exam_answers.attempt_id and a.student_id = auth.uid()
    )
  );

create or replace function public.get_exam_for_student(p_exam_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  exam public.exams%rowtype;
  result jsonb;
  last_attempt jsonb;
  remaining int;
  started boolean;
begin
  select * into exam from public.exams where id = p_exam_id and is_published = true;
  if not found then
    return jsonb_build_object('exam', null, 'questions', '[]'::jsonb, 'last_attempt', null, 'remaining_seconds', 0);
  end if;

  remaining := greatest(0, floor(extract(epoch from (exam.starts_at + (exam.duration_minutes * interval '1 minute') - now())))::int);
  started := now() >= exam.starts_at;

  select jsonb_build_object(
    'attempt', to_jsonb(att),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'question_id', ans.question_id,
        'question_text', q.question_text,
        'is_correct', ans.is_correct,
        'points_awarded', ans.points_awarded,
        'explanation', q.explanation,
        'selected_option_id', ans.selected_option_id,
        'answer_text', ans.answer_text,
        'selected_text', coalesce(
          (select o.option_text from public.exam_question_options o where o.id = ans.selected_option_id),
          ans.answer_text
        ),
        'correct_text', (
          select o.option_text
          from public.exam_question_options o
          where o.question_id = ans.question_id and o.is_correct
          limit 1
        )
      ))
      from public.exam_answers ans
      join public.exam_questions q on q.id = ans.question_id
      where ans.attempt_id = att.id
    ), '[]'::jsonb)
  )
  into last_attempt
  from public.exam_attempts att
  where att.exam_id = p_exam_id
    and att.student_id = auth.uid()
  order by att.submitted_at desc
  limit 1;

  select jsonb_build_object(
    'id', exam.id,
    'title', exam.title,
    'description', exam.description,
    'grade', exam.grade,
    'starts_at', exam.starts_at,
    'duration_minutes', exam.duration_minutes,
    'passing_score', exam.passing_score,
    'is_published', exam.is_published
  ) || jsonb_build_object(
    'questions', case
      when started then coalesce((
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
              from public.exam_question_options o
              where o.question_id = qs.id
            ), '[]'::jsonb)
          )
          order by qs.order_index
        )
        from public.exam_questions qs
        where qs.exam_id = exam.id
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'last_attempt', last_attempt,
    'remaining_seconds', remaining,
    'started', started
  )
  into result;

  return result;
end;
$$;

create or replace function public.submit_exam(p_exam_id uuid, p_answers jsonb, p_auto boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  exam public.exams%rowtype;
  existing uuid;
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
  select * into exam from public.exams where id = p_exam_id and is_published = true;
  if not found then
    raise exception 'exam not found';
  end if;

  if now() < exam.starts_at then
    raise exception 'exam not started';
  end if;

  select id into existing
  from public.exam_attempts
  where exam_id = p_exam_id and student_id = auth.uid();

  if existing is not null then
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
            'selected_option_id', ans.selected_option_id,
            'answer_text', ans.answer_text,
            'selected_text', coalesce(
              (select o.option_text from public.exam_question_options o where o.id = ans.selected_option_id),
              ans.answer_text
            ),
            'correct_text', (
              select o.option_text
              from public.exam_question_options o
              where o.question_id = ans.question_id and o.is_correct
              limit 1
            )
          ))
          from public.exam_answers ans
          join public.exam_questions q on q.id = ans.question_id
          where ans.attempt_id = a.id
        ), '[]'::jsonb)
      )
      from public.exam_attempts a
      where a.id = existing
    );
  end if;

  insert into public.exam_attempts (exam_id, student_id, attempt_number, auto_submitted)
  values (p_exam_id, auth.uid(), 1, coalesce(p_auto, false))
  returning id into attempt_id;

  for question in
    select * from public.exam_questions where exam_id = p_exam_id order by order_index
  loop
    total := total + question.points;
    selected := nullif(p_answers -> question.id::text ->> 'option_id', '')::uuid;
    typed := p_answers -> question.id::text ->> 'text';
    correct := false;
    awarded := 0;

    if question.question_type in ('multiple_choice', 'true_false') then
      select o.is_correct into option_ok from public.exam_question_options o where o.id = selected;
      correct := coalesce(option_ok, false);
    elsif question.question_type = 'code_output' then
      select o.is_correct into option_ok
      from public.exam_question_options o
      where o.question_id = question.id
        and lower(trim(o.option_text)) = lower(trim(coalesce(typed, '')))
      limit 1;
      correct := coalesce(option_ok, false);
    end if;

    if correct then
      awarded := question.points;
      earned := earned + awarded;
    end if;

    insert into public.exam_answers (
      attempt_id, question_id, selected_option_id, answer_text, is_correct, points_awarded
    ) values (
      attempt_id, question.id, selected, typed, correct, awarded
    );
  end loop;

  update public.exam_attempts
  set score = earned,
      total_points = total,
      percentage = case when total = 0 then 0 else round((earned / total) * 100, 2) end,
      passed = case
        when exam.passing_score is null then true
        else (case when total = 0 then 0 else (earned / total) * 100 end) >= exam.passing_score
      end
  where id = attempt_id;

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
          'selected_option_id', ans.selected_option_id,
          'answer_text', ans.answer_text,
          'selected_text', coalesce(
            (select o.option_text from public.exam_question_options o where o.id = ans.selected_option_id),
            ans.answer_text
          ),
          'correct_text', (
            select o.option_text
            from public.exam_question_options o
            where o.question_id = ans.question_id and o.is_correct
            limit 1
          )
        ))
        from public.exam_answers ans
        join public.exam_questions q on q.id = ans.question_id
        where ans.attempt_id = a.id
      ), '[]'::jsonb)
    )
    from public.exam_attempts a
    where a.id = attempt_id
  );
end;
$$;

create or replace function public.import_exam_questions(p_exam_id uuid, p_payload jsonb)
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

  if not exists (select 1 from public.exams where id = p_exam_id) then
    raise exception 'exam not found';
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

  delete from public.exam_questions where exam_id = p_exam_id;

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

    insert into public.exam_questions (exam_id, question_text, question_type, points, order_index, explanation)
    values (
      p_exam_id,
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
        insert into public.exam_question_options (question_id, option_text, is_correct, order_index)
        values (
          question_id,
          coalesce(option_item ->> 'option_text', option_item ->> 'text'),
          coalesce((option_item ->> 'is_correct')::boolean, false),
          coalesce((option_item ->> 'order_index')::int, 0)
        );
      end loop;
    elsif q_type = 'true_false' then
      insert into public.exam_question_options (question_id, option_text, is_correct, order_index)
      values
        (question_id, 'صح', true, 0),
        (question_id, 'غلط', false, 1);
    end if;
  end loop;

  return inserted;
end;
$$;

grant execute on function public.get_exam_for_student(uuid) to authenticated;
grant execute on function public.submit_exam(uuid, jsonb, boolean) to authenticated;
grant execute on function public.import_exam_questions(uuid, jsonb) to authenticated;
