create or replace function public.is_phone_registered(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where phone = public.normalize_eg_phone(p_phone)
  );
$$;

grant execute on function public.is_phone_registered(text) to anon, authenticated;

create or replace function public.is_email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$;

grant execute on function public.is_email_registered(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text;
begin
  normalized_phone := public.normalize_eg_phone(
    coalesce(new.raw_user_meta_data->>'phone', new.id::text)
  );

  if exists (select 1 from public.profiles where phone = normalized_phone) then
    raise exception 'PHONE_ALREADY_REGISTERED';
  end if;

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
    normalized_phone,
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
