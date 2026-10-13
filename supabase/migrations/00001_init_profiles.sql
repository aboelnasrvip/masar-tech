create or replace function public.normalize_eg_phone(input text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  digits := regexp_replace(coalesce(input, ''), '\D', '', 'g');

  if digits like '20%' and length(digits) >= 12 then
    return left(digits, 12);
  end if;

  if digits like '0%' and length(digits) = 11 then
    return '20' || substr(digits, 2);
  end if;

  if length(digits) = 10 and digits like '1%' then
    return '20' || digits;
  end if;

  return digits;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null unique,
  parent_phone text,
  city text,
  governorate text,
  school text,
  educational_stage text,
  grade text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_phone_idx on public.profiles (phone);
create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'teacher')
  );
$$;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  using (auth.uid() = id or public.is_staff());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_staff_update on public.profiles;
create policy profiles_staff_update
  on public.profiles
  for update
  using (public.is_staff());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    parent_phone,
    city,
    governorate,
    school,
    educational_stage,
    grade,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'طالب'),
    public.normalize_eg_phone(coalesce(new.raw_user_meta_data->>'phone', new.id::text)),
    public.normalize_eg_phone(new.raw_user_meta_data->>'parent_phone'),
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'governorate',
    new.raw_user_meta_data->>'school',
    new.raw_user_meta_data->>'educational_stage',
    new.raw_user_meta_data->>'grade',
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
