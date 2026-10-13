alter table public.lesson_discussions
  add column if not exists updated_at timestamptz;

drop policy if exists discussions_update on public.lesson_discussions;
create policy discussions_update on public.lesson_discussions
  for update
  using (author_id = auth.uid() or public.is_staff())
  with check (author_id = auth.uid() or public.is_staff());

drop policy if exists discussions_delete on public.lesson_discussions;
create policy discussions_delete on public.lesson_discussions
  for delete
  using (author_id = auth.uid() or public.is_staff());

create or replace function public.get_assignment_for_student(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
  last_attempt jsonb;
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
      where ans.attempt_id = att.id
    ), '[]'::jsonb)
  )
  into last_attempt
  from public.assignment_attempts att
  where att.assignment_id = p_assignment_id
    and att.student_id = auth.uid()
  order by att.attempt_number desc
  limit 1;

  return coalesce(result, jsonb_build_object('assignment', null, 'questions', '[]'::jsonb))
    || jsonb_build_object('last_attempt', last_attempt);
end;
$$;

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

  insert into public.lesson_progress (student_id, lesson_id, assignment_completed, lesson_completed, completed_at)
  values (auth.uid(), assignment.lesson_id, true, true, now())
  on conflict (student_id, lesson_id) do update
    set assignment_completed = true,
        lesson_completed = true,
        completed_at = coalesce(public.lesson_progress.completed_at, now()),
        updated_at = now();

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

create or replace function public.notify_lesson_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lesson_title text;
  author_role text;
  author_name text;
begin
  select title into lesson_title from public.lessons where id = new.lesson_id;
  select role, full_name into author_role, author_name from public.profiles where id = new.author_id;

  if author_role in ('admin', 'teacher') then
    insert into public.notifications (user_id, title, body)
    select distinct d.author_id,
      'رد ' || coalesce(author_name, 'المدرس') || ' على الدرس',
      coalesce(author_name, 'المدرس') || ' — ' || coalesce(lesson_title, 'درس') || ': ' || left(new.body, 140)
    from public.lesson_discussions d
    join public.profiles p on p.id = d.author_id
    where d.lesson_id = new.lesson_id
      and d.author_id <> new.author_id
      and p.role = 'student';
  else
    insert into public.notifications (user_id, title, body)
    select p.id,
      'سؤال طالب على درس',
      coalesce(author_name, 'طالب')
        || ' — ' || coalesce(lesson_title, 'درس') || ': ' || left(new.body, 120)
    from public.profiles p
    where p.role in ('admin', 'teacher');
  end if;

  return new;
end;
$$;

grant execute on function public.get_assignment_for_student(uuid) to authenticated;
grant execute on function public.submit_assignment(uuid, jsonb) to authenticated;
