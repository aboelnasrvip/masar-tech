do $$
declare
  current jsonb;
  defaults jsonb := '[
    {"id":"vodafone_cash","name":"فودافون كاش","account":"","enabled":true},
    {"id":"orange_cash","name":"أورانج كاش","account":"","enabled":true},
    {"id":"we_cash","name":"وي كاش","account":"","enabled":true},
    {"id":"etisalat_cash","name":"اتصالات كاش","account":"","enabled":true},
    {"id":"instapay","name":"إنستاباي","account":"","enabled":true}
  ]'::jsonb;
  item jsonb;
  existing jsonb;
  merged jsonb := '[]'::jsonb;
begin
  select value into current from public.platform_settings where key = 'payment_methods';
  current := coalesce(current, '[]'::jsonb);

  for item in select * from jsonb_array_elements(defaults)
  loop
    existing := null;
    select e
    into existing
    from jsonb_array_elements(current) e
    where e->>'id' = item->>'id'
    limit 1;

    if existing is not null then
      merged := merged || jsonb_build_array(
        item || jsonb_build_object(
          'account', coalesce(existing->>'account', ''),
          'enabled', coalesce((existing->>'enabled')::boolean, true)
        )
      );
    else
      merged := merged || jsonb_build_array(item);
    end if;
  end loop;

  for existing in select * from jsonb_array_elements(current)
  loop
    if not exists (
      select 1 from jsonb_array_elements(defaults) d where d->>'id' = existing->>'id'
    ) then
      merged := merged || jsonb_build_array(existing);
    end if;
  end loop;

  insert into public.platform_settings (key, value)
  values ('payment_methods', merged)
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();
end $$;
