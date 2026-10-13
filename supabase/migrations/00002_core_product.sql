create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  image_url text,
  subject text,
  educational_stage text,
  grade text,
  academic_year text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  is_published boolean not null default false,
  release_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  order_index int not null default 0,
  is_published boolean not null default false,
  video_provider text default 'youtube',
  video_id text,
  video_title text,
  video_thumbnail text,
  upload_method text check (upload_method in ('api', 'manual')),
  video_visible boolean not null default true,
  pdf_visible boolean not null default true,
  editor_visible boolean not null default false,
  assignment_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug)
);

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  file_path text not null,
  file_type text not null default 'pdf',
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_editor_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  html text not null default '',
  css text not null default '',
  js text not null default ''
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  title text not null,
  description text,
  passing_score int,
  max_attempts int,
  is_required boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'code_output')),
  points int not null default 1,
  order_index int not null default 0,
  explanation text
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  order_index int not null default 0
);

create table if not exists public.assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  attempt_number int not null,
  score numeric not null default 0,
  total_points numeric not null default 0,
  percentage numeric not null default 0,
  passed boolean not null default false,
  submitted_at timestamptz not null default now()
);

create table if not exists public.assignment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assignment_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_option_id uuid references public.question_options (id),
  answer_text text,
  is_correct boolean not null default false,
  points_awarded numeric not null default 0
);

create table if not exists public.lesson_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  video_progress numeric not null default 0,
  last_position numeric not null default 0,
  video_completed boolean not null default false,
  assignment_completed boolean not null default false,
  lesson_completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table if not exists public.student_lesson_code (
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  html text not null default '',
  css text not null default '',
  js text not null default '',
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  type text not null check (type in ('monthly', 'full_term')),
  price numeric not null default 0,
  duration_days int,
  module_id uuid references public.course_modules (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  module_id uuid references public.course_modules (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  plan_id uuid references public.subscription_plans (id) on delete set null,
  method text not null,
  amount numeric not null,
  reference text,
  screenshot_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  kind text not null default 'course_purchase' check (kind in ('course_purchase', 'wallet_deposit')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete set null,
  type text not null check (type in ('deposit', 'course_purchase', 'refund', 'adjustment')),
  amount numeric not null,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'reversed')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.community_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  is_teacher_answer boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_discussions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.youtube_connections (
  id uuid primary key default gen_random_uuid(),
  connected_by uuid references public.profiles (id),
  channel_id text,
  channel_title text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete set null,
  youtube_video_id text not null,
  youtube_channel_id text,
  title text,
  description text,
  thumbnail_url text,
  duration text,
  upload_method text not null default 'manual' check (upload_method in ('api', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  join_url text,
  recording_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value)
values (
  'payment_methods',
  '[
    {"id":"vodafone_cash","name":"فودافون كاش","account":"","enabled":true},
    {"id":"orange_cash","name":"أورانج كاش","account":"","enabled":true},
    {"id":"instapay","name":"InstaPay","account":"","enabled":true},
    {"id":"etisalat_cash","name":"e& money","account":"","enabled":true}
  ]'::jsonb
)
on conflict (key) do nothing;

create index if not exists course_modules_course_idx on public.course_modules (course_id, order_index);
create index if not exists lessons_module_idx on public.lessons (module_id, order_index);
create index if not exists subscriptions_student_idx on public.subscriptions (student_id, course_id, status);
create index if not exists payments_status_idx on public.payments (status, created_at desc);
create index if not exists wallet_student_idx on public.wallet_transactions (student_id, created_at desc);

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
drop trigger if exists modules_updated_at on public.course_modules;
create trigger modules_updated_at before update on public.course_modules for each row execute function public.set_updated_at();
drop trigger if exists lessons_updated_at on public.lessons;
create trigger lessons_updated_at before update on public.lessons for each row execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.lesson_editor_blocks enable row level security;
alter table public.assignments enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.assignment_attempts enable row level security;
alter table public.assignment_answers enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.student_lesson_code enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;
alter table public.lesson_discussions enable row level security;
alter table public.youtube_connections enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.notifications enable row level security;
alter table public.live_sessions enable row level security;
alter table public.platform_settings enable row level security;

create or replace function public.wallet_balance(p_student uuid default auth.uid())
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.wallet_transactions
  where student_id = p_student
    and status = 'completed';
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
    where s.student_id = p_student
      and s.course_id = p_course
      and s.status = 'active'
      and (
        s.module_id is null
        or s.module_id = p_module
      )
  );
$$;

create or replace function public.previous_lesson_id(p_lesson uuid)
returns uuid
language sql
stable
as $$
  with current_lesson as (
    select l.id, l.module_id, l.order_index, m.course_id, m.order_index as module_order
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    where l.id = p_lesson
  )
  select prev.id
  from current_lesson c
  join public.course_modules m on m.course_id = c.course_id
  join public.lessons prev on prev.module_id = m.id
  where (
    (m.order_index = c.module_order and prev.order_index < c.order_index)
    or m.order_index < c.module_order
  )
  order by m.order_index desc, prev.order_index desc
  limit 1;
$$;

create or replace function public.lesson_unlocked(p_student uuid, p_lesson uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  prev uuid;
  prev_assignment public.assignments%rowtype;
  prev_progress public.lesson_progress%rowtype;
begin
  prev := public.previous_lesson_id(p_lesson);
  if prev is null then
    return true;
  end if;

  select * into prev_assignment from public.assignments where lesson_id = prev and is_published = true;
  select * into prev_progress from public.lesson_progress where student_id = p_student and lesson_id = prev;

  if prev_assignment.id is not null and prev_assignment.is_required then
    return coalesce(prev_progress.assignment_completed, false);
  end if;

  return coalesce(prev_progress.lesson_completed, false);
end;
$$;

create or replace function public.notify_user(p_user uuid, p_title text, p_body text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, title, body)
  values (p_user, p_title, p_body);
$$;

create or replace function public.approve_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
  plan public.subscription_plans%rowtype;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;

  select * into pay from public.payments where id = p_payment_id for update;
  if not found or pay.status <> 'pending' then
    raise exception 'payment not pending';
  end if;

  update public.payments
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;

  insert into public.wallet_transactions (student_id, payment_id, type, amount, status, description)
  values (pay.student_id, pay.id, 'deposit', pay.amount, 'completed', 'شحن بعد اعتماد التحويل');

  if pay.kind = 'course_purchase' and pay.plan_id is not null then
    select * into plan from public.subscription_plans where id = pay.plan_id;
    insert into public.wallet_transactions (student_id, payment_id, type, amount, status, description)
    values (pay.student_id, pay.id, 'course_purchase', -plan.price, 'completed', 'شراء خطة كورس');

    insert into public.subscriptions (student_id, course_id, plan_id, module_id, status)
    values (pay.student_id, plan.course_id, plan.id, plan.module_id, 'active');

    perform public.notify_user(pay.student_id, 'تم تفعيل الاشتراك', 'اشتراكك اتفعّل. تقدر تدخل الكورس دلوقتي.');
  else
    perform public.notify_user(pay.student_id, 'تم اعتماد الدفع', 'الرصيد اتضاف لمحفظتك.');
  end if;
end;
$$;

create or replace function public.reject_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;

  select * into pay from public.payments where id = p_payment_id for update;
  if not found or pay.status <> 'pending' then
    raise exception 'payment not pending';
  end if;

  update public.payments
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;

  perform public.notify_user(pay.student_id, 'تم رفض التحويل', 'راجع البيانات أو ابعت تحويل جديد.');
end;
$$;

create or replace function public.purchase_with_wallet(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plan public.subscription_plans%rowtype;
  bal numeric;
begin
  select * into plan from public.subscription_plans where id = p_plan_id and is_active = true;
  if not found then
    raise exception 'plan not found';
  end if;

  bal := public.wallet_balance(auth.uid());
  if bal < plan.price then
    raise exception 'insufficient balance';
  end if;

  insert into public.wallet_transactions (student_id, type, amount, status, description)
  values (auth.uid(), 'course_purchase', -plan.price, 'completed', 'شراء من المحفظة');

  insert into public.subscriptions (student_id, course_id, plan_id, module_id, status)
  values (auth.uid(), plan.course_id, plan.id, plan.module_id, 'active');
end;
$$;

create or replace function public.get_assignment_for_student(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'assignment', (
      select to_jsonb(a) - 'created_at'
      from public.assignments a
      where a.id = p_assignment_id
    ),
    'questions', (
      select coalesce(jsonb_agg(q order by q.order_index), '[]'::jsonb)
      from (
        select
          qs.id,
          qs.question_text,
          qs.question_type,
          qs.points,
          qs.order_index,
          (
            select coalesce(jsonb_agg(jsonb_build_object(
              'id', o.id,
              'option_text', o.option_text,
              'order_index', o.order_index
            ) order by o.order_index), '[]'::jsonb)
            from public.question_options o
            where o.question_id = qs.id
          ) as options
        from public.questions qs
        where qs.assignment_id = p_assignment_id
      ) q
    )
  );
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

  if assignment.is_required then
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
          'is_correct', ans.is_correct,
          'points_awarded', ans.points_awarded,
          'explanation', q.explanation
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

create or replace function public.complete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lesson_progress (student_id, lesson_id, lesson_completed, completed_at)
  values (auth.uid(), p_lesson_id, true, now())
  on conflict (student_id, lesson_id) do update
    set lesson_completed = true,
        completed_at = coalesce(public.lesson_progress.completed_at, now()),
        updated_at = now();
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'courses', 'course_modules', 'lessons', 'lesson_resources', 'lesson_editor_blocks',
    'assignments', 'questions', 'question_options', 'assignment_attempts', 'assignment_answers',
    'lesson_progress', 'student_lesson_code', 'subscription_plans', 'subscriptions',
    'payments', 'wallet_transactions', 'community_posts', 'community_replies',
    'lesson_discussions', 'youtube_videos', 'notifications', 'live_sessions', 'platform_settings'
  ]
  loop
    execute format('drop policy if exists staff_all_%s on public.%I', tbl, tbl);
    execute format(
      'create policy staff_all_%s on public.%I for all using (public.is_staff()) with check (public.is_staff())',
      tbl, tbl
    );
  end loop;
end $$;

drop policy if exists staff_all_youtube_connections on public.youtube_connections;
create policy staff_all_youtube_connections
  on public.youtube_connections for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists courses_public_read on public.courses;
create policy courses_public_read on public.courses
  for select using (status = 'published' or public.is_staff());

drop policy if exists modules_public_read on public.course_modules;
create policy modules_public_read on public.course_modules
  for select using (is_published = true or public.is_staff());

drop policy if exists lessons_public_read on public.lessons;
create policy lessons_public_read on public.lessons
  for select using (is_published = true or public.is_staff());

drop policy if exists plans_public_read on public.subscription_plans;
create policy plans_public_read on public.subscription_plans
  for select using (is_active = true or public.is_staff());

drop policy if exists settings_public_read on public.platform_settings;
create policy settings_public_read on public.platform_settings
  for select using (true);

drop policy if exists resources_enrolled_read on public.lesson_resources;
create policy resources_enrolled_read on public.lesson_resources
  for select using (
    public.is_staff()
    or exists (
      select 1
      from public.lessons l
      join public.course_modules m on m.id = l.module_id
      where l.id = lesson_resources.lesson_id
        and l.is_published
        and public.has_course_entitlement(auth.uid(), m.course_id, m.id)
    )
  );

drop policy if exists editor_enrolled_read on public.lesson_editor_blocks;
create policy editor_enrolled_read on public.lesson_editor_blocks
  for select using (
    public.is_staff()
    or exists (
      select 1
      from public.lessons l
      join public.course_modules m on m.id = l.module_id
      where l.id = lesson_editor_blocks.lesson_id
        and public.has_course_entitlement(auth.uid(), m.course_id, m.id)
    )
  );

drop policy if exists assignments_enrolled_read on public.assignments;
create policy assignments_enrolled_read on public.assignments
  for select using (
    public.is_staff()
    or (is_published = true and exists (
      select 1 from public.lessons l
      join public.course_modules m on m.id = l.module_id
      where l.id = assignments.lesson_id
        and public.has_course_entitlement(auth.uid(), m.course_id, m.id)
    ))
  );

drop policy if exists questions_staff_only on public.questions;
create policy questions_staff_only on public.questions
  for select using (public.is_staff());

drop policy if exists options_staff_only on public.question_options;
create policy options_staff_only on public.question_options
  for select using (public.is_staff());

drop policy if exists attempts_own on public.assignment_attempts;
create policy attempts_own on public.assignment_attempts
  for select using (student_id = auth.uid() or public.is_staff());

drop policy if exists answers_own on public.assignment_answers;
create policy answers_own on public.assignment_answers
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.assignment_attempts a
      where a.id = assignment_answers.attempt_id and a.student_id = auth.uid()
    )
  );

drop policy if exists progress_own on public.lesson_progress;
create policy progress_own on public.lesson_progress
  for all using (student_id = auth.uid() or public.is_staff())
  with check (student_id = auth.uid() or public.is_staff());

drop policy if exists code_own on public.student_lesson_code;
create policy code_own on public.student_lesson_code
  for all using (student_id = auth.uid() or public.is_staff())
  with check (student_id = auth.uid() or public.is_staff());

drop policy if exists subscriptions_own on public.subscriptions;
create policy subscriptions_own on public.subscriptions
  for select using (student_id = auth.uid() or public.is_staff());

drop policy if exists payments_own on public.payments;
create policy payments_own on public.payments
  for select using (student_id = auth.uid() or public.is_staff());

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert with check (student_id = auth.uid());

drop policy if exists wallet_own on public.wallet_transactions;
create policy wallet_own on public.wallet_transactions
  for select using (student_id = auth.uid() or public.is_staff());

drop policy if exists posts_read on public.community_posts;
create policy posts_read on public.community_posts
  for select using (is_hidden = false or public.is_staff() or author_id = auth.uid());

drop policy if exists posts_insert on public.community_posts;
create policy posts_insert on public.community_posts
  for insert with check (author_id = auth.uid());

drop policy if exists replies_read on public.community_replies;
create policy replies_read on public.community_replies
  for select using (is_hidden = false or public.is_staff() or author_id = auth.uid());

drop policy if exists replies_insert on public.community_replies;
create policy replies_insert on public.community_replies
  for insert with check (author_id = auth.uid());

drop policy if exists discussions_read on public.lesson_discussions;
create policy discussions_read on public.lesson_discussions
  for select using (true);

drop policy if exists discussions_insert on public.lesson_discussions;
create policy discussions_insert on public.lesson_discussions
  for insert with check (author_id = auth.uid());

drop policy if exists youtube_videos_read on public.youtube_videos;
create policy youtube_videos_read on public.youtube_videos
  for select using (true);

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists live_read on public.live_sessions;
create policy live_read on public.live_sessions
  for select using (is_published = true or public.is_staff());

insert into storage.buckets (id, name, public)
values
  ('course-resources', 'course-resources', false),
  ('payment-proofs', 'payment-proofs', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists staff_course_resources on storage.objects;
create policy staff_course_resources on storage.objects
  for all using (bucket_id = 'course-resources' and public.is_staff())
  with check (bucket_id = 'course-resources' and public.is_staff());

drop policy if exists read_course_resources on storage.objects;
create policy read_course_resources on storage.objects
  for select using (bucket_id = 'course-resources' and auth.role() = 'authenticated');

drop policy if exists student_payment_proofs on storage.objects;
create policy student_payment_proofs on storage.objects
  for insert with check (
    bucket_id = 'payment-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists read_payment_proofs on storage.objects;
create policy read_payment_proofs on storage.objects
  for select using (
    bucket_id = 'payment-proofs'
    and (public.is_staff() or auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists avatar_write on storage.objects;
create policy avatar_write on storage.objects
  for all using (bucket_id = 'avatars' and auth.role() = 'authenticated')
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
