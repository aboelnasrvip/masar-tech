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
