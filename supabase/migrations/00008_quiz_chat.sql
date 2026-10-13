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

  select * into prev_assignment from public.assignments where lesson_id = prev and is_published = true;
  select * into prev_progress from public.lesson_progress where student_id = p_student and lesson_id = prev;

  if prev_assignment.id is not null then
    return coalesce(prev_progress.assignment_completed, false);
  end if;

  return coalesce(prev_progress.lesson_completed, false);
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
  unanswered int := 0;
begin
  select * into assignment from public.assignments where id = p_assignment_id and is_published = true;
  if not found then
    raise exception 'assignment not found';
  end if;

  for question in
    select * from public.questions where assignment_id = p_assignment_id order by order_index
  loop
    selected := nullif(p_answers -> question.id::text ->> 'option_id', '')::uuid;
    typed := trim(coalesce(p_answers -> question.id::text ->> 'text', ''));
    if question.question_type in ('multiple_choice', 'true_false') then
      if selected is null then
        unanswered := unanswered + 1;
      end if;
    else
      if typed = '' then
        unanswered := unanswered + 1;
      end if;
    end if;
  end loop;

  if unanswered > 0 then
    raise exception 'incomplete answers';
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
begin
  select title into lesson_title from public.lessons where id = new.lesson_id;
  select role into author_role from public.profiles where id = new.author_id;

  if author_role in ('admin', 'teacher') then
    insert into public.notifications (user_id, title, body)
    select distinct d.author_id,
      'رد المدرس على الدرس',
      coalesce(lesson_title, 'درس') || ': ' || left(new.body, 140)
    from public.lesson_discussions d
    join public.profiles p on p.id = d.author_id
    where d.lesson_id = new.lesson_id
      and d.author_id <> new.author_id
      and p.role = 'student';
  else
    insert into public.notifications (user_id, title, body)
    select p.id,
      'سؤال طالب على درس',
      coalesce((select full_name from public.profiles where id = new.author_id), 'طالب')
        || ' — ' || coalesce(lesson_title, 'درس') || ': ' || left(new.body, 120)
    from public.profiles p
    where p.role in ('admin', 'teacher');
  end if;

  return new;
end;
$$;

drop trigger if exists lesson_chat_notify on public.lesson_discussions;
create trigger lesson_chat_notify
after insert on public.lesson_discussions
for each row execute function public.notify_lesson_chat();

grant execute on function public.submit_assignment(uuid, jsonb) to authenticated;
grant execute on function public.lesson_unlocked(uuid, uuid) to authenticated;
