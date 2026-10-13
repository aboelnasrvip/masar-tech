insert into public.platform_settings (key, value)
values (
  'video_watermark',
  '{"enabled":true,"position":"bottom-right"}'::jsonb
)
on conflict (key) do nothing;

create table if not exists public.lesson_security_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  event_type text not null,
  detail text,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists lesson_security_events_created_idx
  on public.lesson_security_events (created_at desc);

create index if not exists lesson_security_events_student_idx
  on public.lesson_security_events (student_id, created_at desc);

alter table public.lesson_security_events enable row level security;

drop policy if exists security_events_student_insert on public.lesson_security_events;
create policy security_events_student_insert
  on public.lesson_security_events for insert
  with check (auth.uid() = student_id);

drop policy if exists security_events_staff_read on public.lesson_security_events;
create policy security_events_staff_read
  on public.lesson_security_events for select
  using (public.is_staff());

drop policy if exists staff_all_lesson_security_events on public.lesson_security_events;
create policy staff_all_lesson_security_events
  on public.lesson_security_events for all
  using (public.is_staff())
  with check (public.is_staff());
